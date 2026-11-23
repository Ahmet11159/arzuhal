import 'server-only';
import { and, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { formatTRY, trMonthStart, updateOfferInput, type SupplierDashboardDTO, type SupplierOfferDTO, type SupplierOrderItemDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { DAY, getActiveWave, itemFacts, lastMonths, monthKey, pooledForWave } from './common';
import { audit, type Actor } from '../audit';
import { marketplaceEnabled } from '../payments';

export async function supplierItems(db: DB, session: SessionPayload): Promise<SupplierOrderItemDTO[]> {
  const rows = await db
    .select({
      id: s.orderItems.id,
      orderId: s.orders.id,
      orderNumber: s.orders.number,
      memberId: s.organizations.id,
      memberName: s.organizations.name,
      district: s.organizations.district,
      productName: s.products.name,
      unit: s.products.unit,
      categoryIcon: s.categories.icon,
      qty: s.orderItems.qty,
      unitPrice: s.orderItems.finalUnitPrice,
      status: s.orderItems.status,
      createdAt: s.orders.createdAt,
      waveCode: s.waves.code,
      waveDelivery: s.waves.deliveryAt,
      paymentStatus: s.orders.paymentStatus,
      deliveredAt: s.orderItems.deliveredAt,
      releasedAt: s.orderItems.releasedAt,
      settlementId: s.orderItems.settlementId,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.orders.memberId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .leftJoin(s.waves, eq(s.waves.id, s.orders.waveId))
    // Ödemesi beklenen peşin siparişler tedarikçiye gösterilmez.
    .where(and(eq(s.orderItems.supplierId, session.org), ne(s.orders.paymentStatus, 'unpaid'), gt(s.orders.createdAt, new Date(Date.now() - 45 * DAY))))
    .orderBy(
      sql`case ${s.orderItems.status} when 'pending' then 0 when 'confirmed' then 1 when 'shipped' then 2 else 3 end`,
      desc(s.orders.createdAt),
    )
    .limit(300);
  const orderIds = [...new Set(rows.map((r) => r.orderId))];
  const invoiced = new Set(
    orderIds.length
      ? (await db.select({ orderId: s.invoices.orderId }).from(s.invoices).where(and(eq(s.invoices.supplierId, session.org), inArray(s.invoices.orderId, orderIds)))).map((r) => r.orderId)
      : [],
  );
  const market = marketplaceEnabled();
  const payoutStatus = (r: (typeof rows)[number]): SupplierOrderItemDTO['payoutStatus'] => {
    if (r.status === 'cancelled') return 'cancelled';
    if (r.settlementId) return 'settled';
    if (r.releasedAt) return 'released';
    if (r.status === 'delivered') return market && r.paymentStatus !== 'paid' ? 'awaiting_payment' : 'objection_period';
    return market && r.paymentStatus !== 'paid' ? 'awaiting_payment' : 'in_progress';
  };
  return rows.map((r) => ({
    payoutStatus: payoutStatus(r),
    invoiceUploaded: invoiced.has(r.orderId),
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    member: { id: r.memberId, name: r.memberName, district: r.district },
    productName: r.productName,
    unit: r.unit,
    categoryIcon: r.categoryIcon,
    qty: r.qty,
    unitPrice: r.unitPrice,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    wave: r.waveCode ? { code: r.waveCode, deliveryAt: r.waveDelivery!.toISOString() } : null,
  }));
}

export async function supplierOffers(db: DB, session: SessionPayload): Promise<SupplierOfferDTO[]> {
  const offers = await db.query.offers.findMany({
    where: eq(s.offers.supplierId, session.org),
    with: { product: { with: { category: true } } },
  });
  const wave = await getActiveWave(db);
  const pooled = wave ? await pooledForWave(db, wave.id, offers.map((o) => o.id)) : {};
  const last30 = offers.length
    ? await db
        .select({ offerId: s.orderItems.offerId, qty: sql<number>`sum(${s.orderItems.qty})`.mapWith(Number) })
        .from(s.orderItems)
        .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
        .where(and(inArray(s.orderItems.offerId, offers.map((o) => o.id)), gt(s.orders.createdAt, new Date(Date.now() - 30 * DAY))))
        .groupBy(s.orderItems.offerId)
    : [];
  const l30 = Object.fromEntries(last30.map((r) => [r.offerId, r.qty]));
  return offers
    .map((o) => ({
      id: o.id,
      product: {
        id: o.product.id,
        name: o.product.name,
        unit: o.product.unit,
        packLabel: o.product.packLabel,
        categoryIcon: o.product.category.icon,
        marketPrice: o.product.marketPrice,
      },
      basePrice: o.basePrice,
      tiers: o.tiers,
      stock: o.stock,
      leadTimeDays: o.leadTimeDays,
      active: o.active,
      sponsored: o.sponsored,
      pooledQty: pooled[o.id] ?? 0,
      last30Qty: l30[o.id] ?? 0,
    }))
    .sort((a, b) => b.last30Qty - a.last30Qty);
}

export async function updateOffer(db: DB, session: SessionPayload, id: string, raw: unknown, actor: Actor = {}) {
  const input = updateOfferInput.parse(raw);
  const offer = await db.query.offers.findFirst({ where: and(eq(s.offers.id, id), eq(s.offers.supplierId, session.org)) });
  if (!offer) throw notFound('Teklif');
  const base = input.basePrice ?? offer.basePrice;
  const tiers = (input.tiers ?? offer.tiers).sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].unitPrice >= base) throw badRequest('Kademe fiyatları taban fiyattan düşük olmalı');
    if (i > 0 && tiers[i].unitPrice >= tiers[i - 1].unitPrice) throw badRequest('Her kademe bir öncekinden ucuz olmalı');
    if (i > 0 && tiers[i].minQty === tiers[i - 1].minQty) throw badRequest('Aynı eşikte iki kademe olamaz');
  }
  await db.transaction(async (tx) => {
    await tx
      .update(s.offers)
      .set({ ...input, tiers, updatedAt: new Date() })
      .where(eq(s.offers.id, id));
    const changes = Object.entries(input)
      .map(([k, v]) => (k === 'basePrice' ? `taban ${formatTRY(v as number)}` : k === 'tiers' ? 'kademeler' : k === 'active' ? (v ? 'satışa açıldı' : 'satıştan kaldırıldı') : k))
      .join(', ');
    await audit(tx, { ...actor, userId: session.sub, orgId: session.org }, 'offer.update', 'offer', id, `Teklif güncellendi: ${changes}`);
  });
}

export async function supplierDashboard(db: DB, session: SessionPayload): Promise<SupplierDashboardDTO> {
  const sup = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!sup) throw notFound('Tedarikçi');
  const now = new Date();
  const facts = await itemFacts(db, { since: trMonthStart(now, -5), supplierId: sup.id });
  const months = lastMonths(6, now);
  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  const monthly = months.map((m) => ({ month: m.label, revenue: 0 }));
  for (const f of facts) {
    const i = idx[monthKey(f.createdAt)];
    if (i !== undefined) monthly[i].revenue += f.qty * f.finalUnitPrice;
  }

  const d30 = new Date(now.getTime() - 30 * DAY);
  const recent = facts.filter((f) => f.createdAt > d30);
  const statusCounts = await db
    .select({ status: s.orderItems.status, n: sql<number>`count(*)`.mapWith(Number) })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(and(eq(s.orderItems.supplierId, sup.id), ne(s.orders.paymentStatus, 'unpaid')))
    .groupBy(s.orderItems.status);
  const sc = Object.fromEntries(statusCounts.map((r) => [r.status, r.n]));

  const d90 = new Date(now.getTime() - 90 * DAY);
  const [issueRow] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(s.issues)
    .innerJoin(s.orderItems, eq(s.orderItems.id, s.issues.orderItemId))
    .where(and(eq(s.orderItems.supplierId, sup.id), gt(s.issues.createdAt, d90)));
  const items90 = facts.filter((f) => f.createdAt > d90).length;

  // Ürün bazlı: son 30 gün ve açık dalga tahmini
  const prodIds = [...new Set(facts.map((f) => f.productId))];
  const prods = prodIds.length ? await db.select().from(s.products).where(inArray(s.products.id, prodIds)) : [];
  const pById = Object.fromEntries(prods.map((p) => [p.id, p]));
  const agg: Record<string, { qty: number; revenue: number }> = {};
  for (const f of recent) {
    const a = (agg[f.productId] ??= { qty: 0, revenue: 0 });
    a.qty += f.qty;
    a.revenue += f.qty * f.finalUnitPrice;
  }
  const topProducts = Object.entries(agg)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 6)
    .map(([pid, a]) => ({ productName: pById[pid].name, qty: a.qty, revenue: a.revenue }));

  const wave = await getActiveWave(db);
  let forecast: SupplierDashboardDTO['forecast'] = [];
  if (wave) {
    const offers = await db.query.offers.findMany({ where: eq(s.offers.supplierId, sup.id), with: { product: true } });
    const pooled = await pooledForWave(db, wave.id, offers.map((o) => o.id));
    const span = wave.cutoffAt.getTime() - wave.opensAt.getTime();
    const elapsed = Math.min(1, Math.max(0.15, (now.getTime() - wave.opensAt.getTime()) / span));
    forecast = offers
      .map((o) => ({
        productName: o.product.name,
        unit: o.product.unit,
        pooledQty: pooled[o.id] ?? 0,
        projectedQty: Math.round((pooled[o.id] ?? 0) / elapsed),
      }))
      .filter((f) => f.pooledQty > 0)
      .sort((a, b) => b.projectedQty - a.projectedQty)
      .slice(0, 6);
  }

  return {
    supplier: { id: sup.id, name: sup.name, rating: sup.rating, onTimeRate: sup.onTimeRate, commissionBps: sup.commissionBps },
    kpis: {
      monthRevenue: recent.reduce((a, f) => a + f.qty * f.finalUnitPrice, 0),
      pendingItems: sc.pending ?? 0,
      toShipItems: sc.confirmed ?? 0,
      activeMembers: new Set(recent.map((f) => f.memberId)).size,
      issueRate: items90 ? (issueRow?.n ?? 0) / items90 : 0,
    },
    monthly,
    forecast,
    topProducts,
  };
}
