import 'server-only';
import { and, asc, desc, eq, gt, gte, inArray, ne, sql } from 'drizzle-orm';
import {
  canTransition,
  computeOrderTotals,
  createOrderInput,
  deriveOrderStatus,
  dueDate,
  formatOrderNumber,
  FINANCING_BPS,
  formatTRY,
  isTermAllowed,
  ISSUE_REPORT_WINDOW_HOURS,
  ISSUE_TYPE_LABEL,
  PAYMENT_WINDOW_MINUTES,
  resolveTier,
  type ItemStatus,
  type OrderDetailDTO,
  type OrderStatus,
  type OrderSummaryDTO,
  type ReportIssueInput,
  trYear,
} from '@havuz/core';
import type { z } from 'zod';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { AppError, badRequest, forbidden, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { iso, outstanding, pooledForWave, STATUS_STEPS } from './common';
import { applyOrderChange, kickRefunds } from './money-flow';
import { toRefundDTO } from './refunds';
import { marketplaceEnabled } from '../payments';
import { audit, SYSTEM, type Actor } from '../audit';
import { notify, notifyOperators } from '../notify';

type RefundRow = typeof s.refunds.$inferSelect & { org: { name: string }; order: { number: string } | null };
type InvoiceRow = Omit<typeof s.invoices.$inferSelect, 'fileData'> & { supplier: typeof s.organizations.$inferSelect };
type OrderRow = typeof s.orders.$inferSelect & {
  wave: typeof s.waves.$inferSelect | null;
  member?: typeof s.organizations.$inferSelect;
  refunds?: RefundRow[];
  invoices?: InvoiceRow[];
  items: (typeof s.orderItems.$inferSelect & {
    product: typeof s.products.$inferSelect & { category: typeof s.categories.$inferSelect };
    supplier: typeof s.organizations.$inferSelect;
    issue: typeof s.issues.$inferSelect | null;
  })[];
};

const orderWith = {
  wave: true,
  member: true,
  items: { with: { product: { with: { category: true } }, supplier: true, issue: true } },
} as const;

/** Detay: iadeler ve faturalar da (fatura dosyası hariç; dosya ayrı uçtan indirilir). */
const orderDetailWith = {
  ...orderWith,
  refunds: { with: { org: { columns: { name: true } }, order: { columns: { number: true } } }, orderBy: (r: typeof s.refunds, { desc }: { desc: (c: unknown) => unknown }) => [desc(r.createdAt)] },
  invoices: { columns: { fileData: false }, with: { supplier: true } },
} as const;

export function toOrderSummary(o: OrderRow): OrderSummaryDTO {
  const active = o.items.filter((i) => i.status !== 'cancelled');
  const savings = active.reduce((a, i) => a + i.qty * Math.max(0, i.marketPrice - i.finalUnitPrice), 0);
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    wave: o.wave ? { id: o.wave.id, code: o.wave.code, title: o.wave.title } : null,
    itemCount: o.items.length,
    supplierCount: new Set(o.items.map((i) => i.supplierId)).size,
    total: o.total,
    savings,
    waveCredit: o.waveCredit,
    paymentTerm: o.paymentTerm,
    paymentStatus: o.paymentStatus,
    dueAt: iso(o.dueAt),
    member: o.member ? { id: o.member.id, name: o.member.name } : undefined,
  };
}

