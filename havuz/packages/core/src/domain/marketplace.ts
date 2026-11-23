import { applyBps, type Kurus } from '../money';

/**
 * Pazaryeri para akışı (iyzico Pazaryeri).
 *
 * Üyenin ödediği tutar ödeme anında kalem bazında bölünür: tedarikçinin payı (subMerchantPrice)
 * iyzico tarafından doğrudan tedarikçiye ödenir, kalan Havuz'un komisyonudur. Havuz tedarikçi
 * parasını hiç tutmaz. Tedarikçiye ödeme, kalem teslim edilip itiraz süresi dolunca (ürün onayı)
 * serbest bırakılır.
 *
 *   kalem tutarı  = KDV dahil bedel + vade farkı payı − onaylı mal kabul iadesi
 *   Havuz payı    = komisyon (KDV hariç bedel üzerinden) + komisyonun KDV'si
 *   tedarikçi payı = kalem tutarı − Havuz payı
 *
 * Vade farkı, vadeyi taşıyan tedarikçiye gider. Dalga kademe farkı, iptal ve mal kabul iadeleri
 * ödenmiş siparişte karta kısmi iade, ödenmemiş siparişte borçtan düşüm olarak uygulanır.
 */

/** Teslimden sonra mal kabul sorunu bildirilebilecek süre; dolunca tedarikçi ödemesi serbest kalır. */
export const ISSUE_REPORT_WINDOW_HOURS = 48;

/** Havuz komisyon faturasındaki KDV oranı (hizmet bedeli). */
export const COMMISSION_VAT_RATE = 20;

export const SUB_MERCHANT_TYPES = ['PERSONAL', 'PRIVATE_COMPANY', 'LIMITED_OR_JOINT_STOCK_COMPANY'] as const;
export type SubMerchantType = (typeof SUB_MERCHANT_TYPES)[number];

export const SUB_MERCHANT_TYPE_LABEL: Record<SubMerchantType, string> = {
  PERSONAL: 'Bireysel (şirketsiz)',
  PRIVATE_COMPANY: 'Şahıs şirketi',
  LIMITED_OR_JOINT_STOCK_COMPANY: 'Limited / Anonim şirket',
};

export const REFUND_REASONS = ['item_cancelled', 'issue', 'wave_rebate', 'duplicate_payment', 'order_cancelled', 'subscription_duplicate'] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const REFUND_REASON_LABEL: Record<RefundReason, string> = {
  item_cancelled: 'İptal edilen kalem',
  issue: 'Mal kabul iadesi',
  wave_rebate: 'Dalga kademe farkı',
  duplicate_payment: 'Mükerrer ödeme',
  order_cancelled: 'İptal edilmiş siparişe ödeme',
  subscription_duplicate: 'Mükerrer üyelik ödemesi',
};

export const REFUND_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'needs_review'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  pending: 'Sırada',
  processing: 'İşleniyor',
  succeeded: 'Karta iade edildi',
  failed: 'Yeniden denenecek',
  needs_review: 'Elle kontrol gerekli',
};

/** Bir iade en fazla bu kadar denenir; sonra yönetimin kontrolüne düşer. */
export const REFUND_MAX_ATTEMPTS = 5;

/** Tutarı ağırlıklara göre kuruşu kuruşuna böler (en büyük kalan yöntemi); toplam her zaman korunur. */
export function allocate(total: Kurus, weights: number[]): Kurus[] {
  const w = weights.map((x) => Math.max(0, x));
  const sumW = w.reduce((a, b) => a + b, 0);
  if (total === 0 || sumW === 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / sumW);
  const out = raw.map(Math.floor);
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) out[order[k].i]++;
  return out;
}

export interface ChargeLineInput {
  id: string;
  qty: number;
  finalUnitPrice: Kurus;
  vatRate: number;
  commissionBps: number;
  /** İptal edilen kalem tahsil edilmez. */
  cancelled?: boolean;
  /** Onaylanmış mal kabul iadesi (KDV dahil). */
  issueCredit?: Kurus;
}

export interface ChargeLine {
  id: string;
  /** KDV hariç */
  net: Kurus;
  vat: Kurus;
  /** KDV dahil, iade öncesi */
  gross: Kurus;
  issueCredit: Kurus;
  financingShare: Kurus;
  /** Üyeden alınacak/alınan tutar */
  charge: Kurus;
  commission: Kurus;
  commissionVat: Kurus;
  /** Tedarikçinin payı (iyzico subMerchantPrice) */
  supplierShare: Kurus;
}

export interface ChargeBreakdown {
  lines: ChargeLine[];
  subtotal: Kurus;
  vat: Kurus;
  financingFee: Kurus;
  issueCredits: Kurus;
  total: Kurus;
}

