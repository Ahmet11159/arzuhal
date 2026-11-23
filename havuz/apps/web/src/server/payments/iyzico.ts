import 'server-only';
import { toLira } from '@havuz/core';
import { PaymentConfigError, type CheckoutParams, type PaymentProvider } from './provider';
import { iyzicoAuthHeaders, iyzicoGsm, iyzicoName } from './iyzico-auth';

export { iyzicoAuthHeaders };

/**
 * iyzico Checkout Form entegrasyonu (IYZWSv2 imzası).
 *
 *   IYZICO_API_KEY, IYZICO_SECRET_KEY   — iyzico panelinden
 *   IYZICO_BASE_URL                     — sandbox: https://sandbox-api.iyzipay.com
 *                                         canlı:   https://api.iyzipay.com
 *
 * Akış: initialize → kullanıcı iyzico ödeme sayfasında öder → iyzico callbackUrl'e
 * `token` POST eder → sunucu checkoutform/auth/ecom/detail ile sonucu doğrular.
 */
const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';

function config() {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const baseUrl = (process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com').replace(/\/$/, '');
  if (!apiKey || !secretKey) throw new PaymentConfigError('IYZICO_API_KEY ve IYZICO_SECRET_KEY tanımlı olmalı');
  return { apiKey, secretKey, baseUrl };
}

/** iyzico tutarları nokta ayraçlı string ister: 1234.5 → "1234.5" */
const money = (kurus: number) => String(toLira(kurus));

async function call<T>(path: string, payload: unknown): Promise<T> {
  const { apiKey, secretKey, baseUrl } = config();
  const body = JSON.stringify(payload);
  const res = await fetch(baseUrl + path, { method: 'POST', headers: iyzicoAuthHeaders(apiKey, secretKey, path, body), body });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) throw new Error(`iyzico HTTP ${res.status}`);
  return json;
}

interface InitResponse {
  status: 'success' | 'failure';
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
}

interface DetailResponse {
  status: 'success' | 'failure';
  errorMessage?: string;
  paymentStatus?: 'SUCCESS' | 'FAILURE' | 'INIT_THREEDS' | 'CALLBACK_THREEDS';
  paymentId?: string;
  paidPrice?: number;
  conversationId?: string;
  basketId?: string;
  lastFourDigits?: string;
  mdStatus?: number;
}

export const iyzicoProvider: PaymentProvider = {
  name: 'iyzico',
  async createCheckout(p: CheckoutParams) {
    const person = iyzicoName(p.buyer.name);
    const price = money(p.amount);
    const address = { contactName: p.buyer.name, city: p.buyer.city, country: 'Turkey', address: p.buyer.address };
    const r = await call<InitResponse>(INIT_PATH, {
      locale: 'tr',
      conversationId: p.paymentId,
      price,
      paidPrice: price,
      currency: 'TRY',
      basketId: p.paymentId,
      paymentGroup: p.purpose === 'subscription' ? 'SUBSCRIPTION' : 'PRODUCT',
      callbackUrl: p.callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: p.buyer.id,
        name: person.name,
        surname: person.surname,
        gsmNumber: iyzicoGsm(p.buyer.phone),
        email: p.buyer.email,
        // iyzico 11 haneli kimlik no ister; vergi no yoksa iyzico'nun kabul ettiği yer tutucu kullanılır.
        identityNumber: p.buyer.taxNo && p.buyer.taxNo.length === 11 ? p.buyer.taxNo : '11111111111',
        registrationAddress: p.buyer.address,
        ip: p.buyer.ip,
        city: p.buyer.city,
        country: 'Turkey',
      },
      shippingAddress: address,
      billingAddress: address,
      basketItems: [
        {
          id: p.paymentId,
          name: p.description.slice(0, 100),
          category1: p.purpose === 'subscription' ? 'Üyelik' : 'Tedarik',
          itemType: p.purpose === 'subscription' ? 'VIRTUAL' : 'PHYSICAL',
          price,
        },
      ],
    });
    if (r.status !== 'success' || !r.token || !r.paymentPageUrl) throw new Error(r.errorMessage ?? 'iyzico ödeme başlatılamadı');
    return { redirectUrl: r.paymentPageUrl, token: r.token };
  },

  async retrieve(token, paymentId) {
    const r = await call<DetailResponse>(DETAIL_PATH, { locale: 'tr', conversationId: paymentId, token });
    if (r.status !== 'success') return { status: 'failed', error: r.errorMessage ?? 'Ödeme doğrulanamadı', conversationId: r.conversationId };
    const ok = r.paymentStatus === 'SUCCESS';
    return {
      status: ok ? 'succeeded' : 'failed',
      providerPaymentId: r.paymentId,
      paidAmount: typeof r.paidPrice === 'number' ? Math.round(r.paidPrice * 100) : undefined,
      cardLast4: r.lastFourDigits,
      conversationId: r.conversationId ?? r.basketId,
      error: ok ? undefined : r.errorMessage ?? 'Ödeme başarısız',
    };
  },
};
