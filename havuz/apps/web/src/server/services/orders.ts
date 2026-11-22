import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import {
  canTransition,
  computeOrderTotals,
  createOrderInput,
  deriveOrderStatus,
  dueDate,
  formatOrderNumber,
  isTermAllowed,
  resolveTier,
  type ItemStatus,
  type OrderDetailDTO,
  type OrderStatus,
  type OrderSummaryDTO,
  type ReportIssueInput,
} from '@havuz/core';
import type { z } from 'zod';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { AppError, badRequest, forbidden, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { creditBalance, getActiveWave, iso, outstanding, pooledForWave, STATUS_STEPS } from './common';

type OrderRow = typeof s.orders.$inferSelect & {
  wave: typeof s.waves.$inferSelect | null;
  member?: typeof s.organizations.$inferSelect;
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
        ? { id: i.issue.id, type: i.issue.type, status: i.issue.status, qty: i.issue.qty, note: i.issue.note, creditAmount: i.issue.creditAmount }
        : null,
    })),
  };
}

async function loadOrder(db: Executor, id: string) {
  const o = await db.query.orders.findFirst({ where: eq(s.orders.id, id), with: orderWith });
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
    o.items = o.items.filter((i) => i.supplierId === session.org);
  }
  return toOrderDetail(o);
}

export async function createOrder(db: DB, session: SessionPayload, raw: unknown): Promise<OrderDetailDTO> {
  const input = createOrderInput.parse(raw) as z.output<typeof createOrderInput>;

  // Aynı teklif birden fazla satırda gelirse birleştir.
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.offerId, (merged.get(it.offerId) ?? 0) + it.qty);

  const orderId = await db.transaction(async (tx) => {
    const member = await tx.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
    if (!member || member.type !== 'member') throw forbidden();
    if (!isTermAllowed(member.plan, input.paymentTerm)) {
      throw badRequest('60 gün vade yalnızca Pro üyelerde kullanılabilir');
    }

    const offerRows = await tx.query.offers.findMany({
      where: inArray(s.offers.id, [...merged.keys()]),
      with: { product: true, supplier: true },
    });
    if (offerRows.length !== merged.size) throw badRequest('Sepetteki bazı ürünler artık mevcut değil');

    let waveId: string | null = null;
    let pooled: Record<string, number> = {};
    if (input.waveId) {
      const wave = await getActiveWave(tx);
      if (!wave || wave.id !== input.waveId) throw badRequest('Bu dalga siparişe kapandı');
      waveId = wave.id;
      pooled = await pooledForWave(tx, wave.id, [...merged.keys()]);
    }

    const lines = offerRows.map((o) => {
      const qty = merged.get(o.id)!;
      if (!o.active) throw badRequest(`${o.product.name} şu an satışta değil`);
      if (o.stock < qty) throw badRequest(`${o.product.name} için yeterli stok yok (en fazla ${o.stock} ${o.product.unit})`);
      // Dalgada üyenin kendi miktarı da havuza dahil edilir → anında kademe avantajı.
      const unitPrice = resolveTier(o, (waveId ? pooled[o.id] ?? 0 : 0) + qty).unitPrice;
      return { o, qty, unitPrice };
    });

    const balance = await creditBalance(tx, member.id);
    const totals = computeOrderTotals(
      lines.map((l) => ({ qty: l.qty, unitPrice: l.unitPrice, marketPrice: l.o.product.marketPrice, vatRate: l.o.product.vatRate })),
      { plan: member.plan, term: input.paymentTerm, availableCredit: balance, useCredit: input.useCredit },
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
        paymentStatus: input.paymentTerm === 'cash' || totals.total === 0 ? 'paid' : 'due',
        dueAt: input.paymentTerm === 'cash' ? null : dueDate(now, input.paymentTerm),
        paidAt: input.paymentTerm === 'cash' ? now : null,
        subtotal: totals.subtotal,
        vat: totals.vat,
        financingFee: totals.financingFee,
        creditApplied: totals.creditApplied,
        total: totals.total,
        marketTotal: totals.marketTotal,
        note: input.note ?? null,
        createdAt: now,
      })
      .returning({ id: s.orders.id, seq: s.orders.seq });
    await tx
      .update(s.orders)
      .set({ number: formatOrderNumber(order.seq, now.getFullYear()) })
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
      await tx
        .update(s.offers)
        .set({ stock: sql`${s.offers.stock} - ${l.qty}` })
        .where(eq(s.offers.id, l.o.id));
    }

    if (totals.creditApplied > 0) {
      await tx.insert(s.ledgerEntries).values({
        orgId: member.id,
        type: 'credit_used',
        amount: -totals.creditApplied,
        description: `${formatOrderNumber(order.seq, now.getFullYear())} siparişinde kullanıldı`,
        refId: order.id,
      });
    }
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
  await db.transaction(async (tx) => {
    const item = await tx.query.orderItems.findFirst({ where: eq(s.orderItems.id, itemId) });
    if (!item) throw notFound('Kalem');
    if (session.role === 'supplier' && item.supplierId !== session.org) throw notFound('Kalem');
    if (!canTransition(item.status, to)) throw badRequest('Bu durum geçişine izin verilmiyor');
    await tx.update(s.orderItems).set({ status: to, updatedAt: new Date() }).where(eq(s.orderItems.id, itemId));
    if (to === 'cancelled') {
      await tx
        .update(s.offers)
        .set({ stock: sql`${s.offers.stock} + ${item.qty}` })
        .where(eq(s.offers.id, item.offerId));
    }
    await syncOrderStatus(tx, item.orderId);
  });
}

/** Üye "teslim aldım" der: yoldaki tüm kalemler teslim edilmiş sayılır. */
export async function confirmDelivery(db: DB, session: SessionPayload, orderId: string) {
  await db.transaction(async (tx) => {
    const o = await tx.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
    if (!o || o.memberId !== session.org) throw notFound('Sipariş');
    const r = await tx
      .update(s.orderItems)
      .set({ status: 'delivered', updatedAt: new Date() })
      .where(and(eq(s.orderItems.orderId, orderId), eq(s.orderItems.status, 'shipped')))
      .returning({ id: s.orderItems.id });
    if (r.length === 0) throw badRequest('Teslim alınacak (yolda) ürün yok');
    await syncOrderStatus(tx, orderId);
  });
}

export async function reportIssue(db: DB, session: SessionPayload, orderId: string, itemId: string, input: ReportIssueInput) {
  const item = await db.query.orderItems.findFirst({
    where: and(eq(s.orderItems.id, itemId), eq(s.orderItems.orderId, orderId)),
    with: { order: true, issue: true },
  });
  if (!item || item.order.memberId !== session.org) throw notFound('Kalem');
  if (item.status !== 'delivered') throw badRequest('Sorun bildirimi yalnızca teslim edilen ürünler için yapılabilir');
  if (item.issue) throw badRequest('Bu ürün için zaten bir bildirim var');
  if (input.qty > item.qty) throw badRequest(`En fazla ${item.qty} adet bildirebilirsiniz`);
  await db.insert(s.issues).values({ orderItemId: itemId, type: input.type, qty: input.qty, note: input.note ?? null });
}

export async function payOrder(db: DB, session: SessionPayload, orderId: string) {
  const r = await db
    .update(s.orders)
    .set({ paymentStatus: 'paid', paidAt: new Date() })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.memberId, session.org), inArray(s.orders.paymentStatus, ['due', 'overdue'])))
    .returning({ id: s.orders.id });
  if (r.length === 0) throw badRequest('Ödenecek bir bakiye bulunamadı');
}
