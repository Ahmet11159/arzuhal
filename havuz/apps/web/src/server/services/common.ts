import 'server-only';
import { and, asc, eq, gt, inArray, ne, sql, sum } from 'drizzle-orm';
import { nextTier, resolveTier, type OrderStatus, type WaveDTO } from '@havuz/core';
import type { Executor } from '../db/client';
import * as s from '../db/schema';

export const DAY = 86_400_000;
export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

const monthFmt = new Intl.DateTimeFormat('tr-TR', { month: 'short' });
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
/** Son n ayın anahtarları ve kısa Türkçe etiketleri (eskiden yeniye). */
export function lastMonths(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: monthKey(d), label: monthFmt.format(d).replace('.', '') };
  });
}

/** Sipariş alınabilen (açık ve kapanışı geçmemiş) dalga. */
export async function getActiveWave(db: Executor) {
  const [w] = await db
    .select()
    .from(s.waves)
    .where(and(eq(s.waves.status, 'open'), gt(s.waves.cutoffAt, new Date())))
    .orderBy(asc(s.waves.cutoffAt))
    .limit(1);
  return w ?? null;
}

/** Dalgadaki teklif bazlı havuz miktarları (iptal edilen kalemler hariç). */
export async function pooledForWave(db: Executor, waveId: string, offerIds?: string[]) {
  const rows = await db
    .select({ offerId: s.orderItems.offerId, qty: sum(s.orderItems.qty).mapWith(Number) })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .where(
      and(
        eq(s.orders.waveId, waveId),
        ne(s.orderItems.status, 'cancelled'),
        offerIds?.length ? inArray(s.orderItems.offerId, offerIds) : undefined,
      ),
    )
    .groupBy(s.orderItems.offerId);
  return Object.fromEntries(rows.map((r) => [r.offerId, r.qty ?? 0])) as Record<string, number>;
}

export function waveOfferState(offer: { basePrice: number; tiers: { minQty: number; unitPrice: number }[] }, pooledQty: number) {
  const next = nextTier(offer, pooledQty);
  return {
    pooledQty,
    currentPrice: resolveTier(offer, pooledQty).unitPrice,
    next: next ? { minQty: next.minQty, unitPrice: next.unitPrice, remainingQty: next.remainingQty, progress: next.progress } : null,
  };
}

export async function creditBalance(db: Executor, orgId: string) {
  const [r] = await db
    .select({ v: sum(s.ledgerEntries.amount).mapWith(Number) })
    .from(s.ledgerEntries)
    .where(eq(s.ledgerEntries.orgId, orgId));
  return r?.v ?? 0;
}

export async function outstanding(db: Executor, orgId: string) {
  const [r] = await db
    .select({ v: sum(s.orders.total).mapWith(Number) })
    .from(s.orders)
    .where(and(eq(s.orders.memberId, orgId), inArray(s.orders.paymentStatus, ['due', 'overdue'])));
  return r?.v ?? 0;
}

export async function waveStats(db: Executor, waveIds: string[]) {
  if (waveIds.length === 0) return {} as Record<string, { members: number; orders: number; volume: number }>;
  const rows = await db
    .select({
      waveId: s.orders.waveId,
      members: sql<number>`count(distinct ${s.orders.memberId})`.mapWith(Number),
      orders: sql<number>`count(*)`.mapWith(Number),
      volume: sql<number>`coalesce(sum(${s.orders.subtotal} - ${s.orders.waveCredit}), 0)`.mapWith(Number),
    })
    .from(s.orders)
    .where(and(inArray(s.orders.waveId, waveIds), ne(s.orders.status, 'cancelled')))
    .groupBy(s.orders.waveId);
  return Object.fromEntries(rows.map((r) => [r.waveId!, r]));
}

export function toWaveDTO(w: typeof s.waves.$inferSelect, st?: { members: number; orders: number; volume: number }): WaveDTO {
  return {
    id: w.id,
    code: w.code,
    title: w.title,
    region: w.region,
    status: w.status,
    opensAt: w.opensAt.toISOString(),
    cutoffAt: w.cutoffAt.toISOString(),
    deliveryAt: w.deliveryAt.toISOString(),
    memberCount: st?.members ?? 0,
    orderCount: st?.orders ?? 0,
    volume: st?.volume ?? 0,
    totalCredit: w.totalCredit,
  };
}

export async function activeWaveDTO(db: Executor) {
  const w = await getActiveWave(db);
  if (!w) return null;
  const st = await waveStats(db, [w.id]);
  return toWaveDTO(w, st[w.id]);
}

/**
 * Analitik için kalem bazlı olgu tablosu. Demo ölçeğinde JS'te toplanır;
 * büyük ölçekte materialized view / OLAP tablosuna taşınacak tek nokta burasıdır.
 */
export async function itemFacts(db: Executor, opts: { since: Date; memberId?: string; supplierId?: string }) {
  return db
    .select({
      orderId: s.orderItems.orderId,
      memberId: s.orders.memberId,
      supplierId: s.orderItems.supplierId,
      productId: s.orderItems.productId,
      categoryId: s.products.categoryId,
      qty: s.orderItems.qty,
      finalUnitPrice: s.orderItems.finalUnitPrice,
      marketPrice: s.orderItems.marketPrice,
      commissionBps: s.orderItems.commissionBps,
      status: s.orderItems.status,
      createdAt: s.orders.createdAt,
    })
    .from(s.orderItems)
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .where(
      and(
        gt(s.orders.createdAt, opts.since),
        ne(s.orderItems.status, 'cancelled'),
        opts.memberId ? eq(s.orders.memberId, opts.memberId) : undefined,
        opts.supplierId ? eq(s.orderItems.supplierId, opts.supplierId) : undefined,
      ),
    );
}
export type ItemFact = Awaited<ReturnType<typeof itemFacts>>[number];

export const STATUS_STEPS: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

export function median(values: number[]) {
  if (!values.length) return 0;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}
