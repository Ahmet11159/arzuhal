import 'server-only';
import { and, asc, eq, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm';
import {
  computeCharges,
  formatTRY,
  ISSUE_REPORT_WINDOW_HOURS,
  REFUND_MAX_ATTEMPTS,
  REFUND_REASON_LABEL,
  type ChargeBreakdown,
  type RefundReason,
} from '@havuz/core';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { marketplaceEnabled, PaymentProviderRejected, providerByName } from '../payments';
import { notify, notifyOperators } from '../notify';
import { audit, SYSTEM } from '../audit';

/**
 * Para akışının tek merkezi: sipariş değiştiğinde (iptal, dalga kademe farkı, mal kabul iadesi)
 *  - ödenmemiş siparişte borç yeniden hesaplanır,
 *  - ödenmiş siparişte fazla tahsil edilen tutar kalem bazında karta iade kuyruğuna yazılır.
 * İadeler önce veritabanına yazılır, sonra (transaction dışında) sağlayıcıya gönderilir; bu sayede
 * iade hiçbir zaman kaybolmaz ve iki kez yapılmaz.
 */

const UNPAID = ['unpaid', 'due', 'overdue'] as const;
/** Bekleyen / süren / tamamlanan / incelemedeki tüm iadeler üyeye borçlu olunan tutardır. */
const OWED_REFUND = ['pending', 'processing', 'succeeded', 'failed', 'needs_review'] as const;

export async function orderBreakdown(tx: Executor, orderId: string) {
  const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) throw new Error(`Sipariş bulunamadı: ${orderId}`);
  const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId)).orderBy(asc(s.orderItems.id));
  const issues = items.length
    ? await tx
        .select({ orderItemId: s.issues.orderItemId, creditAmount: s.issues.creditAmount })
        .from(s.issues)
        .where(and(inArray(s.issues.orderItemId, items.map((i) => i.id)), eq(s.issues.status, 'resolved')))
    : [];
  const credit = new Map(issues.map((i) => [i.orderItemId, i.creditAmount]));
  const breakdown = computeCharges(
    items.map((i) => ({
      id: i.id,
      qty: i.qty,
      finalUnitPrice: i.finalUnitPrice,
      vatRate: i.vatRate,
      commissionBps: i.commissionBps,
      cancelled: i.status === 'cancelled',
      issueCredit: credit.get(i.id) ?? 0,
    })),
    order.financingBps,
  );
  return { order, items, breakdown, line: (id: string) => breakdown.lines.find((l) => l.id === id)! };
}

/** Ödenmemiş siparişin borcunu kalemlerden yeniden hesaplar. Dönen değer: borçtaki azalma. */
export async function recomputeUnpaidOrder(tx: Executor, orderId: string): Promise<number> {
  const { order, breakdown } = await orderBreakdown(tx, orderId);
  if (!(UNPAID as readonly string[]).includes(order.paymentStatus)) return 0;
  const total = Math.max(0, breakdown.total - order.creditApplied);
  const settled = total === 0 && order.status !== 'cancelled';
  await tx
    .update(s.orders)
    .set({
      subtotal: breakdown.subtotal,
      vat: breakdown.vat,
      financingFee: breakdown.financingFee,
      total,
      paymentStatus: settled ? 'paid' : order.paymentStatus,
      paidAt: settled ? new Date() : order.paidAt,
    })
    .where(eq(s.orders.id, orderId));
  return Math.max(0, order.total - total);
}

