export const ROLES = ['member', 'supplier', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ORG_TYPES = ['member', 'supplier', 'operator'] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export const PAYMENT_TERMS = ['cash', 'net30', 'net60'] as const;
export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'due', 'overdue'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Kalem (tedarikçi bazlı) yaşam döngüsü. */
export const ITEM_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Sipariş durumu kalemlerden türetilir (bkz. deriveOrderStatus). */
export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const WAVE_STATUSES = ['scheduled', 'open', 'closed', 'delivered'] as const;
export type WaveStatus = (typeof WAVE_STATUSES)[number];

export const ISSUE_TYPES = ['missing', 'damaged', 'quality', 'wrong_item'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_STATUSES = ['open', 'resolved', 'rejected'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const LEDGER_TYPES = ['wave_rebate', 'issue_credit', 'credit_used', 'adjustment'] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export const BUSINESS_TYPES = ['cafe', 'restaurant', 'bakery', 'bar', 'hotel', 'catering'] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const VAT_RATES = [1, 10, 20] as const;
export type VatRate = (typeof VAT_RATES)[number];

export const PAYMENT_PURPOSES = ['order', 'due', 'subscription'] as const;
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];

export const PAYMENT_RECORD_STATUSES = ['pending', 'succeeded', 'failed', 'cancelled'] as const;
export type PaymentRecordStatus = (typeof PAYMENT_RECORD_STATUSES)[number];

export const SETTLEMENT_STATUSES = ['pending', 'paid'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const LEAD_STATUSES = ['new', 'approved', 'rejected'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CATEGORY_ICONS = ['Wheat', 'Coffee', 'Milk', 'Apple', 'Beef', 'Package', 'SprayCan'] as const;
export type CategoryIconName = (typeof CATEGORY_ICONS)[number];
