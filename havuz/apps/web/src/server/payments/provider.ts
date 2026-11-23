import 'server-only';
import type { Kurus, PaymentPurpose, SubMerchantType } from '@havuz/core';

/** Ödeme sepetindeki bir kalem (pazaryerinde tedarikçi payı bu kalem üzerinden ayrılır). */
export interface CheckoutItem {
  /** Bizim kalem kimliğimiz (payment_items.id); sağlayıcı sonuçta aynı kimlikle döner. */
  id: string;
  name: string;
  category: string;
  price: Kurus;
  /** Pazaryeri: tedarikçinin alt satıcı anahtarı ve payı. */
  subMerchantKey?: string;
  subMerchantPrice?: Kurus;
}

export interface CheckoutParams {
  paymentId: string;
  amount: Kurus;
  purpose: PaymentPurpose;
  description: string;
  items: CheckoutItem[];
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string;
    address: string;
    taxNo: string | null;
    ip: string;
  };
  /** Sağlayıcının ödeme sonucunu POST edeceği sunucu adresi. */
  callbackUrl: string;
}

export interface CheckoutResult {
  redirectUrl: string;
  token: string;
}

export interface RetrieveResult {
  status: 'succeeded' | 'failed';
  providerPaymentId?: string;
  paidAmount?: Kurus;
  cardLast4?: string;
  error?: string;
  /** Sağlayıcının bildirdiği bizim ödeme kimliğimiz (eşleşme kontrolü için). */
  conversationId?: string;
  /** Kalem bazında işlem numaraları (iade ve ürün onayı bunlarla yapılır). */
  items?: { itemId: string; transactionId: string; price?: Kurus }[];
}

export interface SubMerchantInput {
  /** Bizim tedarikçi kimliğimiz (subMerchantExternalId). */
  externalId: string;
  type: SubMerchantType;
  name: string;
  email: string;
  phone: string | null;
  address: string;
  iban: string;
  legalTitle?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  identityNumber?: string | null;
  contactName?: string | null;
}

export interface RefundRequest {
  /** Bizim iade kaydımızın kimliği (sağlayıcıda eşleşme için). */
  refundId: string;
  transactionId: string;
  amount: Kurus;
  ip: string;
}

/** Sağlayıcıdan bağımsız ödeme arayüzü. Yeni sağlayıcı (PayTR, Param…) bu arayüzle eklenir. */
export interface PaymentProvider {
  name: 'test' | 'iyzico';
  createCheckout(p: CheckoutParams): Promise<CheckoutResult>;
  /** Sağlayıcıdan sonucu doğrular (callback'teki veriye tek başına güvenilmez). */
  retrieve(token: string, paymentId: string): Promise<RetrieveResult>;
  /** Kalemin bir kısmını veya tamamını karta iade eder. */
  refund(r: RefundRequest): Promise<{ providerRefundId?: string }>;
  /** Pazaryeri: kalemi onaylar; tedarikçinin payı ödemeye serbest kalır. */
  approveItem(transactionId: string): Promise<void>;
  /** Pazaryeri: tedarikçiyi alt satıcı olarak kaydeder/günceller, anahtarını döner. */
  upsertSubMerchant(input: SubMerchantInput, existingKey: string | null): Promise<{ subMerchantKey: string }>;
}

export class PaymentConfigError extends Error {}

/** Sağlayıcının iş kuralı gereği reddettiği istek (yeniden denemek sonucu değiştirmez). */
export class PaymentProviderRejected extends Error {}
