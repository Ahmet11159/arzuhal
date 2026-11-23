import 'server-only';
import { and, desc, eq, gt, inArray, notInArray, sum } from 'drizzle-orm';
import { trMonthStart, type AccountDTO, type MemberDashboardDTO } from '@havuz/core';
import type { DB } from '../db/client';
import { listRefunds } from './refunds';
import * as s from '../db/schema';
import { notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { activeWaveDTO, DAY, itemFacts, lastMonths, median, monthKey, outstanding } from './common';
import { toOrderSummary } from './orders';

export async function memberDashboard(db: DB, session: SessionPayload): Promise<MemberDashboardDTO> {
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!org) throw notFound('İşletme');
  const now = new Date();
  const since = trMonthStart(now, -5);
  const facts = await itemFacts(db, { since, memberId: org.id });

  const months = lastMonths(6, now);
  const monthly = months.map((m) => ({ month: m.label, spend: 0, savings: 0 }));
  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  for (const f of facts) {
    const i = idx[monthKey(f.createdAt)];
    if (i === undefined) continue;
    monthly[i].spend += f.qty * f.finalUnitPrice;
    monthly[i].savings += f.qty * Math.max(0, f.marketPrice - f.finalUnitPrice);
  }
  const cur = monthly[monthly.length - 1];

  // Kategori dağılımı (son 90 gün)
  const cats = await db.select().from(s.categories);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const d90 = new Date(now.getTime() - 90 * DAY);
  const byCat: Record<string, number> = {};
  for (const f of facts) if (f.createdAt > d90) byCat[f.categoryId] = (byCat[f.categoryId] ?? 0) + f.qty * f.finalUnitPrice;
  const byCategory = Object.entries(byCat)
    .map(([id, spend]) => ({ category: catById[id].name, icon: catById[id].icon, spend }))
    .sort((a, b) => b.spend - a.spend);

  // Fiyat takibi: en çok harcanan 5 ürün, emsal işletmelerin medyan fiyatıyla
  const spendByProduct: Record<string, number> = {};
  for (const f of facts) if (f.createdAt > d90) spendByProduct[f.productId] = (spendByProduct[f.productId] ?? 0) + f.qty * f.finalUnitPrice;
  const top = Object.entries(spendByProduct)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const peerFacts = top.length
    ? await db
        .select({ productId: s.orderItems.productId, price: s.orderItems.finalUnitPrice, memberId: s.orders.memberId })
        .from(s.orderItems)
        .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
        .where(and(inArray(s.orderItems.productId, top), gt(s.orders.createdAt, new Date(now.getTime() - 30 * DAY))))
    : [];
  const prods = top.length ? await db.select().from(s.products).where(inArray(s.products.id, top)) : [];
  const priceWatch = top.map((pid) => {
    const p = prods.find((x) => x.id === pid)!;
    const mine = facts.filter((f) => f.productId === pid).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const peers = peerFacts.filter((x) => x.productId === pid && x.memberId !== org.id).map((x) => x.price);
    return {
      productName: p.name,
      unit: p.unit,
      yourPrice: mine?.finalUnitPrice ?? 0,
      marketPrice: p.marketPrice,
      peerMedian: median(peers) || mine?.finalUnitPrice || 0,
    };
  });

  const lifetime = await itemFacts(db, { since: new Date(0), memberId: org.id });
  const lifetimeSavings = lifetime.reduce((a, f) => a + f.qty * Math.max(0, f.marketPrice - f.finalUnitPrice), 0);

  const recent = await db.query.orders.findMany({
    where: eq(s.orders.memberId, org.id),
    with: { wave: true, items: { with: { product: { with: { category: true } }, supplier: true, issue: true } } },
    orderBy: [desc(s.orders.createdAt)],
    limit: 5,
  });
  const activeOrders = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.memberId, org.id), notInArray(s.orders.status, ['delivered', 'cancelled'])));

  const recentSavings = cur.savings;
  return {
    org: { id: org.id, name: org.name, plan: org.plan, creditLimit: org.creditLimit },
    kpis: {
      monthSpend: cur.spend,
      monthSavings: recentSavings,
      savingRate: cur.spend + recentSavings > 0 ? recentSavings / (cur.spend + recentSavings) : 0,
      lifetimeSavings,
      returnedTotal: await returnedTotal(db, org.id),
      outstanding: await outstanding(db, org.id),
      activeOrders: activeOrders.length,
    },
    monthly,
    byCategory,
    priceWatch,
    openWave: await activeWaveDTO(db),
    recentOrders: recent.map((o) => toOrderSummary(o)),
  };
}

/** Dalga farkı, iptal ve mal kabul iadeleriyle üyeye dönen toplam (eski kredi kullanımları hariç). */
async function returnedTotal(db: DB, orgId: string) {
  const [r] = await db
    .select({ v: sum(s.ledgerEntries.amount).mapWith(Number) })
    .from(s.ledgerEntries)
    .where(and(eq(s.ledgerEntries.orgId, orgId), gt(s.ledgerEntries.amount, 0)));
  return r?.v ?? 0;
}

export async function memberAccount(db: DB, session: SessionPayload): Promise<AccountDTO> {
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!org) throw notFound('İşletme');
  const ledger = await db
    .select()
    .from(s.ledgerEntries)
    .where(eq(s.ledgerEntries.orgId, org.id))
    .orderBy(desc(s.ledgerEntries.createdAt))
    .limit(50);
  const due = await db.query.orders.findMany({
    where: and(eq(s.orders.memberId, org.id), inArray(s.orders.paymentStatus, ['due', 'overdue'])),
    with: { wave: true, items: { with: { product: { with: { category: true } }, supplier: true, issue: true } } },
    orderBy: [s.orders.dueAt],
  });

  // Aylık konsolide fatura özeti ("tek fatura")
  const all = await db
    .select({ createdAt: s.orders.createdAt, total: s.orders.total, vat: s.orders.vat })
    .from(s.orders)
    .where(and(eq(s.orders.memberId, org.id), gt(s.orders.createdAt, new Date(Date.now() - 200 * DAY))));
  const months = lastMonths(6).reverse();
  const invoices = months.map((m) => {
    const rows = all.filter((o) => monthKey(o.createdAt) === m.key);
    return { key: m.key, month: m.label, orderCount: rows.length, total: rows.reduce((a, r) => a + r.total, 0), vat: rows.reduce((a, r) => a + r.vat, 0) };
  });

  return {
    org: {
      id: org.id,
      name: org.name,
      plan: org.plan,
      businessType: org.businessType,
      city: org.city,
      district: org.district,
      taxNo: org.taxNo,
      creditLimit: org.creditLimit,
    },
    returnedTotal: await returnedTotal(db, org.id),
    outstanding: await outstanding(db, org.id),
    ledger: ledger.map((e) => ({ id: e.id, type: e.type, amount: e.amount, description: e.description, createdAt: e.createdAt.toISOString() })),
    refunds: await listRefunds(db, { orgId: org.id, limit: 50 }),
    dueOrders: due.map((o) => toOrderSummary(o)),
    invoices,
  };
}
