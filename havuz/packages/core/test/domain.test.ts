import { describe, expect, it } from 'vitest';
import {
  closeWave,
  computeOrderTotals,
  computeRevenue,
  deriveOrderStatus,
  estimateSavings,
  formatOrderNumber,
  formatTRY,
  nextTier,
  normalizeTiers,
  pickBestOffer,
  resolveTier,
  canTransition,
  createOrderInput,
  updateOfferInput,
  reportIssueInput,
} from '../src';

const oil = { basePrice: 100_000, tiers: [{ minQty: 50, unitPrice: 92_000 }, { minQty: 200, unitPrice: 86_000 }] };

describe('fiyat kademeleri', () => {
  it('normalizes and drops non-decreasing tiers', () => {
    expect(normalizeTiers({ basePrice: 100, tiers: [{ minQty: 10, unitPrice: 120 }, { minQty: 5, unitPrice: 90 }] })).toEqual([
      { minQty: 1, unitPrice: 100 },
      { minQty: 5, unitPrice: 90 },
    ]);
  });

  it('resolves tier by pooled quantity', () => {
    expect(resolveTier(oil, 0).unitPrice).toBe(100_000);
    expect(resolveTier(oil, 49).unitPrice).toBe(100_000);
    expect(resolveTier(oil, 50).unitPrice).toBe(92_000);
    expect(resolveTier(oil, 500).unitPrice).toBe(86_000);
  });

  it('reports progress to next tier', () => {
    const n = nextTier(oil, 25)!;
    expect(n.remainingQty).toBe(25);
    expect(n.progress).toBeCloseTo(0.5);
    expect(n.unitSaving).toBe(8_000);
    const n2 = nextTier(oil, 125)!;
    expect(n2.minQty).toBe(200);
    expect(n2.progress).toBeCloseTo(0.5);
    expect(nextTier(oil, 250)).toBeNull();
  });

  it('picks best active offer', () => {
    const offers = [
      { id: 'a', ...oil, stock: 10, active: true, leadTimeDays: 2 },
      { id: 'b', basePrice: 95_000, tiers: [], stock: 10, active: true, leadTimeDays: 1 },
      { id: 'c', basePrice: 50_000, tiers: [], stock: 0, active: true, leadTimeDays: 1 },
    ];
    expect(pickBestOffer(offers)!.id).toBe('b');
    expect(pickBestOffer(offers, { a: 60 })!.id).toBe('a');
  });
});

describe('dalga kapanışı', () => {
  it('credits the difference between paid and final tier', () => {
    const r = closeWave(
      [
        { lineId: '1', orderId: 'o1', memberId: 'm1', offerId: 'oil', qty: 20, paidUnitPrice: 100_000 },
        { lineId: '2', orderId: 'o2', memberId: 'm2', offerId: 'oil', qty: 40, paidUnitPrice: 92_000 },
      ],
      { oil },
    );
    expect(r.offers[0]).toMatchObject({ pooledQty: 60, finalUnitPrice: 92_000 });
    expect(r.creditsByMember).toEqual({ m1: 160_000 });
    expect(r.totalCredit).toBe(160_000);
    expect(r.lines[1].credit).toBe(0);
  });

  it('never raises the price above what was paid', () => {
    const r = closeWave([{ lineId: '1', orderId: 'o', memberId: 'm', offerId: 'oil', qty: 1, paidUnitPrice: 90_000 }], { oil });
    expect(r.lines[0].finalUnitPrice).toBe(90_000);
    expect(r.totalCredit).toBe(0);
  });
});

describe('sipariş', () => {
  const lines = [
    { qty: 2, unitPrice: 10_000, marketPrice: 12_000, vatRate: 1 },
    { qty: 1, unitPrice: 50_000, marketPrice: 55_000, vatRate: 20 },
  ];

  it('computes totals with VAT, financing and credit', () => {
    const t = computeOrderTotals(lines, { plan: 'free', term: 'net30', availableCredit: 5_000, useCredit: true });
    expect(t.subtotal).toBe(70_000);
    expect(t.vat).toBe(200 + 10_000);
    expect(t.creditApplied).toBe(5_000);
    expect(t.financingFee).toBe(Math.round(((80_200 - 5_000) * 150) / 10_000));
    expect(t.total).toBe(80_200 - 5_000 + t.financingFee);
    expect(t.savings).toBe(9_000);
  });

  it('blocks net60 for free plan', () => {
    expect(() => computeOrderTotals(lines, { plan: 'free', term: 'net60' })).toThrow();
    expect(computeOrderTotals(lines, { plan: 'pro', term: 'net60' }).financingFee).toBeGreaterThan(0);
  });

  it('caps applied credit at total', () => {
    const t = computeOrderTotals(lines, { plan: 'free', term: 'cash', availableCredit: 10_000_000, useCredit: true });
    expect(t.total).toBe(0);
  });

  it('derives order status from items', () => {
    expect(deriveOrderStatus(['delivered', 'shipped'])).toBe('shipped');
    expect(deriveOrderStatus(['delivered', 'cancelled'])).toBe('delivered');
    expect(deriveOrderStatus(['cancelled'])).toBe('cancelled');
    expect(canTransition('pending', 'shipped')).toBe(false);
    expect(canTransition('confirmed', 'shipped')).toBe(true);
  });

  it('formats', () => {
    expect(formatOrderNumber(42, 2026)).toBe('HVZ-2026-000042');
    expect(formatTRY(123456)).toContain('1.234,56');
  });
});

describe('gelir ve tasarruf', () => {
  it('computes platform revenue', () => {
    const r = computeRevenue({
      volumeBySupplier: [{ volume: 1_000_000, commissionBps: 300 }],
      proMembers: 2,
      months: 1,
      financingFees: 10_000,
      sponsoredFees: 5_000,
    });
    expect(r.commission).toBe(30_000);
    expect(r.financing).toBe(4_000);
    expect(r.total).toBe(30_000 + r.subscriptions + 4_000 + 5_000);
  });

  it('estimates savings', () => {
    const e = estimateSavings(25_000_000, 0.4);
    expect(e.routed).toBe(10_000_000);
    expect(e.monthly).toBeGreaterThan(0);
    expect(e.rate).toBeGreaterThan(0.05);
  });
});

describe('sözleşmeler', () => {
  it('validates order input', () => {
    expect(createOrderInput.safeParse({ items: [] }).success).toBe(false);
    const ok = createOrderInput.parse({ items: [{ offerId: 'x', qty: 2 }] });
    expect(ok.paymentTerm).toBe('cash');
    expect(ok.waveId).toBeNull();
  });
  it('validates issue photos', () => {
    expect(reportIssueInput.safeParse({ type: 'damaged', qty: 1, photo: 'data:image/jpeg;base64,AAAA' }).success).toBe(true);
    expect(reportIssueInput.safeParse({ type: 'damaged', qty: 1, photo: 'data:text/html;base64,AAAA' }).success).toBe(false);
    expect(reportIssueInput.safeParse({ type: 'damaged', qty: 1, photo: 'https://evil.example/x.jpg' }).success).toBe(false);
  });
  it('rejects tiers above base price', () => {
    expect(updateOfferInput.safeParse({ basePrice: 100, tiers: [{ minQty: 10, unitPrice: 120 }] }).success).toBe(false);
  });
});