/**
 * Siparişin kalem bazında tahsilat dökümü. Aynı fonksiyon (1) ödeme sepetini, (2) ödenmemiş
 * siparişin güncel borcunu, (3) ödenmiş siparişte iade edilmesi gereken tutarı ve (4) tedarikçi
 * hakedişini hesaplar; böylece dört yer hiçbir zaman birbirinden sapmaz.
 */
export function computeCharges(items: ChargeLineInput[], financingBps: number): ChargeBreakdown {
  const base = items.map((i) => {
    if (i.cancelled) return { i, net: 0, vat: 0, gross: 0, issue: 0, payable: 0 };
    const net = i.qty * i.finalUnitPrice;
    const vat = Math.round((net * i.vatRate) / 100);
    const gross = net + vat;
    const issue = Math.min(Math.max(0, i.issueCredit ?? 0), gross);
    return { i, net, vat, gross, issue, payable: gross - issue };
  });
  const payableTotal = base.reduce((a, b) => a + b.payable, 0);
  const financingFee = applyBps(payableTotal, financingBps);
  const shares = allocate(financingFee, base.map((b) => b.payable));
  const lines = base.map((b, k): ChargeLine => {
    const charge = b.payable + shares[k];
    // Komisyon yalnızca üyenin fiilen ödediği mal bedeli üzerinden alınır (iade edilen kısım hariç).
    const fullCommission = applyBps(b.net, b.i.commissionBps);
    const commission = b.gross > 0 ? Math.round((fullCommission * b.payable) / b.gross) : 0;
    const commissionVat = Math.round((commission * COMMISSION_VAT_RATE) / 100);
    return {
      id: b.i.id,
      net: b.net,
      vat: b.vat,
      gross: b.gross,
      issueCredit: b.issue,
      financingShare: shares[k],
      charge,
      commission,
      commissionVat,
      supplierShare: Math.max(0, charge - commission - commissionVat),
    };
  });
  return {
    lines,
    subtotal: lines.reduce((a, l) => a + l.net, 0),
    vat: lines.reduce((a, l) => a + l.vat, 0),
    financingFee,
    issueCredits: lines.reduce((a, l) => a + l.issueCredit, 0),
    total: lines.reduce((a, l) => a + l.charge, 0),
  };
}

/** Kısmi iadede tedarikçi payından düşen kısım (iade, kalemin paylarına orantılı dağılır). */
export function supplierShareAfterRefund(price: Kurus, supplierShare: Kurus, refunded: Kurus): Kurus {
  if (price <= 0) return 0;
  const kept = Math.max(0, price - refunded);
  return Math.round((supplierShare * kept) / price);
}

// --- Kimlik / vergi numarası doğrulama ------------------------------------------------------

/** T.C. kimlik numarası algoritma kontrolü. */
export function tcknValid(raw: string): boolean {
  const v = raw.replace(/\s+/g, '');
  if (!/^[1-9]\d{10}$/.test(v)) return false;
  const d = v.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === d10 && d[10] === d11;
}

/** 10 haneli vergi kimlik numarası (VKN) algoritma kontrolü. */
export function vknValid(raw: string): boolean {
  const v = raw.replace(/\s+/g, '');
  if (!/^\d{10}$/.test(v)) return false;
  const d = v.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const t = (d[i] + 9 - i) % 10;
    let x = (t * 2 ** (9 - i)) % 9;
    if (t !== 0 && x === 0) x = 9;
    sum += x;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

export interface PayoutProfile {
  subMerchantType: SubMerchantType | null;
  legalTitle: string | null;
  taxOffice: string | null;
  taxNo: string | null;
  identityNumber: string | null;
  contactName: string | null;
  address: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
}

/** Tedarikçinin iyzico'ya alt satıcı olarak kaydedilebilmesi için eksik bilgiler (boşsa tamam). */
export function payoutProfileProblems(p: PayoutProfile): string[] {
  const out: string[] = [];
  if (!p.subMerchantType) return ['Şirket türü seçilmeli'];
  if (!p.iban) out.push('IBAN');
  if (!p.address || p.address.trim().length < 10) out.push('Açık adres');
  if (!p.email) out.push('E-posta');
  if (!p.phone) out.push('Telefon');
  if (p.subMerchantType === 'PERSONAL') {
    if (!p.contactName || p.contactName.trim().split(/\s+/).length < 2) out.push('Ad soyad');
    if (!p.identityNumber || !tcknValid(p.identityNumber)) out.push('T.C. kimlik no');
  } else {
    if (!p.legalTitle) out.push('Ticari unvan');
    if (!p.taxOffice) out.push('Vergi dairesi');
    if (p.subMerchantType === 'PRIVATE_COMPANY') {
      if (!p.identityNumber || !tcknValid(p.identityNumber)) out.push('Şirket sahibinin T.C. kimlik no');
    } else if (!p.taxNo || !vknValid(p.taxNo)) {
      out.push('Vergi no (10 hane)');
    }
  }
  return out;
}
