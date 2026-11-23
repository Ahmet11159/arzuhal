import type { Kurus } from '../money';

/**
 * Tedarikçi hakedişi (dönemsel mutabakat).
 *
 * Pazaryeri modelinde tedarikçinin payı ödeme anında ayrılır ve iyzico tarafından doğrudan
 * tedarikçiye ödenir; hakediş belgesi bu ödemelerin ve Havuz komisyon faturasının dökümüdür.
 * Her kalem, teslim + itiraz süresi sonunda "serbest bırakılırken" nihai tutarlarıyla dondurulur
 * (bkz. computeCharges); hakediş bu dondurulmuş tutarları toplar.
 *
 *   net = KDV dahil satış (+ vade farkı) − mal kabul iadeleri − komisyon − komisyon KDV'si
 */
export interface SettlementLine {
  /** Üyenin ödediği (iade sonrası) kalem tutarı */
  charge: Kurus;
  issueDeduction: Kurus;
  commission: Kurus;
  commissionVat: Kurus;
  supplierShare: Kurus;
}

export interface SettlementTotals {
  itemCount: number;
  /** İade öncesi satış (KDV ve vade farkı dahil) */
  grossSales: Kurus;
  commission: Kurus;
  commissionVat: Kurus;
  issueDeductions: Kurus;
  netAmount: Kurus;
}

export function computeSettlement(lines: SettlementLine[]): SettlementTotals {
  const t = { itemCount: lines.length, grossSales: 0, commission: 0, commissionVat: 0, issueDeductions: 0, netAmount: 0 };
  for (const l of lines) {
    t.grossSales += l.charge + l.issueDeduction;
    t.issueDeductions += l.issueDeduction;
    t.commission += l.commission;
    t.commissionVat += l.commissionVat;
    t.netAmount += l.supplierShare;
  }
  return t;
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
