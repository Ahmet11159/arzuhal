import type {
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
  wave_rebate: 'Dalga kademe iadesi',
  issue_credit: 'Mal kabul iadesi',
  credit_used: 'Siparişte kullanılan kredi',
  adjustment: 'Düzeltme',
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
