import 'server-only';
import type { Kurus, PaymentPurpose } from '@havuz/core';

export interface CheckoutParams {
  paymentId: string;
  amount: Kurus;
  purpose: PaymentPurpose;
  description: string;
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
}

/** Sağlayıcıdan bağımsız ödeme arayüzü. Yeni sağlayıcı (PayTR, Param…) bu arayüzle eklenir. */
export interface PaymentProvider {
  name: 'test' | 'iyzico';
  createCheckout(p: CheckoutParams): Promise<CheckoutResult>;
  /** Sağlayıcıdan sonucu doğrular (callback'teki veriye tek başına güvenilmez). */
  retrieve(token: string, paymentId: string): Promise<RetrieveResult>;
}

export class PaymentConfigError extends Error {}
