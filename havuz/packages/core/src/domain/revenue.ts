import { applyBps, type Kurus } from '../money';

/**
 * Platform gelir modeli (sistem sahibinin kazancı):
 *  1. Tedarikçi komisyonu  — işlem hacmi × tedarikçi komisyon oranı
 *  2. Pro üyelik           — aylık sabit ücret
 *  3. Finansman            — vade farkının fonlama maliyeti düşülmüş kısmı
 *  4. Öne çıkarma (reklam) — tedarikçi sponsorlu ürün ücretleri
 */
export const DEFAULT_COMMISSION_BPS = 300;
export const PRO_MONTHLY_FEE: Kurus = 149_000; // ₺1.490
/** Vade farkının fonlama ortağına giden payı; kalan platformun net finansman geliridir. */
export const FUNDING_COST_SHARE = 0.6;

export interface RevenueInput {
  volumeBySupplier: { volume: Kurus; commissionBps: number }[];
  proMembers: number;
  months: number;
  financingFees: Kurus;
  sponsoredFees: Kurus;
}

export interface RevenueBreakdown {
  commission: Kurus;
  subscriptions: Kurus;
  financing: Kurus;
  sponsored: Kurus;
  total: Kurus;
}

export function computeRevenue(input: RevenueInput): RevenueBreakdown {
  const commission = input.volumeBySupplier.reduce((a, s) => a + applyBps(s.volume, s.commissionBps), 0);
  const subscriptions = input.proMembers * PRO_MONTHLY_FEE * input.months;
  const financing = Math.round(input.financingFees * (1 - FUNDING_COST_SHARE));
  const sponsored = input.sponsoredFees;
  return { commission, subscriptions, financing, sponsored, total: commission + subscriptions + financing + sponsored };
}

/**
 * Açılış sayfasındaki tasarruf hesaplayıcısı. Kategori ağırlıkları ve ortalama
 * tasarruf oranları seed verisindeki teklif/piyasa farklarından türetilmiş varsayımlardır.
 */
export const CATEGORY_SAVING_ESTIMATES = [
  { key: 'temel', label: 'Yağ & temel gıda', share: 0.24, rate: 0.12 },
  { key: 'kahve', label: 'Kahve & içecek', share: 0.18, rate: 0.15 },
  { key: 'sut', label: 'Süt ürünleri', share: 0.16, rate: 0.09 },
  { key: 'taze', label: 'Taze sebze & meyve', share: 0.14, rate: 0.11 },
  { key: 'et', label: 'Et & tavuk', share: 0.14, rate: 0.07 },
  { key: 'sarf', label: 'Ambalaj, temizlik & sarf', share: 0.14, rate: 0.19 },
] as const;

export function estimateSavings(monthlySpend: Kurus, networkShare: number) {
  const routed = Math.round(monthlySpend * Math.min(1, Math.max(0, networkShare)));
  const byCategory = CATEGORY_SAVING_ESTIMATES.map((c) => ({
    key: c.key,
    label: c.label,
    saving: Math.round(routed * c.share * c.rate),
  }));
  const monthly = byCategory.reduce((a, c) => a + c.saving, 0);
  return { routed, monthly, yearly: monthly * 12, rate: routed ? monthly / routed : 0, byCategory };
}