export function toOrderDetail(o: OrderRow): OrderDetailDTO {
  const at: Record<OrderStatus, Date | null> = {
    pending: o.createdAt,
    confirmed: o.confirmedAt,
    shipped: o.shippedAt,
    delivered: o.deliveredAt,
    cancelled: null,
  };
  const reached = STATUS_STEPS.indexOf(o.status);
  return {
    ...toOrderSummary(o),
    subtotal: o.subtotal,
    vat: o.vat,
    financingFee: o.financingFee,
    creditApplied: o.creditApplied,
    marketTotal: o.marketTotal,
    note: o.note,
    paymentDeadline:
      o.paymentStatus === 'unpaid' && o.status !== 'cancelled'
        ? new Date(o.createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60_000).toISOString()
        : null,
    timeline: STATUS_STEPS.map((st, i) => ({ status: st, at: iso(at[st]), done: o.status !== 'cancelled' && i <= reached })),
    items: o.items.map((i) => ({
      id: i.id,
      offerId: i.offerId,
      productId: i.productId,
      productName: i.product.name,
      unit: i.product.unit,
      categoryIcon: i.product.category.icon,
      supplier: { id: i.supplier.id, name: i.supplier.name },
      qty: i.qty,
      unitPrice: i.unitPrice,
      finalUnitPrice: i.finalUnitPrice,
      marketPrice: i.marketPrice,
      vatRate: i.vatRate,
      status: i.status,
      issue: i.issue
        ? { id: i.issue.id, type: i.issue.type, status: i.issue.status, qty: i.issue.qty, note: i.issue.note, creditAmount: i.issue.creditAmount, photo: i.issue.photo }
        : null,
      image: i.product.image,
      issueDeadline:
        i.status === 'delivered' && i.deliveredAt && !i.releasedAt ? new Date(i.deliveredAt.getTime() + ISSUE_REPORT_WINDOW_HOURS * 3600_000).toISOString() : null,
    })),
    refunds: (o.refunds ?? []).map(toRefundDTO),
    refundedTotal: (o.refunds ?? []).reduce((a, r) => a + r.amount, 0),
    invoices: (o.invoices ?? []).map((v) => ({
      id: v.id,
      supplier: { id: v.supplier.id, name: v.supplier.name },
      number: v.number,
      issuedAt: v.issuedAt.toISOString(),
      amount: v.amount,
      fileName: v.fileName,
      mime: v.mime,
      size: v.size,
    })),
  };
}

async function loadOrder(db: Executor, id: string) {
  const o = await db.query.orders.findFirst({ where: eq(s.orders.id, id), with: orderDetailWith as typeof orderWith });
  if (!o) throw notFound('Sipariş');
  return o as OrderRow;
}

export async function listOrders(db: DB, session: SessionPayload): Promise<OrderSummaryDTO[]> {
  const rows = await db.query.orders.findMany({
    where: session.role === 'admin' ? undefined : eq(s.orders.memberId, session.org),
    with: orderWith,
    orderBy: [desc(s.orders.createdAt)],
    limit: 200,
  });
  return (rows as OrderRow[]).map(toOrderSummary);
}

export async function getOrder(db: DB, session: SessionPayload, id: string): Promise<OrderDetailDTO> {
  const o = await loadOrder(db, id);
  if (session.role === 'member' && o.memberId !== session.org) throw notFound('Sipariş');
  if (session.role === 'supplier') {
    if (!o.items.some((i) => i.supplierId === session.org)) throw notFound('Sipariş');
    const mine = new Set(o.items.filter((i) => i.supplierId === session.org).map((i) => i.id));
    o.items = o.items.filter((i) => mine.has(i.id));
    o.refunds = (o.refunds ?? []).filter((r) => r.orderItemId && mine.has(r.orderItemId));
    o.invoices = (o.invoices ?? []).filter((v) => v.supplierId === session.org);
  }
  return toOrderDetail(o);
}

