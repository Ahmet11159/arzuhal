import 'server-only';
import { toLira } from '@havuz/core';
import { PaymentConfigError, PaymentProviderRejected, type CheckoutParams, type PaymentProvider, type SubMerchantInput } from './provider';
import { iyzicoAuthHeaders, iyzicoGsm, iyzicoName } from './iyzico-auth';

export { iyzicoAuthHeaders };

/**
 * iyzico Checkout Form entegrasyonu (IYZWSv2 imzası).
 *
 *   IYZICO_API_KEY, IYZICO_SECRET_KEY   — iyzico panelinden
 *   IYZICO_BASE_URL                     — sandbox: https://sandbox-api.iyzipay.com
 *                                         canlı:   https://api.iyzipay.com
 *
 *   IYZICO_MARKETPLACE=true             — hesabınız iyzico Pazaryeri ise: sepet kalemlerine tedarikçi
 *                                         anahtarı ve payı eklenir, teslimden sonra ürün onayı verilir
 *   IYZICO_PLATFORM_SUBMERCHANT_KEY     — (isteğe bağlı) pazaryerinde Havuz'un kendi satışları (Pro üyelik)
 *                                         için alt satıcı anahtarı; iyzico her kalemde anahtar isterse
 *
 * Akış: initialize → kullanıcı iyzico ödeme sayfasında öder → iyzico callbackUrl'e
 * `token` POST eder → sunucu checkoutform/auth/ecom/detail ile sonucu doğrular.
 * Uç noktalar iyzico'nun resmî kütüphaneleriyle (iyzipay-node / iyzipay-java) aynıdır.
 */
const INIT_PATH = '/payment/iyzipos/checkoutform/initialize/auth/ecom';
const DETAIL_PATH = '/payment/iyzipos/checkoutform/auth/ecom/detail';
const REFUND_PATH = '/payment/refund';
const APPROVE_PATH = '/payment/iyzipos/item/approve';
const SUBMERCHANT_PATH = '/onboarding/submerchant';
const SUBMERCHANT_DETAIL_PATH = '/onboarding/submerchant/detail';

function config() {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  const baseUrl = (process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com').replace(/\/$/, '');
  if (!apiKey || !secretKey) throw new PaymentConfigError('IYZICO_API_KEY ve IYZICO_SECRET_KEY tanımlı olmalı');
  return { apiKey, secretKey, baseUrl };
}

/** iyzico tutarları nokta ayraçlı string ister: 1234.5 → "1234.5" */
const money = (kurus: number) => String(toLira(kurus));
const toKurus = (v: unknown) => (typeof v === 'number' ? Math.round(v * 100) : typeof v === 'string' && v !== '' ? Math.round(Number(v) * 100) : undefined);

interface BaseResponse {
  status: 'success' | 'failure';
  errorCode?: string;
  errorMessage?: string;
}

async function call<T extends BaseResponse>(path: string, payload: unknown, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  const { apiKey, secretKey, baseUrl } = config();
  const body = JSON.stringify(payload);
  const res = await fetch(baseUrl + path, { method, headers: iyzicoAuthHeaders(apiKey, secretKey, path, body), body, signal: AbortSignal.timeout(20_000) });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!json) throw new Error(`iyzico HTTP ${res.status}`);
  return json;
}

/** Başarısız iyzico yanıtını anlamlı hataya çevirir (iş kuralı reddi yeniden denenmez). */
function fail(r: BaseResponse, fallback: string): never {
  const msg = `${r.errorMessage ?? fallback}${r.errorCode ? ` (${r.errorCode})` : ''}`;
  throw new PaymentProviderRejected(msg);
}

interface InitResponse extends BaseResponse {
  token?: string;
  paymentPageUrl?: string;
}

interface DetailResponse extends BaseResponse {
  paymentStatus?: 'SUCCESS' | 'FAILURE' | 'INIT_THREEDS' | 'CALLBACK_THREEDS';
  paymentId?: string;
  paidPrice?: number;
  conversationId?: string;
  basketId?: string;
  lastFourDigits?: string;
  mdStatus?: number;
  itemTransactions?: { itemId?: string; paymentTransactionId?: string; price?: number; paidPrice?: number }[];
}

const marketplace = () => process.env.IYZICO_MARKETPLACE === 'true';

