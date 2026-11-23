import 'server-only';
import { and, desc, eq, inArray, isNotNull, isNull, lte, ne } from 'drizzle-orm';
import {
  computeCharges,
  computeSettlement,
  createSettlementsInput,
  formatSettlementNumber,
  formatTRY,
  markSettlementPaidInput,
  trDate,
  trYear,
  type AdminPayoutRowDTO,
  type PayoutOverviewDTO,
  type SettlementDetailDTO,
  type SettlementDTO,
} from '@havuz/core';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { audit, type Actor } from '../audit';
import { notify } from '../notify';
import { marketplaceEnabled } from '../payments';
import { payoutStatus } from './payout-profile';

/**
 * Hakediş = serbest bırakılmış (teslim + itiraz süresi; pazaryerinde iyzico ürün onayı almış)
 * kalemlerin dönemsel dökümü. Kalem tutarları serbest bırakılırken dondurulduğu için hakediş
 * sonradan değişmez. Pazaryerinde tedarikçiye iyzico öder (kanal: iyzico); pazaryeri kapalıyken
 * Havuz havale eder ve "ödendi" işaretler (kanal: manual).
 */
async function eligibleItems(db: Executor, supplierId?: string, periodEnd?: Date) {
  const rows = await db
    .select({
      id: s.orderItems.id,
      supplierId: s.orderItems.supplierId,
      charge: s.orderItems.chargeAmount,
      issueDeduction: s.orderItems.issueDeduction,
      commission: s.orderItems.commissionAmount,
      commissionVat: s.orderItems.commissionVat,
      supplierShare: s.orderItems.supplierShare,
    })
    .from(s.orderItems)
    .where(
      and(
        isNotNull(s.orderItems.releasedAt),
        isNull(s.orderItems.settlementId),
        supplierId ? eq(s.orderItems.supplierId, supplierId) : undefined,
        periodEnd ? lte(s.orderItems.releasedAt, periodEnd) : undefined,
      ),
    );
  const ids = rows.map((r) => r.id);
  const viaIyzico = new Set(
    ids.length
      ? (
          await db
            .select({ id: s.paymentItems.orderItemId })
            .from(s.paymentItems)
            .where(and(inArray(s.paymentItems.orderItemId, ids), isNotNull(s.paymentItems.approvedAt)))
        ).map((r) => r.id)
      : [],
  );
  return rows.map((r) => ({
    id: r.id,
    supplierId: r.supplierId,
    channel: (viaIyzico.has(r.id) ? 'iyzico' : 'manual') as 'iyzico' | 'manual',
    charge: r.charge ?? 0,
    issueDeduction: r.issueDeduction ?? 0,
    commission: r.commission ?? 0,
    commissionVat: r.commissionVat ?? 0,
    supplierShare: r.supplierShare ?? 0,
  }));
}

/** Teslim edilmiş/edilecek ama henüz serbest bırakılmamış kalemler (tahmini tedarikçi payı). */
async function awaitingItems(db: Executor, supplierId: string) {
  const rows = await db
    .select({ id: s.orderItems.id, qty: s.orderItems.qty, finalUnitPrice: s.orderItems.finalUnitPrice, vatRate: s.orderItems.vatRate, commissionBps: s.orderItems.commissionBps })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.supplierId, supplierId), isNull(s.orderItems.releasedAt), ne(s.orderItems.status, 'cancelled'), ne(s.orders.paymentStatus, 'unpaid')));
  const b = computeCharges(rows.map((r) => ({ ...r })), 0);
  return { itemCount: rows.length, estimated: b.lines.reduce((a, l) => a + l.supplierShare, 0) };
}

function toDTO(x: typeof s.settlements.$inferSelect & { supplier: typeof s.organizations.$inferSelect }): SettlementDTO {
  return {
    id: x.id,
    number: x.number,
    supplier: { id: x.supplier.id, name: x.supplier.name },
    periodEnd: x.periodEnd.toISOString(),
    itemCount: x.itemCount,
    grossSales: x.grossSales,
    commission: x.commission,
    commissionVat: x.commissionVat,
    issueDeductions: x.issueDeductions,
    netAmount: x.netAmount,
    channel: x.channel,
    status: x.status,
    reference: x.reference,
    iban: x.iban,
    createdAt: x.createdAt.toISOString(),
    paidAt: x.paidAt?.toISOString() ?? null,
  };
}