/** Kalemlerin ödenmiş (iadeler düşülmüş) tutarları. */
async function paidByItem(tx: Executor, orderId: string) {
  const rows = await tx
    .select({ pi: s.paymentItems })
    .from(s.paymentItems)
    .innerJoin(s.payments, eq(s.payments.id, s.paymentItems.paymentId))
    .where(and(eq(s.payments.orderId, orderId), eq(s.payments.status, 'succeeded')))
    .orderBy(asc(s.payments.completedAt));
  const ids = rows.map((r) => r.pi.id);
  const refunded = ids.length
    ? await tx
        .select({ paymentItemId: s.refunds.paymentItemId, amount: s.refunds.amount })
        .from(s.refunds)
        .where(and(inArray(s.refunds.paymentItemId, ids), inArray(s.refunds.status, [...OWED_REFUND])))
    : [];
  const refundedBy = new Map<string, number>();
  for (const r of refunded) refundedBy.set(r.paymentItemId, (refundedBy.get(r.paymentItemId) ?? 0) + r.amount);
  return rows.map((r) => ({ ...r.pi, remaining: r.pi.price - (refundedBy.get(r.pi.id) ?? 0) }));
}

/**
 * Ödenmiş siparişte: kalem başına ödenen > olması gereken ise farkı karta iade kuyruğuna yazar.
 * Dönen değer: kuyruğa yazılan toplam iade.
 */
export async function reconcilePaidOrder(tx: Executor, orderId: string, reason: RefundReason, label: string): Promise<number> {
  const { order, breakdown } = await orderBreakdown(tx, orderId);
  if (order.paymentStatus !== 'paid') return 0;
  const paid = await paidByItem(tx, orderId);
  if (paid.length === 0) {
    // Kalem kaydı olmayan (eski/elle işlenmiş) ödeme: otomatik iade yapılamaz, yönetime bildirilir.
    return 0;
  }
  let total = 0;
  for (const line of breakdown.lines) {
    const rows = paid.filter((p) => p.orderItemId === line.id && p.remaining > 0);
    let excess = rows.reduce((a, r) => a + r.remaining, 0) - line.charge;
    for (const r of rows.reverse()) {
      if (excess <= 0) break;
      const amount = Math.min(excess, r.remaining);
      await tx.insert(s.refunds).values({
        paymentItemId: r.id,
        paymentId: r.paymentId,
        orgId: order.memberId,
        orderId,
        orderItemId: line.id,
        amount,
        reason,
        description: `${order.number} · ${label}`,
      });
      excess -= amount;
      total += amount;
    }
  }
  return total;
}

/**
 * Sipariş değişikliğini parasal olarak uygular ve üyeye hesap hareketi yazar.
 * mode: refund → karta iade kuyruğa alındı; reduced → vadeli/bekleyen borç düşürüldü.
 */
