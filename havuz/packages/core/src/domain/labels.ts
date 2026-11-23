import type {
  LeadStatus,
  PaymentPurpose,
  PaymentRecordStatus,
  SettlementStatus,
  BusinessType,
  IssueStatus,
  IssueType,
  ItemStatus,
  LedgerType,
  OrderStatus,
  PaymentStatus,
  PaymentTerm,
  Plan,
  WaveStatus,
} from './enums';

/** Kullanıcıya görünen Türkçe etiketler — web ve mobil aynı metinleri kullanır. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Onay bekliyor',
  confirmed: 'Hazırlanıyor',
  shipped: 'Yolda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};
export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = ORDER_STATUS_LABEL;

export const PAYMENT_TERM_LABEL: Record<PaymentTerm, string> = {
  cash: 'Peşin',
  net30: '30 gün vade',
  net60: '60 gün vade',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Ödeme bekleniyor',
  paid: 'Ödendi',
  due: 'Vadesi bekleniyor',
  overdue: 'Gecikmiş',
};

export const WAVE_STATUS_LABEL: Record<WaveStatus, string> = {
  scheduled: 'Planlandı',
  open: 'Açık',
  closed: 'Kapandı',
  delivered: 'Teslim edildi',
};

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  missing: 'Eksik ürün',
  damaged: 'Hasarlı ürün',
  quality: 'Kalite sorunu',
  wrong_item: 'Yanlış ürün',
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'İnceleniyor',
  resolved: 'Çözüldü',
  rejected: 'Reddedildi',
};

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  wave_rebate: 'Dalga kademe farkı',
  issue_credit: 'Mal kabul iadesi',
  credit_used: 'Siparişte kullanılan kredi',
  adjustment: 'İptal / iade',
};

export const PLAN_LABEL: Record<Plan, string> = { free: 'Temel', pro: 'Pro' };

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  cafe: 'Kafe',
  restaurant: 'Restoran',
  bakery: 'Fırın & Pastane',
  bar: 'Bar',
  hotel: 'Otel',
  catering: 'Catering',
};

export const PAYMENT_PURPOSE_LABEL: Record<PaymentPurpose, string> = {
  order: 'Sipariş ödemesi',
  due: 'Vadeli borç ödemesi',
  subscription: 'Pro üyelik',
};

export const PAYMENT_RECORD_STATUS_LABEL: Record<PaymentRecordStatus, string> = {
  pending: 'Bekliyor',
  succeeded: 'Başarılı',
  failed: 'Başarısız',
  cancelled: 'İptal',
};

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  pending: 'Ödeme bekliyor',
  paid: 'Ödendi',
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Yeni',
  approved: 'Hesap açıldı',
  rejected: 'Reddedildi',
};

/** Tedarikçinin sipariş kalemindeki ödeme durumu. */
export const PAYOUT_STATUS_LABEL = {
  awaiting_payment: 'Üye ödemesi bekleniyor',
  in_progress: 'Teslimat sürüyor',
  objection_period: 'İtiraz süresinde (48 saat)',
  released: 'Ödemesi onaylandı',
  settled: 'Hakedişe girdi',
  cancelled: 'İptal',
} as const;

/** Yasal metinlerin sürümü (onaylarda kaydedilir). Metin değişince güncellenir. */
export const LEGAL_VERSION = '2026-11-24';

/** Ürün fotoğrafının önbellekli adresi (sürüm değişince tarayıcı yenisini alır). */
export const productImageUrl = (productId: string, version: string | null | undefined) =>
  version ? `/api/v1/catalog/products/${productId}/image?v=${version}` : null;