export const iyzicoProvider: PaymentProvider = {
  name: 'iyzico',
  async createCheckout(p: CheckoutParams) {
    const person = iyzicoName(p.buyer.name);
    const price = money(p.amount);
    const address = { contactName: p.buyer.name, city: p.buyer.city, country: 'Turkey', address: p.buyer.address };
    const platformKey = process.env.IYZICO_PLATFORM_SUBMERCHANT_KEY?.trim();
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
      basketItems: p.items.map((it) => {
        const base = {
          id: it.id,
          name: it.name.slice(0, 100),
          category1: it.category.slice(0, 100),
          itemType: p.purpose === 'subscription' ? 'VIRTUAL' : 'PHYSICAL',
          price: money(it.price),
        };
        if (!marketplace()) return base;
        if (it.subMerchantKey) return { ...base, subMerchantKey: it.subMerchantKey, subMerchantPrice: money(it.subMerchantPrice ?? 0) };
        // Havuz'un kendi satışı (ör. Pro üyelik): yapılandırıldıysa platformun alt satıcı anahtarıyla
        return platformKey ? { ...base, subMerchantKey: platformKey, subMerchantPrice: money(it.price) } : base;
      }),
    });
    if (r.status !== 'success' || !r.token || !r.paymentPageUrl) fail(r, 'iyzico ödeme başlatılamadı');
    return { redirectUrl: r.paymentPageUrl, token: r.token };
  },

  async retrieve(token, paymentId) {
    const r = await call<DetailResponse>(DETAIL_PATH, { locale: 'tr', conversationId: paymentId, token });
    if (r.status !== 'success') return { status: 'failed', error: r.errorMessage ?? 'Ödeme doğrulanamadı', conversationId: r.conversationId };
    const ok = r.paymentStatus === 'SUCCESS';
    return {
      status: ok ? 'succeeded' : 'failed',
      providerPaymentId: r.paymentId,
      paidAmount: toKurus(r.paidPrice),
      cardLast4: r.lastFourDigits,
      conversationId: r.conversationId ?? r.basketId,
      error: ok ? undefined : r.errorMessage ?? 'Ödeme başarısız',
      items: (r.itemTransactions ?? [])
        .filter((t) => t.itemId && t.paymentTransactionId)
        .map((t) => ({ itemId: t.itemId!, transactionId: String(t.paymentTransactionId), price: toKurus(t.price) })),
    };
  },

  async refund(req) {
    const r = await call<BaseResponse & { paymentTransactionId?: string; price?: number }>(REFUND_PATH, {
      locale: 'tr',
      conversationId: req.refundId,
      paymentTransactionId: req.transactionId,
      price: money(req.amount),
      currency: 'TRY',
      ip: req.ip,
    });
    if (r.status !== 'success') fail(r, 'İade yapılamadı');
    return { providerRefundId: r.paymentTransactionId ? `${r.paymentTransactionId}:${req.refundId.slice(0, 8)}` : undefined };
  },

  async approveItem(transactionId) {
    const r = await call<BaseResponse>(APPROVE_PATH, { locale: 'tr', conversationId: transactionId, paymentTransactionId: transactionId });
    if (r.status !== 'success') fail(r, 'Ürün onayı verilemedi');
  },

  async upsertSubMerchant(input: SubMerchantInput, existingKey) {
    const person = iyzicoName(input.contactName ?? input.name);
    const common = {
      locale: 'tr',
      conversationId: input.externalId,
      name: input.name.slice(0, 100),
      email: input.email,
      gsmNumber: iyzicoGsm(input.phone),
      address: input.address,
      iban: input.iban,
      currency: 'TRY',
    };
    const typed =
      input.type === 'PERSONAL'
        ? { contactName: person.name, contactSurname: person.surname, identityNumber: input.identityNumber }
        : input.type === 'PRIVATE_COMPANY'
          ? { taxOffice: input.taxOffice, legalCompanyTitle: input.legalTitle, identityNumber: input.identityNumber }
          : { taxOffice: input.taxOffice, taxNumber: input.taxNumber, legalCompanyTitle: input.legalTitle };
    if (existingKey) {
      const r = await call<BaseResponse>(SUBMERCHANT_PATH, { ...common, ...typed, subMerchantKey: existingKey }, 'PUT');
      if (r.status !== 'success') fail(r, 'Tedarikçi bilgileri iyzico’da güncellenemedi');
      return { subMerchantKey: existingKey };
    }
    const r = await call<BaseResponse & { subMerchantKey?: string }>(SUBMERCHANT_PATH, {
      ...common,
      ...typed,
      subMerchantExternalId: input.externalId,
      subMerchantType: input.type,
    });
    if (r.status === 'success' && r.subMerchantKey) return { subMerchantKey: r.subMerchantKey };
    // Daha önce kaydedilmiş olabilir (ör. yarıda kalan bir kayıt): dış kimlikle anahtarı sorgula.
    const d = await call<BaseResponse & { subMerchantKey?: string }>(SUBMERCHANT_DETAIL_PATH, {
      locale: 'tr',
      conversationId: input.externalId,
      subMerchantExternalId: input.externalId,
    });
    if (d.status === 'success' && d.subMerchantKey) return { subMerchantKey: d.subMerchantKey };
    fail(r, 'Tedarikçi iyzico’ya kaydedilemedi');
  },
};