export async function createOrder(db: DB, session: SessionPayload, raw: unknown, actor: Actor = {}): Promise<OrderDetailDTO> {
  const input = createOrderInput.parse(raw) as z.output<typeof createOrderInput>;

  // Aynı teklif birden fazla satırda gelirse birleştir.
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.offerId, (merged.get(it.offerId) ?? 0) + it.qty);

  const orderId = await db.transaction(async (tx) => {
    // KİLİT SIRASI (tüm işlemlerde aynı): dalga → üye → teklifler. Dalga kapanışı da önce dalgayı
    // kilitlediği için sipariş ile kapanış birbirini karşılıklı beklemez (deadlock oluşmaz).
    let waveId: string | null = null;
    if (input.waveId) {
      // Paylaşımlı kilit: kapanış (FOR UPDATE) süren siparişleri bekler; kapanıştan sonra gelen
      // sipariş dalgayı "kapalı" görür ve reddedilir.
      const [wave] = await tx
        .select({ id: s.waves.id })
        .from(s.waves)
        .where(and(eq(s.waves.id, input.waveId), eq(s.waves.status, 'open'), gt(s.waves.cutoffAt, new Date())))
        .for('share');
      if (!wave) throw badRequest('Bu dalga siparişe kapandı');
      waveId = wave.id;
    }

    // Üye satırı kilitlenir: aynı üyenin eşzamanlı siparişleri sıraya girer
    // (vadeli limit iki kez harcanamaz).
    const [member] = await tx.select().from(s.organizations).where(eq(s.organizations.id, session.org)).for('no key update');
    if (!member || member.type !== 'member') throw forbidden();
    if (!isTermAllowed(member.plan, input.paymentTerm)) {
      throw badRequest('60 gün vade yalnızca Pro üyelerde kullanılabilir');
    }

    // Teklif satırları sabit sırayla kilitlenir (kilitlenme/deadlock olmaz); stok kontrolü güvenli.
    await tx
      .select({ id: s.offers.id })
      .from(s.offers)
      .where(inArray(s.offers.id, [...merged.keys()]))
      .orderBy(asc(s.offers.id))
      .for('no key update');
    const offerRows = await tx.query.offers.findMany({
      where: inArray(s.offers.id, [...merged.keys()]),
      with: { product: true, supplier: true },
    });
    if (offerRows.length !== merged.size) throw badRequest('Sepetteki bazı ürünler artık mevcut değil');
    // Pazaryerinde ödeme tedarikçi payı ayrılarak alınır: iyzico kaydı tamamlanmamış tedarikçi satış yapamaz.
    if (marketplaceEnabled()) {
      const missing = offerRows.find((o) => !o.supplier.subMerchantKey);
      if (missing) throw badRequest(`${missing.supplier.name} şu an sipariş alamıyor (ödeme kaydı tamamlanmadı). Ürünü sepetten çıkarın veya başka tedarikçi seçin.`);
    }

    const pooled = waveId ? await pooledForWave(tx, waveId, [...merged.keys()]) : {};

    const lines = offerRows.map((o) => {
      const qty = merged.get(o.id)!;
      if (!o.active) throw badRequest(`${o.product.name} şu an satışta değil`);
      if (o.stock < qty) throw badRequest(`${o.product.name} için yeterli stok yok (en fazla ${o.stock} ${o.product.unit})`);
      // Dalgada üyenin kendi miktarı da havuza dahil edilir → anında kademe avantajı.
      const unitPrice = resolveTier(o, (waveId ? pooled[o.id] ?? 0 : 0) + qty).unitPrice;
      return { o, qty, unitPrice };
    });

    const totals = computeOrderTotals(
      lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, marketPrice: l.o.product.marketPrice, vatRate: l.o.product.vatRate })),
      { plan: member.plan, term: input.paymentTerm },
    );

    if (input.paymentTerm !== 'cash') {
      const open = await outstanding(tx, member.id);
      if (open + totals.total > member.creditLimit) {
        throw new AppError(
          422,
          'credit_limit',
          'Vadeli limitiniz bu sipariş için yetersiz. Peşin ödeme seçin veya açık bakiyenizi kapatın.',
          { limit: member.creditLimit, outstanding: open },
        );
      }
    }

    const now = new Date();
    const [order] = await tx
      .insert(s.orders)
      .values({
        number: `TMP-${crypto.randomUUID()}`,
        memberId: member.id,
        userId: session.sub,
        waveId,
        status: 'pending',
        paymentTerm: input.paymentTerm,
        // Peşin: kart ödemesi beklenir; vadeli: vade tarihinde ödenir.
        paymentStatus: totals.total === 0 ? 'paid' : input.paymentTerm === 'cash' ? 'unpaid' : 'due',
        dueAt: input.paymentTerm === 'cash' ? null : dueDate(now, input.paymentTerm),
        paidAt: totals.total === 0 ? now : null,
        subtotal: totals.subtotal,
        vat: totals.vat,
        financingFee: totals.financingFee,
        financingBps: FINANCING_BPS[member.plan][input.paymentTerm] ?? 0,
        total: totals.total,
        marketTotal: totals.marketTotal,
        note: input.note ?? null,
        termsAcceptedAt: now,
        createdAt: now,
      })
      .returning({ id: s.orders.id, seq: s.orders.seq });
    await tx
      .update(s.orders)
      .set({ number: formatOrderNumber(order.seq, trYear(now)) })
      .where(eq(s.orders.id, order.id));

    await tx.insert(s.orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        offerId: l.o.id,
        productId: l.o.productId,
        supplierId: l.o.supplierId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        finalUnitPrice: l.unitPrice,
        marketPrice: l.o.product.marketPrice,
        vatRate: l.o.product.vatRate,
        commissionBps: l.o.supplier.commissionBps,
      })),
    );

    for (const l of lines) {
      const updated = await tx
        .update(s.offers)
        .set({ stock: sql`${s.offers.stock} - ${l.qty}` })
        .where(and(eq(s.offers.id, l.o.id), gte(s.offers.stock, l.qty)))
        .returning({ id: s.offers.id });
      if (updated.length === 0) throw badRequest(`${l.o.product.name} için yeterli stok kalmadı`);
    }

    const number = formatOrderNumber(order.seq, trYear(now));
    await audit(tx, { ...actor, userId: session.sub, orgId: member.id, name: member.name }, 'order.create', 'order', order.id, `${number} oluşturuldu (${formatTRY(totals.total)})`, {
      paymentTerm: input.paymentTerm,
      waveId,
      items: lines.length,
    });
    // Ödeme bekleyen peşin siparişi tedarikçi henüz görmez; ödeme alınınca bildirilir.
    if (!(input.paymentTerm === 'cash' && totals.total > 0)) await notifySuppliersOfOrder(tx, order.id);
    return order.id;
  });

  return toOrderDetail(await loadOrder(db, orderId));
}

