import 'server-only';
import { and, count, desc, eq, gt, inArray, sql, sum } from 'drizzle-orm';
import {
  computeRevenue,
  resolveIssueInput,
  type AdminIssueDTO,
  type AdminMemberDTO,
  type AdminOverviewDTO,
  type AdminSupplierDTO,
  type LeadDTO,
} from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import { activeWaveDTO, DAY, itemFacts, lastMonths, monthKey, type ItemFact } from './common';
import { audit, type Actor } from '../audit';
import { notify } from '../notify';
import { formatTRY, computeSettlement } from '@havuz/core';
import { isNull } from 'drizzle-orm';

const volume = (fs: ItemFact[]) => fs.reduce((a, f) => a + f.qty * f.finalUnitPrice, 0);
const commission = (fs: ItemFact[]) => fs.reduce((a, f) => a + Math.round((f.qty * f.finalUnitPrice * f.commissionBps) / 10_000), 0);

export async function adminOverview(db: DB): Promise<AdminOverviewDTO> {
  const now = new Date();
  const facts = await itemFacts(db, { since: new Date(now.getFullYear(), now.getMonth() - 5, 1) });
  const d30 = new Date(now.getTime() - 30 * DAY);
  const d60 = new Date(now.getTime() - 60 * DAY);
  const last30 = facts.filter((f) => f.createdAt > d30);
  const prev30 = facts.filter((f) => f.createdAt > d60 && f.createdAt <= d30);

  const orders6 = await db
    .select({ createdAt: s.orders.createdAt, financingFee: s.orders.financingFee })
    .from(s.orders)
    .where(gt(s.orders.createdAt, new Date(now.getFullYear(), now.getMonth() - 5, 1)));
  const subs6 = await db
    .select({ periodStart: s.subscriptions.periodStart, amount: s.subscriptions.amount })
    .from(s.subscriptions)
    .where(gt(s.subscriptions.periodStart, new Date(now.getFullYear(), now.getMonth() - 6, 1)));
  const [sp] = await db.select({ v: sum(s.offers.sponsoredFee).mapWith(Number) }).from(s.offers).where(eq(s.offers.sponsored, true));
  const sponsoredMonthly = sp?.v ?? 0;
  const [pro] = await db.select({ n: count() }).from(s.organizations).where(and(eq(s.organizations.type, 'member'), eq(s.organizations.plan, 'pro')));

  const revenue = computeRevenue({
    volumeBySupplier: [{ volume: 0, commissionBps: 0 }],
    proMembers: pro.n,
    months: 1,
    financingFees: orders6.filter((o) => o.createdAt > d30).reduce((a, o) => a + o.financingFee, 0),
    sponsoredFees: sponsoredMonthly,
  });
  revenue.commission = commission(last30);
  revenue.total = revenue.commission + revenue.subscriptions + revenue.financing + revenue.sponsored;

  const months = lastMonths(6, now);
  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  const monthly = months.map((m) => ({ month: m.label, gmv: 0, revenue: 0 }));
  for (const f of facts) {
    const i = idx[monthKey(f.createdAt)];
    if (i === undefined) continue;
    const v = f.qty * f.finalUnitPrice;
    monthly[i].gmv += v;
    monthly[i].revenue += Math.round((v * f.commissionBps) / 10_000);
  }
  for (const o of orders6) {
    const i = idx[monthKey(o.createdAt)];
    if (i !== undefined) monthly[i].revenue += Math.round(o.financingFee * 0.4);
  }
  for (const sb of subs6) {
    const i = idx[monthKey(sb.periodStart)];
    if (i !== undefined) monthly[i].revenue += sb.amount;
  }
  for (const m of monthly) m.revenue += sponsoredMonthly;

  const cats = await db.select().from(s.categories);
  const byCat: Record<string, number> = {};
  for (const f of last30) byCat[f.categoryId] = (byCat[f.categoryId] ?? 0) + f.qty * f.finalUnitPrice;
  const byCategory = cats.map((c) => ({ category: c.name, gmv: byCat[c.id] ?? 0 })).sort((a, b) => b.gmv - a.gmv);

  const members = await db.select().from(s.organizations).where(eq(s.organizations.type, 'member'));
  const mAgg: Record<string, { gmv: number; savings: number }> = {};
  for (const f of last30) {
    const a = (mAgg[f.memberId] ??= { gmv: 0, savings: 0 });
    a.gmv += f.qty * f.finalUnitPrice;
    a.savings += f.qty * Math.max(0, f.marketPrice - f.finalUnitPrice);
  }
  const topMembers = members
    .map((m) => ({ id: m.id, name: m.name, district: m.district, gmv: mAgg[m.id]?.gmv ?? 0, savings: mAgg[m.id]?.savings ?? 0 }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 6);

  const [suppliers] = await db.select({ n: count() }).from(s.organizations).where(eq(s.organizations.type, 'supplier'));
  const [openIssues] = await db.select({ n: count() }).from(s.issues).where(eq(s.issues.status, 'open'));
  const [newLeads] = await db.select({ n: count() }).from(s.leads).where(gt(s.leads.createdAt, new Date(now.getTime() - 14 * DAY)));
  const gmv30 = volume(last30);
  const gmvPrev = volume(prev30);

  return {
    kpis: {
      gmvMonth: gmv30,
      gmvGrowth: gmvPrev ? (gmv30 - gmvPrev) / gmvPrev : 0,
      revenueMonth: revenue.total,
      activeMembers: new Set(last30.map((f) => f.memberId)).size,
      totalMembers: members.length,
      suppliers: suppliers.n,
      memberSavingsMonth: last30.reduce((a, f) => a + f.qty * Math.max(0, f.marketPrice - f.finalUnitPrice), 0),
      openIssues: openIssues.n,
      newLeads: newLeads.n,
    },
    revenue,
    monthly,
    byCategory,
    openWave: await activeWaveDTO(db),
    topMembers,
  };
}

export async function adminMembers(db: DB): Promise<AdminMemberDTO[]> {
  const members = await db.select().from(s.organizations).where(eq(s.organizations.type, 'member'));
  const d90 = new Date(Date.now() - 90 * DAY);
  const agg = await db
    .select({
      memberId: s.orders.memberId,
      gmv: sql<number>`coalesce(sum(case when ${s.orders.createdAt} > ${d90} then ${s.orders.subtotal} - ${s.orders.waveCredit} else 0 end), 0)`.mapWith(Number),
      orders: sql<number>`count(*)`.mapWith(Number),
      last: sql<Date>`max(${s.orders.createdAt})`,
      open: sql<number>`coalesce(sum(case when ${s.orders.paymentStatus} in ('due','overdue') then ${s.orders.total} else 0 end), 0)`.mapWith(Number),
    })
    .from(s.orders)
    .groupBy(s.orders.memberId);
  const a = Object.fromEntries(agg.map((r) => [r.memberId, r]));
  return members
    .map((m) => ({
      id: m.id,
      name: m.name,
      businessType: m.businessType,
      city: m.city,
      district: m.district,
      plan: m.plan,
      creditLimit: m.creditLimit,
      outstanding: a[m.id]?.open ?? 0,
      gmv90: a[m.id]?.gmv ?? 0,
      orderCount: a[m.id]?.orders ?? 0,
      lastOrderAt: a[m.id]?.last ? new Date(a[m.id].last).toISOString() : null,
      joinedAt: m.createdAt.toISOString(),
      active: m.active,
      taxNo: m.taxNo,
      email: m.email,
      phone: m.phone,
    }))
    .sort((x, y) => y.gmv90 - x.gmv90);
}

export async function adminSuppliers(db: DB): Promise<AdminSupplierDTO[]> {
  const sups = await db.select().from(s.organizations).where(eq(s.organizations.type, 'supplier'));
  const d90 = new Date(Date.now() - 90 * DAY);
  const facts = await itemFacts(db, { since: d90 });
  const offerCounts = await db.select({ supplierId: s.offers.supplierId, n: count() }).from(s.offers).groupBy(s.offers.supplierId);
  const issueCounts = await db
    .select({ supplierId: s.orderItems.supplierId, n: count() })
    .from(s.issues)
    .innerJoin(s.orderItems, eq(s.orderItems.id, s.issues.orderItemId))
    .where(gt(s.issues.createdAt, d90))
    .groupBy(s.orderItems.supplierId);
  const oc = Object.fromEntries(offerCounts.map((r) => [r.supplierId, r.n]));
  const ic = Object.fromEntries(issueCounts.map((r) => [r.supplierId, r.n]));
  const unsettled = await db
    .select({ supplierId: s.orderItems.supplierId, qty: s.orderItems.qty, finalUnitPrice: s.orderItems.finalUnitPrice, vatRate: s.orderItems.vatRate, commissionBps: s.orderItems.commissionBps })
    .from(s.orderItems)
    .where(and(eq(s.orderItems.status, 'delivered'), isNull(s.orderItems.settlementId)));
  return sups
    .map((x) => ({
      id: x.id,
      name: x.name,
      city: `${x.district ?? ''}${x.district ? ', ' : ''}${x.city}`,
      rating: x.rating,
      onTimeRate: x.onTimeRate,
      commissionBps: x.commissionBps,
      offerCount: oc[x.id] ?? 0,
      gmv90: volume(facts.filter((f) => f.supplierId === x.id)),
      issueCount: ic[x.id] ?? 0,
      active: x.active,
      iban: x.iban,
      email: x.email,
      phone: x.phone,
      district: x.district,
      pendingPayout: computeSettlement(unsettled.filter((u) => u.supplierId === x.id)).netAmount,
    }))
    .sort((p, q) => q.gmv90 - p.gmv90);
}

export async function adminIssues(db: DB): Promise<AdminIssueDTO[]> {
  const rows = await db
    .select({
      issue: s.issues,
      orderNumber: s.orders.number,
      orderId: s.orders.id,
      member: s.organizations.name,
      supplierId: s.orderItems.supplierId,
      productName: s.products.name,
      unitPrice: s.orderItems.finalUnitPrice,
      vatRate: s.orderItems.vatRate,
    })
    .from(s.issues)
    .innerJoin(s.orderItems, eq(s.orderItems.id, s.issues.orderItemId))
    .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.orders.memberId))
    .innerJoin(s.products, eq(s.products.id, s.orderItems.productId))
    .orderBy(sql`case ${s.issues.status} when 'open' then 0 else 1 end`, desc(s.issues.createdAt))
    .limit(100);
  const supIds = [...new Set(rows.map((r) => r.supplierId))];
  const sups = supIds.length ? await db.select({ id: s.organizations.id, name: s.organizations.name }).from(s.organizations).where(inArray(s.organizations.id, supIds)) : [];
  const supName = Object.fromEntries(sups.map((x) => [x.id, x.name]));
  return rows.map((r) => ({
    id: r.issue.id,
    type: r.issue.type,
    status: r.issue.status,
    qty: r.issue.qty,
    note: r.issue.note,
    creditAmount: r.issue.creditAmount,
    createdAt: r.issue.createdAt.toISOString(),
    orderNumber: r.orderNumber,
    orderId: r.orderId,
    member: r.member,
    supplier: supName[r.supplierId],
    productName: r.productName,
    unitPrice: r.unitPrice,
    vatRate: r.vatRate,
    photo: r.issue.photo,
  }));
}