export async function applyOrderChange(
  tx: Executor,
  orderId: string,
  reason: RefundReason,
  label: string,
): Promise<{ mode: 'refund' | 'reduced' | 'none'; amount: number }> {
  const [o] = await tx.select({ paymentStatus: s.orders.paymentStatus, memberId: s.orders.memberId, number: s.orders.number }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return { mode: 'none', amount: 0 };
  const isPaid = o.paymentStatus === 'paid';
  const amount = isPaid ? await reconcilePaidOrder(tx, orderId, reason, label) : await recomputeUnpaidOrder(tx, orderId);
  if (amount <= 0) {
    if (isPaid && (await needsManualRefund(tx, orderId))) {
      await notifyOperators(tx, {
        type: 'refund.manual',
        title: `Elle iade gerekli: ${o.number}`,
        body: `${label}: bu ödemenin kalem kaydı yok, iade iyzico panelinden elle yapılmalı.`,
        link: '/yonetim/odemeler',
      });
    }
    return { mode: 'none', amount: 0 };
  }
  await tx.insert(s.ledgerEntries).values({
    orgId: o.memberId,
    type: reason === 'wave_rebate' ? 'wave_rebate' : reason === 'issue' ? 'issue_credit' : 'adjustment',
    amount,
    description: `${o.number} · ${label} — ${isPaid ? 'kartınıza iade' : 'borcunuzdan düşüldü'}`,
    refId: orderId,
  });
  return { mode: isPaid ? 'refund' : 'reduced', amount };
}

async function needsManualRefund(tx: Executor, orderId: string) {
  const paid = await paidByItem(tx, orderId);
  if (paid.length > 0) return false;
  const [p] = await tx.select({ id: s.payments.id }).from(s.payments).where(and(eq(s.payments.orderId, orderId), eq(s.payments.status, 'succeeded'))).limit(1);
  return !!p;
}

/** Ödemenin tamamını karta iade kuyruğuna yazar (mükerrer ödeme, iptal edilmiş siparişe ödeme…). */
export async function enqueueFullRefund(tx: Executor, paymentId: string, reason: RefundReason, description: string): Promise<number> {
  const [p] = await tx.select().from(s.payments).where(eq(s.payments.id, paymentId));
  if (!p) return 0;
  const items = await tx.select().from(s.paymentItems).where(eq(s.paymentItems.paymentId, paymentId));
  let total = 0;
  for (const it of items) {
    const prior = await tx
      .select({ amount: s.refunds.amount })
      .from(s.refunds)
      .where(and(eq(s.refunds.paymentItemId, it.id), inArray(s.refunds.status, [...OWED_REFUND])));
    const already = prior.reduce((a, x) => a + x.amount, 0);
    const amount = it.price - already;
    if (amount <= 0) continue;
    await tx.insert(s.refunds).values({ paymentItemId: it.id, paymentId, orgId: p.orgId, orderId: p.orderId, orderItemId: it.orderItemId, amount, reason, description });
    total += amount;
  }
  if (total > 0) {
    await tx.insert(s.ledgerEntries).values({ orgId: p.orgId, type: 'adjustment', amount: total, description: `${description} — kartınıza iade`, refId: p.orderId ?? p.id });
  } else if (items.length === 0) {
    await notifyOperators(tx, { type: 'refund.manual', title: 'Elle iade gerekli', body: `${description}: ${formatTRY(p.amount)} (ödeme kalem kaydı yok).`, link: '/yonetim/odemeler' });
  }
  return total;
}

// --- İadeleri sağlayıcıya gönderme -------------------------------------------------------------

const backoffMs = (attempt: number) => Math.min(6 * 3600_000, 60_000 * 2 ** attempt);

/**
 * Bekleyen iadeleri sağlayıcıya gönderir. Her iade önce atomik olarak "işleniyor" durumuna alınır
 * (iki süreç aynı iadeyi gönderemez). Sonucu belirsiz kalan iade (ör. sunucu yanıt beklerken
 * kapandı) otomatik yeniden denenmez; yönetimin kontrolüne düşer (çift iade riski yok).
 */
export async function processRefunds(db: DB, now: Date = new Date()) {
  // 10 dakikadan uzun "işleniyor" kalan iadeler: sonuç belirsiz → elle kontrol
  const stuck = await db
    .update(s.refunds)
    .set({ status: 'needs_review', error: 'Sonuç belirsiz: iyzico panelinden kontrol edin' })
    .where(and(eq(s.refunds.status, 'processing'), lte(s.refunds.processedAt, new Date(now.getTime() - 10 * 60_000))))
    .returning({ id: s.refunds.id });
  if (stuck.length) {
    await db.transaction((tx) =>
      notifyOperators(tx, { type: 'refund.review', title: `${stuck.length} iade kontrol bekliyor`, body: 'Sonucu belirsiz iadeler var; iyzico panelinden kontrol edip işaretleyin.', link: '/yonetim/odemeler' }),
    );
  }

  const due = await db
    .select({ id: s.refunds.id })
    .from(s.refunds)
    .where(and(inArray(s.refunds.status, ['pending', 'failed']), lte(s.refunds.nextAttemptAt, now)))
    .orderBy(asc(s.refunds.createdAt))
    .limit(50);
  let succeeded = 0;
  let failed = 0;
  for (const { id } of due) {
    const [r] = await db
      .update(s.refunds)
      .set({ status: 'processing', attempts: sql`${s.refunds.attempts} + 1`, processedAt: new Date() })
      .where(and(eq(s.refunds.id, id), inArray(s.refunds.status, ['pending', 'failed'])))
      .returning();
    if (!r) continue;
    const [pi] = await db.select().from(s.paymentItems).where(eq(s.paymentItems.id, r.paymentItemId));
    const [pay] = await db.select().from(s.payments).where(eq(s.payments.id, r.paymentId));
    try {
      if (!pi?.providerTxnId || !pay) throw new PaymentProviderRejected('Ödeme kaleminin işlem numarası yok');
      const res = await providerByName(pay.provider).refund({ refundId: r.id, transactionId: pi.providerTxnId, amount: r.amount, ip: process.env.SERVER_PUBLIC_IP ?? '127.0.0.1' });
      await db.transaction(async (tx) => {
        await tx.update(s.refunds).set({ status: 'succeeded', providerRefundId: res.providerRefundId ?? null, error: null, completedAt: new Date() }).where(eq(s.refunds.id, r.id));
        await tx
          .update(s.paymentItems)
          .set({ refundedAmount: sql`${s.paymentItems.refundedAmount} + ${r.amount}` })
          .where(eq(s.paymentItems.id, pi.id));
        await notify(tx, {
          orgId: r.orgId,
          type: 'refund.succeeded',
          title: `${formatTRY(r.amount)} kartınıza iade edildi`,
          body: `${r.description}. Bankanıza bağlı olarak hesabınıza yansıması birkaç iş günü sürebilir.`,
          link: r.orderId ? `/uye/siparisler/${r.orderId}` : '/uye/hesap',
          dedupeKey: `refund.succeeded:${r.id}`,
        });
        await audit(tx, SYSTEM, 'refund.succeeded', 'refund', r.id, `${formatTRY(r.amount)} iade edildi (${REFUND_REASON_LABEL[r.reason]})`);
      });
      succeeded++;
    } catch (e) {
      failed++;
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      const final = e instanceof PaymentProviderRejected || r.attempts >= REFUND_MAX_ATTEMPTS;
      await db.transaction(async (tx) => {
        await tx
          .update(s.refunds)
          .set({ status: final ? 'needs_review' : 'failed', error: msg, nextAttemptAt: new Date(Date.now() + backoffMs(r.attempts)) })
          .where(eq(s.refunds.id, r.id));
        if (final) {
          await notifyOperators(tx, {
            type: 'refund.failed',
            title: `İade yapılamadı: ${formatTRY(r.amount)}`,
            body: `${r.description}. Sebep: ${msg}`,
            link: '/yonetim/odemeler',
          });
          await audit(tx, SYSTEM, 'refund.failed', 'refund', r.id, `İade başarısız: ${msg}`);
        }
      });
    }
  }
  return { succeeded, failed, needsReview: stuck.length };
}

/** İstek içinde kuyruğa yazılan iadeleri, yanıtı bekletmeden göndermeye başlar. */
export function kickRefunds(db: DB) {
  void processRefunds(db).catch((e) => console.error('[iade] gönderim hatası', e));
}

// --- Tedarikçi ödemesinin serbest bırakılması (ürün onayı) -------------------------------------

/**
 * Teslim edilmiş ve itiraz süresi dolmuş (açık mal kabul bildirimi olmayan) kalemleri serbest bırakır:
 *  - Pazaryeri ödemesi varsa iyzico'ya ürün onayı verilir (tedarikçinin payı ödemeye geçer).
 *  - Pazaryeri açıkken ödemesi henüz alınmamış (vadeli) kalem, üye ödeyene kadar bekler.
 *  - Pazaryeri kapalıyken kalem doğrudan serbest kalır; hakedişi Havuz havaleyle öder.
 * Serbest bırakılırken kalemin nihai tutarları dondurulur; hakediş bu tutarlardan oluşur.
 */
export async function processReleases(db: DB, now: Date = new Date()) {
  const windowEnd = new Date(now.getTime() - ISSUE_REPORT_WINDOW_HOURS * 3600_000);
  const candidates = await db
    .select({ id: s.orderItems.id, orderId: s.orderItems.orderId, supplierId: s.orderItems.supplierId, paymentStatus: s.orders.paymentStatus })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .leftJoin(s.issues, eq(s.issues.orderItemId, s.orderItems.id))
    .where(
      and(
        eq(s.orderItems.status, 'delivered'),
        isNull(s.orderItems.releasedAt),
        lte(s.orderItems.deliveredAt, windowEnd),
        or(isNull(s.issues.id), ne(s.issues.status, 'open')),
      ),
    )
    .limit(200);

  const market = marketplaceEnabled();
  const releasedBySupplier = new Map<string, { count: number; amount: number }>();
  let waiting = 0;
  let approvalErrors = 0;
  for (const c of candidates) {
    const paid = c.paymentStatus === 'paid' ? (await paidByItem(db, c.orderId)).filter((p) => p.orderItemId === c.id) : [];
    const pendingRefund = await db
      .select({ id: s.refunds.id })
      .from(s.refunds)
      .where(and(eq(s.refunds.orderItemId, c.id), inArray(s.refunds.status, ['pending', 'processing', 'failed'])))
      .limit(1);
    if (pendingRefund.length) {
      waiting++;
      continue; // önce iade tamamlansın, sonra onay
    }
    const marketRows = paid.filter((p) => p.subMerchantKey && p.providerTxnId && p.remaining > 0);
    if (market && c.paymentStatus !== 'paid') {
      waiting++;
      continue; // pazaryerinde tedarikçi parası üyenin ödemesiyle gelir
    }
    let ok = true;
    for (const p of marketRows.filter((x) => !x.approvedAt)) {
      const [pay] = await db.select({ provider: s.payments.provider }).from(s.payments).where(eq(s.payments.id, p.paymentId));
      try {
        await providerByName(pay.provider).approveItem(p.providerTxnId!);
        await db.update(s.paymentItems).set({ approvedAt: new Date(), approvalError: null }).where(eq(s.paymentItems.id, p.id));
      } catch (e) {
        ok = false;
        approvalErrors++;
        const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
        const attempts = p.approvalAttempts + 1;
        await db.update(s.paymentItems).set({ approvalError: msg, approvalAttempts: attempts }).where(eq(s.paymentItems.id, p.id));
        if (attempts === 3) {
          await db.transaction((tx) =>
            notifyOperators(tx, { type: 'approval.failed', title: 'iyzico ürün onayı verilemiyor', body: `Bir kalemin onayı 3 kez başarısız oldu: ${msg}`, link: '/yonetim/odemeler' }),
          );
        }
      }
    }
    if (!ok) continue;
    const done = await db.transaction(async (tx) => {
      const { line } = await orderBreakdown(tx, c.orderId);
      const l = line(c.id);
      const [r] = await tx
        .update(s.orderItems)
        .set({
          releasedAt: new Date(),
          chargeAmount: l.charge,
          issueDeduction: l.issueCredit,
          commissionAmount: l.commission,
          commissionVat: l.commissionVat,
          supplierShare: l.supplierShare,
        })
        .where(and(eq(s.orderItems.id, c.id), isNull(s.orderItems.releasedAt)))
        .returning({ id: s.orderItems.id });
      return r ? l.supplierShare : null;
    });
    if (done !== null) {
      const agg = releasedBySupplier.get(c.supplierId) ?? { count: 0, amount: 0 };
      agg.count++;
      agg.amount += done;
      releasedBySupplier.set(c.supplierId, agg);
    }
  }

  if (releasedBySupplier.size) {
    await db.transaction(async (tx) => {
      for (const [supplierId, agg] of releasedBySupplier) {
        await notify(tx, {
          orgId: supplierId,
          type: 'payout.released',
          title: `${formatTRY(agg.amount)} ödemeniz onaylandı`,
          body: market
            ? `${agg.count} teslim edilmiş kalemin itiraz süresi doldu; payınız iyzico tarafından hesabınıza aktarılacak.`
            : `${agg.count} teslim edilmiş kalemin itiraz süresi doldu; bir sonraki hakedişinize eklendi.`,
          link: '/tedarikci/hakedis',
        });
      }
    });
  }
  const released = [...releasedBySupplier.values()].reduce((a, b) => a + b.count, 0);
  return { released, waiting, approvalErrors };
}

export type { ChargeBreakdown };