export async function supplierPayouts(db: DB, session: SessionPayload): Promise<PayoutOverviewDTO> {
  const sup = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!sup) throw notFound('Tedarikçi');
  const t = computeSettlement(await eligibleItems(db, sup.id));
  const rows = await db.query.settlements.findMany({
    where: eq(s.settlements.supplierId, sup.id),
    with: { supplier: true },
    orderBy: [desc(s.settlements.createdAt)],
    limit: 60,
  });
  return {
    pending: { itemCount: t.itemCount, grossSales: t.grossSales, commission: t.commission, commissionVat: t.commissionVat, issueDeductions: t.issueDeductions, netAmount: t.netAmount },
    awaiting: await awaitingItems(db, sup.id),
    iban: sup.iban,
    marketplace: marketplaceEnabled(),
    profile: payoutStatus(sup),
    settlements: rows.map(toDTO),
  };
}

export async function adminPayouts(db: DB): Promise<{ pending: AdminPayoutRowDTO[]; settlements: SettlementDTO[] }> {
  const sups = await db.select().from(s.organizations).where(eq(s.organizations.type, 'supplier'));
  const items = await eligibleItems(db);
  const pending = sups
    .map((sp) => {
      const t = computeSettlement(items.filter((i) => i.supplierId === sp.id));
      return { supplier: { id: sp.id, name: sp.name, iban: sp.iban }, itemCount: t.itemCount, netAmount: t.netAmount, commission: t.commission };
    })
    .filter((r) => r.itemCount > 0)
    .sort((a, b) => b.netAmount - a.netAmount);
  const rows = await db.query.settlements.findMany({ with: { supplier: true }, orderBy: [desc(s.settlements.createdAt)], limit: 100 });
  return { pending, settlements: rows.map(toDTO) };
}

/** "2026-11-23" gibi gün seçimi → o günün sonu (Türkiye saati); gelecekse şimdi. */
function periodEndOf(d: Date) {
  const midnightUtc = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  const end = midnightUtc ? new Date(trDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate() + 1).getTime() - 1000) : d;
  return end > new Date() ? new Date() : end;
}

/**
 * Dönem sonuna kadar serbest bırakılmış kalemlerden her tedarikçi (ve ödeme kanalı) için bir hakediş
 * oluşturur. Kalemler `settlement_id IS NULL` koşuluyla atomik olarak sahiplenilir: eşzamanlı iki
 * çağrı aynı kalemi iki hakedişe yazamaz.
 */
export async function createSettlements(db: DB, raw: unknown, actor: Actor) {
  const parsed = createSettlementsInput.parse(raw);
  if (parsed.periodEnd.getTime() > Date.now() + 86_400_000) throw badRequest('Dönem sonu gelecekte olamaz');
  const periodEnd = periodEndOf(parsed.periodEnd);
  const candidates = await eligibleItems(db, undefined, periodEnd);
  const groups = [...new Set(candidates.map((c) => `${c.supplierId}|${c.channel}`))];
  const created: SettlementDTO[] = [];
  for (const g of groups) {
    const [supplierId, channel] = g.split('|') as [string, 'iyzico' | 'manual'];
    const dto = await db.transaction(async (tx) => {
      const [sup] = await tx.select().from(s.organizations).where(eq(s.organizations.id, supplierId));
      const [st] = await tx
        .insert(s.settlements)
        .values({ number: `TMP-${crypto.randomUUID()}`, supplierId, periodEnd, itemCount: 0, grossSales: 0, commission: 0, netAmount: 0, iban: sup.iban, channel })
        .returning();
      const mine = (await eligibleItems(tx, supplierId, periodEnd)).filter((i) => i.channel === channel);
      const claimedIds = mine.length
        ? (
            await tx
              .update(s.orderItems)
              .set({ settlementId: st.id })
              .where(and(inArray(s.orderItems.id, mine.map((i) => i.id)), isNull(s.orderItems.settlementId)))
              .returning({ id: s.orderItems.id })
          ).map((r) => r.id)
        : [];
      if (claimedIds.length === 0) {
        await tx.delete(s.settlements).where(eq(s.settlements.id, st.id));
        return null;
      }
      const t = computeSettlement(mine.filter((i) => claimedIds.includes(i.id)));
      const number = formatSettlementNumber(st.seq, trYear(periodEnd));
      const viaIyzico = channel === 'iyzico';
      const [done] = await tx
        .update(s.settlements)
        .set({
          number,
          itemCount: t.itemCount,
          grossSales: t.grossSales,
          commission: t.commission,
          commissionVat: t.commissionVat,
          issueDeductions: t.issueDeductions,
          netAmount: t.netAmount,
          // Pazaryerinde ödemeyi iyzico yapar; belge mutabakat içindir.
          ...(viaIyzico ? { status: 'paid' as const, paidAt: new Date(), reference: 'iyzico pazaryeri ödemesi' } : {}),
        })
        .where(eq(s.settlements.id, st.id))
        .returning();
      await notify(tx, {
        orgId: supplierId,
        type: 'settlement.created',
        title: `Hakediş belgesi: ${number}`,
        body: viaIyzico
          ? `${t.itemCount} kalem için ${formatTRY(t.netAmount)} payınız iyzico tarafından hesabınıza aktarılır. Komisyon faturası bu belgeye göre kesilir.`
          : `${t.itemCount} teslim edilmiş kalem için ${formatTRY(t.netAmount)} hakedişiniz hazırlandı. Ödeme yapıldığında bilgilendirileceksiniz.`,
        link: `/tedarikci/hakedis/${st.id}`,
      });
      await audit(tx, actor, 'settlement.create', 'settlement', st.id, `${number} · ${sup.name} · ${formatTRY(t.netAmount)} (${viaIyzico ? 'iyzico' : 'havale'})`);
      return toDTO({ ...done, supplier: sup });
    });
    if (dto) created.push(dto);
  }
  return { created };
}