/** Sorun çözümü: onaylanırsa üyeye kredi yazılır (varsayılan: KDV dahil kalem bedeli). */
export async function resolveIssue(db: DB, id: string, raw: unknown, actor: Actor = {}) {
  const input = resolveIssueInput.parse(raw);
  await db.transaction(async (tx) => {
    // Satır kilidi: aynı bildirimin iki kez onaylanıp iki kez kredi yazılması engellenir.
    await tx.select({ id: s.issues.id }).from(s.issues).where(eq(s.issues.id, id)).for('update');
    const issue = await tx.query.issues.findFirst({ where: eq(s.issues.id, id), with: { item: { with: { order: true } } } });
    if (!issue) throw notFound('Bildirim');
    if (issue.status !== 'open') throw badRequest('Bildirim zaten sonuçlandırıldı');
    const it = issue.item;
    const credit =
      input.status === 'resolved' ? input.creditAmount ?? Math.round(issue.qty * it.finalUnitPrice * (1 + it.vatRate / 100)) : 0;
    await tx.update(s.issues).set({ status: input.status, creditAmount: credit, resolvedAt: new Date() }).where(eq(s.issues.id, id));
    if (credit > 0) {
      await tx.insert(s.ledgerEntries).values({
        orgId: it.order.memberId,
        type: 'issue_credit',
        amount: credit,
        description: `${it.order.number} mal kabul iadesi`,
        refId: it.order.id,
      });
    }
    await notify(tx, {
      orgId: it.order.memberId,
      type: `issue.${input.status}`,
      title: input.status === 'resolved' ? `Bildiriminiz onaylandı: ${formatTRY(credit)} iade` : 'Mal kabul bildiriminiz reddedildi',
      body:
        input.status === 'resolved'
          ? `${it.order.number} için iade kredi bakiyenize eklendi.`
          : `${it.order.number} için yaptığınız bildirim incelendi ve reddedildi. Sorularınız için destek ekibine yazabilirsiniz.`,
      link: `/uye/siparisler/${it.order.id}`,
      email: true,
    });
    if (credit > 0) {
      await notify(tx, {
        orgId: it.supplierId,
        type: 'issue.deduction',
        title: `Mal kabul iadesi: ${formatTRY(credit)}`,
        body: `${it.order.number} için onaylanan iade bir sonraki hakedişinizden düşülecek.`,
        link: '/tedarikci/hakedis',
      });
    }
    await audit(tx, actor, `issue.${input.status}`, 'issue', id, `${it.order.number} bildirimi ${input.status === 'resolved' ? `onaylandı (${formatTRY(credit)})` : 'reddedildi'}`);
  });
}

export async function adminLeads(db: DB): Promise<LeadDTO[]> {
  const rows = await db.select().from(s.leads).orderBy(desc(s.leads.createdAt)).limit(100);
  return rows.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));
}
