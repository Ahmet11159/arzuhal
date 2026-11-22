import { applyBps, type Kurus } from '../money';

/**
 * Tedarikçi hakedişi.
 *
 * Havuz, üyeden KDV dahil tutarı tahsil eder (veya vadeli olarak alacaklanır) ve
 * tedarikçiye teslim edilen her kalem için ödeme yapmayı garanti eder:
 *
 *   net = KDV dahil satış − komisyon (KDV hariç tutar üzerinden) − onaylı mal kabul iadeleri
 *
 * Üyenin ödemesi beklenmez: tahsilat riski Havuz'dadır.
 */
export interface SettlementLine {
  qty: number;
  finalUnitPrice: Kurus;
  vatRate: number;
  commissionBps: number;
}

export interface SettlementTotals {
  itemCount: number;
  grossSales: Kurus;
  commission: Kurus;
  issueDeductions: Kurus;
  netAmount: Kurus;
}

export function computeSettlement(lines: SettlementLine[], issueCredits: Kurus[] = []): SettlementTotals {
  let grossSales = 0;
  let commission = 0;
  for (const l of lines) {
    const net = l.qty * l.finalUnitPrice;
    grossSales += net + Math.round((net * l.vatRate) / 100);
    commission += applyBps(net, l.commissionBps);
  }
  const issueDeductions = issueCredits.reduce((a, b) => a + b, 0);
  return {
    itemCount: lines.length,
    grossSales,
    commission,
    issueDeductions,
    netAmount: grossSales - commission - issueDeductions,
  };
}

export function formatSettlementNumber(seq: number, year: number): string {
  return `HKD-${year}-${String(seq).padStart(5, '0')}`;
}

/** TR IBAN: "TR" + 24 rakam; boşluklar yok sayılır. Mod-97 kontrolü yapılır. */
export function normalizeIban(raw: string): string | null {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1 ? iban : null;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}