/** Kalem durumları değiştiğinde sipariş durumunu ve zaman damgalarını günceller. */
export async function syncOrderStatus(tx: Executor, orderId: string) {
  const items = await tx.select({ status: s.orderItems.status }).from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  const status = deriveOrderStatus(items.map((i) => i.status));
  const now = new Date();
  const order = await tx.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!order) return;
  const idx = STATUS_STEPS.indexOf(status);
  await tx
    .update(s.orders)
    .set({
      status,
      confirmedAt: idx >= 1 ? (order.confirmedAt ?? now) : order.confirmedAt,
      shippedAt: idx >= 2 ? (order.shippedAt ?? now) : order.shippedAt,
      deliveredAt: idx >= 3 ? (order.deliveredAt ?? now) : order.deliveredAt,
    })
    .where(eq(s.orders.id, orderId));
}

export async function updateItemStatus(db: DB, session: SessionPayload, itemId: string, to: ItemStatus) {
  await updateItemStatusTx(db, session, itemId, to);
  if (to === 'cancelled') kickRefunds(db);
}

async function updateItemStatusTx(db: DB, session: SessionPayload, itemId: string, to: ItemStatus) {
  await db.transaction(async (tx) => {
    const [item] = await tx.select().from(s.orderItems).where(eq(s.orderItems.id, itemId)).for('no key update');
    if (!item) throw notFound('Kalem');
    if (session.role === 'supplier' && item.supplierId !== session.org) throw notFound('Kalem');
    if (!canTransition(item.status, to)) throw badRequest('Bu durum geçişine izin verilmiyor');
    const [ord] = await tx.select({ paymentStatus: s.orders.paymentStatus }).from(s.orders).where(eq(s.orders.id, item.orderId));
    if (ord?.paymentStatus === 'unpaid' && to !== 'cancelled') throw badRequest('Bu siparişin ödemesi henüz alınmadı');
    await tx
      .update(s.orderItems)
      .set({ status: to, updatedAt: new Date(), deliveredAt: to === 'delivered' ? new Date() : item.deliveredAt })
      .where(eq(s.orderItems.id, itemId));
    let money: Awaited<ReturnType<typeof applyOrderChange>> | undefined;
    await syncOrderStatus(tx, item.orderId);
    if (to === 'cancelled') {
      await tx
        .update(s.offers)
        .set({ stock: sql`${s.offers.stock} + ${item.qty}` })
        .where(eq(s.offers.id, item.offerId));
      const [p] = await tx.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, item.productId));
      // Ödenmiş siparişte kalem bedeli karta iade edilir; ödenmemişte borçtan düşülür.
      money = await applyOrderChange(tx, item.orderId, 'item_cancelled', `${p?.name ?? 'Ürün'} iptal edildi`);
    }
    await notifyMemberOfItem(tx, item.orderId, item.productId, to, money);
    await audit(tx, { userId: session.sub, orgId: session.org }, `item.${to}`, 'order_item', itemId, `Kalem durumu: ${item.status} → ${to}`, { orderId: item.orderId });
  });
}

