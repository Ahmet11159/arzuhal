import 'server-only';
import { and, eq, gte, lt, ne } from 'drizzle-orm';
import type { StatementDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';

const monthLabel = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

/**
 * Aylık konsolide hesap özeti: tüm tedarikçilerden alımlar tek belgede, KDV oranına göre dağılım.
 * Resmî e-Fatura, entegratör bağlantısıyla bu verilerden üretilir.
 */
export async function memberStatement(db: DB, session: SessionPayload, month: string): Promise<StatementDTO> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw badRequest('Ay YYYY-AA biçiminde olmalı');
  const [y, m] = month.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  if (!org) throw notFound('İşletme');
  const orders = await db.query.orders.findMany({
    where: and(eq(s.orders.memberId, org.id), gte(s.orders.createdAt, from), lt(s.orders.createdAt, to), ne(s.orders.status, 'cancelled')),
    with: { items: { with: { product: true, supplier: true } } },
    orderBy: (o, { asc }) => [asc(o.createdAt)],
  });
  const vatMap = new Map<number, { base: number; vat: number }>();
  const outOrders = orders
    .filter((o) => o.paymentStatus !== 'unpaid')
    .map((o) => {
      const lines = o.items
        .filter((i) => i.status !== 'cancelled')
        .map((i) => {
          const net = i.qty * i.unitPrice;
          const vat = Math.round((net * i.vatRate) / 100);
          const v = vatMap.get(i.vatRate) ?? { base: 0, vat: 0 };
          v.base += net;
          v.vat += vat;
          vatMap.set(i.vatRate, v);
          return { productName: i.product.name, supplier: i.supplier.name, qty: i.qty, unit: i.product.unit, unitPrice: i.unitPrice, vatRate: i.vatRate, net, vat };
        });
      return {
        number: o.number,
        date: o.createdAt.toISOString(),
        paymentTerm: o.paymentTerm,
        lines,
        subtotal: lines.reduce((a, l) => a + l.net, 0),
        vat: lines.reduce((a, l) => a + l.vat, 0),
        financingFee: o.financingFee,
        creditApplied: o.creditApplied,
        total: o.total,
      };
    });
  const credits = await db
    .select({ amount: s.ledgerEntries.amount })
    .from(s.ledgerEntries)
    .where(and(eq(s.ledgerEntries.orgId, org.id), eq(s.ledgerEntries.type, 'wave_rebate'), gte(s.ledgerEntries.createdAt, from), lt(s.ledgerEntries.createdAt, to)));
  const sum = (f: (o: (typeof outOrders)[number]) => number) => outOrders.reduce((a, o) => a + f(o), 0);
  return {
    month,
    label: monthLabel.format(from),
    org: { name: org.name, taxNo: org.taxNo, city: org.city, district: org.district },
    orders: outOrders,
    vatByRate: [...vatMap.entries()].sort((a, b) => a[0] - b[0]).map(([rate, v]) => ({ rate, ...v })),
    totals: {
      subtotal: sum((o) => o.subtotal),
      vat: sum((o) => o.vat),
      financingFee: sum((o) => o.financingFee),
      creditApplied: sum((o) => o.creditApplied),
      total: sum((o) => o.total),
      waveCredits: credits.reduce((a, c) => a + c.amount, 0),
    },
  };
}
