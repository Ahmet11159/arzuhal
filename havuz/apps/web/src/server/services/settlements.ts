import 'server-only';
import { and, desc, eq, inArray, isNull, lte } from 'drizzle-orm';
import {
  computeSettlement,
  createSettlementsInput,
  formatSettlementNumber,
  formatTRY,
  markSettlementPaidInput,
  applyBps,
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

/** Hakedişe girmemiş, teslim edilmiş kalemler (isteğe bağlı dönem sonu ile). */
async function eligibleItems(db: Executor, supplierId?: string, periodEnd?: Date) {
  return db
    .select({
      id: s.orderItems.id,
      supplierId: s.orderItems.supplierId,
      qty: s.orderItems.qty,
      finalUnitPrice: s.orderItems.finalUnitPrice,
      vatRate: s.orderItems.vatRate,
      commissionBps: s.orderItems.commissionBps,
    })
    .from(s.orderItems)
    .where(
      and(
        eq(s.orderItems.status, 'delivered'),
        isNull(s.orderItems.settlementId),
        supplierId ? eq(s.orderItems.supplierId, supplierId) : undefined,
        periodEnd ? lte(s.orderItems.deliveredAt, periodEnd) : undefined,
      ),
    );
}

/** Onaylanmış, hakedişten henüz düşülmemiş mal kabul iadeleri. */
async function eligibleIssues(db: Executor, supplierId?: string) {
  return db
    .select({ id: s.issues.id, supplierId: s.orderItems.supplierId, creditAmount: s.issues.creditAmount })
    .from(s.issues)
    .innerJoin(s.orderItems, eq(s.orderItems.id, s.issues.orderItemId))
    .where(
      and(
        eq(s.issues.status, 'resolved'),
        isNull(s.issues.settlementId),
        supplierId ? eq(s.orderItems.supplierId, supplierId) : undefined,
      ),
    );
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
    issueDeductions: x.issueDeductions,
    netAmount: x.netAmount,
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
  const items = await eligibleItems(db, sup.id);
  const issues = await eligibleIssues(db, sup.id);
  const t = computeSettlement(items, issues.map((i) => i.creditAmount));
  const rows = await db.query.settlements.findMany({
    where: eq(s.settlements.supplierId, sup.id),
    with: { supplier: true },
    orderBy: [desc(s.settlements.createdAt)],
    limit: 60,
  });
  return {
    pending: { itemCount: t.itemCount, grossSales: t.grossSales, commission: t.commission, issueDeductions: t.issueDeductions, netAmount: t.netAmount },
    iban: sup.iban,
    settlements: rows.map(toDTO),
  };
}

export async function adminPayouts(db: DB): Promise<{ pending: AdminPayoutRowDTO[]; settlements: SettlementDTO[] }> {
  const sups = await db.select().from(s.organizations).where(eq(s.organizations.type, 'supplier'));
  const items = await eligibleItems(db);
  const issues = await eligibleIssues(db);
  const pending = sups
    .map((sp) => {
      const t = computeSettlement(
        items.filter((i) => i.supplierId === sp.id),
        issues.filter((i) => i.supplierId === sp.id).map((i) => i.creditAmount),
      );
      return { supplier: { id: sp.id, name: sp.name, iban: sp.iban }, itemCount: t.itemCount, netAmount: t.netAmount, commission: t.commission };
    })
    .filter((r) => r.itemCount > 0)
    .sort((a, b) => b.netAmount - a.netAmount);
  const rows = await db.query.settlements.findMany({ with: { supplier: true }, orderBy: [desc(s.settlements.createdAt)], limit: 100 });
  return { pending, settlements: rows.map(toDTO) };
}

/**
 * Dönem sonuna kadar teslim edilmiş kalemlerden her tedarikçi için bir hakediş oluşturur.
 * Kalemler `settlement_id IS NULL` koşuluyla atomik olarak sahiplenilir: eşzamanlı iki çağrı
 * aynı kalemi iki hakedişe yazamaz.
 */
export async function createSettlements(db: DB, raw: unknown, actor: Actor) {
  const { periodEnd } = createSettlementsInput.parse(raw);
  if (periodEnd > new Date()) throw badRequest('Dönem sonu gelecekte olamaz');
  const candidates = await eligibleItems(db, undefined, periodEnd);
  const supplierIds = [...new Set(candidates.map((c) => c.supplierId))];
  const created: SettlementDTO[] = [];
  for (const supplierId of supplierIds) {
    const dto = await db.transaction(async (tx) => {
      const [sup] = await tx.select().from(s.organizations).where(eq(s.organizations.id, supplierId));
      const [st] = await tx
        .insert(s.settlements)
        .values({ number: `TMP-${crypto.randomUUID()}`, supplierId, periodEnd, itemCount: 0, grossSales: 0, commission: 0, netAmount: 0, iban: sup.iban })
        .returning();
      const ids = (await eligibleItems(tx, supplierId, periodEnd)).map((i) => i.id);
      const claimed = ids.length
        ? await tx
            .update(s.orderItems)
            .set({ settlementId: st.id })
            .where(and(inArray(s.orderItems.id, ids), isNull(s.orderItems.settlementId)))
            .returning({ qty: s.orderItems.qty, finalUnitPrice: s.orderItems.finalUnitPrice, vatRate: s.orderItems.vatRate, commissionBps: s.orderItems.commissionBps })
        : [];
      if (claimed.length === 0) {
        await tx.delete(s.settlements).where(eq(s.settlements.id, st.id));
        return null;
      }
      const issueIds = (await eligibleIssues(tx, supplierId)).map((i) => i.id);
      const claimedIssues = issueIds.length
        ? await tx
            .update(s.issues)
            .set({ settlementId: st.id })
            .where(and(inArray(s.issues.id, issueIds), isNull(s.issues.settlementId)))
            .returning({ creditAmount: s.issues.creditAmount })
        : [];
      const t = computeSettlement(claimed, claimedIssues.map((i) => i.creditAmount));
      const number = formatSettlementNumber(st.seq, periodEnd.getFullYear());
      const [done] = await tx
        .update(s.settlements)
        .set({ number, itemCount: t.itemCount, grossSales: t.grossSales, commission: t.commission, issueDeductions: t.issueDeductions, netAmount: t.netAmount })
        .where(eq(s.settlements.id, st.id))
        .returning();
      await notify(tx, {
        orgId: supplierId,
        type: 'settlement.created',
        title: `Hakediş oluşturuldu: ${number}`,
        body: `${t.itemCount} teslim edilmiş kalem için ${formatTRY(t.netAmount)} hakedişiniz hazırlandı. Ödeme yapıldığında bilgilendirileceksiniz.`,
        link: `/tedarikci/hakedis/${st.id}`,
      });
      await audit(tx, actor, 'settlement.create', 'settlement', st.id, `${number} · ${sup.name} · ${formatTRY(t.netAmount)}`);
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
      .where(and(eq(s.settlements.id, id), eq(s.settlements.status, 'pending')))
      .returning();
    if (!st) throw badRequest('Hakediş bulunamadı veya zaten ödenmiş');
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
      commissionBps: s.orderItems.commissionBps,
      deliveredAt: s.orderItems.deliveredAt,
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
    .where(eq(s.issues.settlementId, id));
  return {
    ...toDTO(st),
    items: items.map((i) => {
      const net = i.qty * i.finalUnitPrice;
      return {
        id: i.id,
        orderNumber: i.orderNumber,
        member: i.member,
        productName: i.productName,
        unit: i.unit,
        qty: i.qty,
        finalUnitPrice: i.finalUnitPrice,
        vatRate: i.vatRate,
        deliveredAt: i.deliveredAt?.toISOString() ?? null,
        gross: net + Math.round((net * i.vatRate) / 100),
        commission: applyBps(net, i.commissionBps),
      };
    }),
    issues,
  };
}