/** Ödenmiş/vadeli sipariş tedarikçilerine "yeni sipariş" bildirimi (tedarikçi başına bir). */
export async function notifySuppliersOfOrder(tx: Executor, orderId: string) {
  const rows = await tx
    .select({ supplierId: s.orderItems.supplierId, number: s.orders.number, member: s.organizations.name, waveId: s.orders.waveId })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.orders.memberId))
    .where(eq(s.orderItems.orderId, orderId));
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.supplierId)) continue;
    seen.add(r.supplierId);
    const count = rows.filter((x) => x.supplierId === r.supplierId).length;
    await notify(tx, {
      orgId: r.supplierId,
      type: 'order.new',
      title: `Yeni sipariş: ${r.number}`,
      body: `${r.member} · ${count} kalem${r.waveId ? ' · dalga siparişi' : ' · hemen teslim'}`,
      link: '/tedarikci/siparisler',
      dedupeKey: `order.new:${orderId}:${r.supplierId}`,
      email: true,
    });
  }
}

async function notifyMemberOfItem(tx: Executor, orderId: string, productId: string, to: ItemStatus, money?: { mode: string; amount: number }) {
  const [o] = await tx.select({ memberId: s.orders.memberId, number: s.orders.number, status: s.orders.status }).from(s.orders).where(eq(s.orders.id, orderId));
  if (!o) return;
  const [p] = await tx.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, productId));
  const link = `/uye/siparisler/${orderId}`;
  if (to === 'shipped') {
    await notify(tx, { orgId: o.memberId, type: 'order.shipped', title: `${o.number} yolda`, body: 'Siparişinizdeki ürünler sevk edildi. Teslim alınca “Teslim aldım” deyin.', link, dedupeKey: `order.shipped:${orderId}`, whatsapp: true });
  } else if (to === 'delivered' && o.status === 'delivered') {
    await notify(tx, { orgId: o.memberId, type: 'order.delivered', title: `${o.number} teslim edildi`, body: 'Ürünleri kontrol edin; sorun varsa sipariş sayfasından fotoğrafla bildirebilirsiniz.', link, dedupeKey: `order.delivered:${orderId}` });
  } else if (to === 'cancelled') {
    const how =
      money?.mode === 'refund'
        ? `${formatTRY(money.amount)} kartınıza iade ediliyor.`
        : money?.mode === 'reduced'
          ? `Ödeyeceğiniz tutar ${formatTRY(money.amount)} azaldı.`
          : 'Bu kalem için sizden ödeme alınmayacak.';
    await notify(tx, { orgId: o.memberId, type: 'order.item_cancelled', title: `${o.number}: bir kalem iptal edildi`, body: `${p?.name ?? 'Ürün'} tedarikçi tarafından iptal edildi. ${how}`, link, email: true });
  }
}

/**
 * Ödenmemiş peşin siparişi iptal eder: stok geri eklenir, kullanılan kredi iade edilir.
 * Çağıran, sipariş satırını kilitlemiş olmalıdır.
 */
export async function cancelUnpaidOrder(tx: Executor, order: typeof s.orders.$inferSelect, reason: string) {
  const items = await tx
    .update(s.orderItems)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(s.orderItems.orderId, order.id), ne(s.orderItems.status, 'cancelled')))
    .returning({ offerId: s.orderItems.offerId, qty: s.orderItems.qty });
  for (const it of items) {
    await tx.update(s.offers).set({ stock: sql`${s.offers.stock} + ${it.qty}` }).where(eq(s.offers.id, it.offerId));
  }
  if (order.creditApplied > 0) {
    await tx.insert(s.ledgerEntries).values({
      orgId: order.memberId,
      type: 'adjustment',
      amount: order.creditApplied,
      description: `${order.number} iptal: kullanılan kredi iadesi`,
      refId: order.id,
    });
  }
  await tx.update(s.orders).set({ status: 'cancelled' }).where(eq(s.orders.id, order.id));
  await tx.update(s.payments).set({ status: 'cancelled' }).where(and(eq(s.payments.orderId, order.id), eq(s.payments.status, 'pending')));
  await notify(tx, { orgId: order.memberId, type: 'order.cancelled', title: `${order.number} iptal edildi`, body: reason, link: `/uye/siparisler/${order.id}` });
}