export async function markSettlementPaid(db: DB, id: string, raw: unknown, actor: Actor) {
  const { reference } = markSettlementPaidInput.parse(raw);
  await db.transaction(async (tx) => {
    const [st] = await tx
      .update(s.settlements)
      .set({ status: 'paid', paidAt: new Date(), reference })
      .where(and(eq(s.settlements.id, id), eq(s.settlements.status, 'pending'), eq(s.settlements.channel, 'manual')))
      .returning();
    if (!st) throw badRequest('Hakediş bulunamadı, zaten ödenmiş ya da iyzico tarafından ödeniyor');
    await notify(tx, {
      orgId: st.supplierId,
      type: 'settlement.paid',
      title: `Hakediş ödendi: ${st.number}`,
      body: `${formatTRY(st.netAmount)} hesabınıza gönderildi. Referans: ${reference}`,
      link: `/tedarikci/hakedis/${st.id}`,
      email: true,
    });
    await audit(tx, actor, 'settlement.paid', 'settlement', st.id, `${st.number} ödendi (${formatTRY(st.netAmount)}, ref ${reference})`);
  });
}

export async function settlementDetail(db: DB, session: SessionPayload, id: string): Promise<SettlementDetailDTO> {
  const st = await db.query.settlements.findFirst({ where: eq(s.settlements.id, id), with: { supplier: true } });
  if (!st || (session.role === 'supplier' && st.supplierId !== session.org)) throw notFound('Hakediş');
  const items = await db
    .select({
      id: s.orderItems.id,
      orderNumber: s.orders.number,
      member: s.organizations.name,
      productName: s.products.name,
      unit: s.products.unit,
      qty: s.orderItems.qty,
      finalUnitPrice: s.orderItems.finalUnitPrice,
      vatRate: s.orderItems.vatRate,
      deliveredAt: s.orderItems.deliveredAt,
      charge: s.orderItems.chargeAmount,
      issueDeduction: s.orderItems.issueDeduction,
      commission: s.orderItems.commissionAmount,
      commissionVat: s.orderItems.commissionVat,
      supplierShare: s.orderItems.supplierShare,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.orders.memberId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .where(eq(s.orderItems.settlementId, id))
    .orderBy(s.orderItems.deliveredAt);
  const issues = await db
    .select({ id: s.issues.id, orderNumber: s.orders.number, productName: s.products.name, creditAmount: s.issues.creditAmount })
    .from(s.issues)
    .innerJoin(s.orderItems, eq(s.orderItems.id, s.issues.orderItemId))
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .where(and(eq(s.orderItems.settlementId, id), eq(s.issues.status, 'resolved')));
  return {
    ...toDTO(st),
    items: items.map((i) => ({
      id: i.id,
      orderNumber: i.orderNumber,
      member: i.member,
      productName: i.productName,
      unit: i.unit,
      qty: i.qty,
      finalUnitPrice: i.finalUnitPrice,
      vatRate: i.vatRate,
      deliveredAt: i.deliveredAt?.toISOString() ?? null,
      gross: (i.charge ?? 0) + (i.issueDeduction ?? 0),
      issueDeduction: i.issueDeduction ?? 0,
      commission: i.commission ?? 0,
      commissionVat: i.commissionVat ?? 0,
      payout: i.supplierShare ?? 0,
    })),
    issues,
  };
}
