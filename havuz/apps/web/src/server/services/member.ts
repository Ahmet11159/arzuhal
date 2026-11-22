import 'server-only';
import { and, desc, eq, gt, inArray, notInArray, sql } from 'drizzle-orm';
import { PRO_MONTHLY_FEE, type AccountDTO, type MemberDashboardDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { activeWaveDTO, creditBalance, DAY, itemFacts, lastMonths, median, monthKey, outstanding } from './common';
import { toOrderSummary } from './orders';

export async function memberDashboard(db: DB, session: SessionPayload): Promise<MemberDashboardDTO> {
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!org) throw notFound('İşletme');
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
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

  const credit = await creditBalance(db, org.id);
  const recentSavings = cur.savings;
  return {
    org: { id: org.id, name: org.name, plan: org.plan, creditLimit: org.creditLimit },
    kpis: {
      monthSpend: cur.spend,
      monthSavings: recentSavings,
      savingRate: cur.spend + recentSavings > 0 ? recentSavings / (cur.spend + recentSavings) : 0,
      lifetimeSavings,
      creditBalance: credit,
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
    return { month: m.label, orderCount: rows.length, total: rows.reduce((a, r) => a + r.total, 0), vat: rows.reduce((a, r) => a + r.vat, 0) };
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
    creditBalance: await creditBalance(db, org.id),
    outstanding: await outstanding(db, org.id),
    ledger: ledger.map((e) => ({ id: e.id, type: e.type, amount: e.amount, description: e.description, createdAt: e.createdAt.toISOString() })),
    dueOrders: due.map((o) => toOrderSummary(o)),
    invoices,
  };
}

export async function upgradeToPro(db: DB, session: SessionPayload) {
  await db.transaction(async (tx) => {
    // Koşullu güncelleme: yalnızca 'free' plandan geçiş yapılır; çift tıklama iki abonelik yazmaz.
    const [org] = await tx
      .update(s.organizations)
      .set({ plan: 'pro', creditLimit: sql`greatest(${s.organizations.creditLimit}, 25000000)` })
      .where(and(eq(s.organizations.id, session.org), eq(s.organizations.type, 'member'), eq(s.organizations.plan, 'free')))
      .returning({ id: s.organizations.id });
    if (!org) throw badRequest('Zaten Pro üyesiniz');
    const now = new Date();
    await tx.insert(s.subscriptions).values({ orgId: org.id, amount: PRO_MONTHLY_FEE, periodStart: new Date(now.getFullYear(), now.getMonth(), 1) });
  });
}