/** Üye, ödemesini henüz yapmadığı peşin siparişini iptal edebilir. */
export async function cancelOwnUnpaidOrder(db: DB, session: SessionPayload, orderId: string) {
  await db.transaction(async (tx) => {
    const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for('no key update');
    if (!o || o.memberId !== session.org) throw notFound('Sipariş');
    if (o.paymentStatus !== 'unpaid' || o.status === 'cancelled') throw badRequest('Yalnızca ödemesi yapılmamış sipariş iptal edilebilir');
    await cancelUnpaidOrder(tx, o, 'Siparişi siz iptal ettiniz; sizden ödeme alınmadı.');
    await audit(tx, { userId: session.sub, orgId: session.org }, 'order.cancel', 'order', o.id, `${o.number} üye tarafından iptal edildi`);
  });
}

/** Üye "teslim aldım" der: yoldaki tüm kalemler teslim edilmiş sayılır. */
export async function confirmDelivery(db: DB, session: SessionPayload, orderId: string) {
  await db.transaction(async (tx) => {
    const o = await tx.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
    if (!o || o.memberId !== session.org) throw notFound('Sipariş');
    const r = await tx
      .update(s.orderItems)
      .set({ status: 'delivered', updatedAt: new Date(), deliveredAt: new Date() })
      .where(and(eq(s.orderItems.orderId, orderId), eq(s.orderItems.status, 'shipped')))
      .returning({ id: s.orderItems.id });
    if (r.length === 0) throw badRequest('Teslim alınacak (yolda) ürün yok');
    await syncOrderStatus(tx, orderId);
    await audit(tx, { userId: session.sub, orgId: session.org }, 'order.receive', 'order', orderId, `${o.number} teslim alındı (${r.length} kalem)`);
  });
}

export async function reportIssue(db: DB, session: SessionPayload, orderId: string, itemId: string, input: ReportIssueInput) {
  const item = await db.query.orderItems.findFirst({
    where: and(eq(s.orderItems.id, itemId), eq(s.orderItems.orderId, orderId)),
    with: { order: true, issue: true },
  });
  if (!item || item.order.memberId !== session.org) throw notFound('Kalem');
  if (item.status !== 'delivered') throw badRequest('Sorun bildirimi yalnızca teslim edilen ürünler için yapılabilir');
  if (item.releasedAt || (item.deliveredAt && Date.now() - item.deliveredAt.getTime() > ISSUE_REPORT_WINDOW_HOURS * 3600_000)) {
    throw badRequest(`Sorun bildirimi teslimden sonraki ${ISSUE_REPORT_WINDOW_HOURS} saat içinde yapılabilir`);
  }
  if (item.issue) throw badRequest('Bu ürün için zaten bir bildirim var');
  if (input.qty > item.qty) throw badRequest(`En fazla ${item.qty} adet bildirebilirsiniz`);
  await db.transaction(async (tx) => {
    const [iss] = await tx
      .insert(s.issues)
      .values({ orderItemId: itemId, type: input.type, qty: input.qty, note: input.note ?? null, photo: input.photo ?? null })
      .returning({ id: s.issues.id });
    const [p] = await tx.select({ name: s.products.name }).from(s.products).where(eq(s.products.id, item.productId));
    await notifyOperators(tx, {
      type: 'issue.new',
      title: `Mal kabul bildirimi: ${item.order.number}`,
      body: `${p?.name ?? 'Ürün'} · ${ISSUE_TYPE_LABEL[input.type]} · ${input.qty} adet${input.photo ? ' · fotoğraflı' : ''}`,
      link: '/yonetim/sorunlar',
    });
    await notify(tx, {
      orgId: item.supplierId,
      type: 'issue.new',
      title: `Ürününüz için mal kabul bildirimi`,
      body: `${item.order.number} · ${p?.name ?? 'Ürün'} · ${ISSUE_TYPE_LABEL[input.type]} (${input.qty} adet). Onaylanırsa bu kalemin bedelinden düşülür; inceleme bitene kadar kalemin ödemesi bekletilir.`,
      link: '/tedarikci/siparisler',
    });
    await audit(tx, { userId: session.sub, orgId: session.org }, 'issue.create', 'issue', iss.id, `${item.order.number} için ${ISSUE_TYPE_LABEL[input.type]} bildirimi`);
  });
}
