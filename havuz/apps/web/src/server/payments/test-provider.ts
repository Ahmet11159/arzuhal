import 'server-only';
import { randomBytes } from 'node:crypto';
import type { PaymentProvider } from './provider';

/**
 * Dahili test sağlayıcısı: gerçek para çekmez. Kullanıcı uygulama içindeki test ödeme
 * sayfasına yönlendirilir ve test kartlarıyla başarılı/başarısız ödeme deneyebilir.
 * Pazaryeri işlemlerini (alt satıcı kaydı, ürün onayı, kısmi iade) taklit eder.
 * Production'da yalnızca PAYMENT_PROVIDER=test ve PAYMENT_ALLOW_TEST=true ile açılır.
 */
export const testProvider: PaymentProvider = {
  name: 'test',
  async createCheckout(p) {
    return { redirectUrl: `/odeme/test/${p.paymentId}`, token: `test_${randomBytes(12).toString('hex')}` };
  },
  async retrieve() {
    // Test modunda sonuç, test ödeme sayfasından doğrudan gelir (completeTestPayment).
    return { status: 'failed', error: 'Test sağlayıcısında retrieve kullanılmaz' };
  },
  async refund(r) {
    return { providerRefundId: `test_rf_${r.refundId.slice(0, 8)}` };
  },
  async approveItem() {},
  async upsertSubMerchant(input, existingKey) {
    return { subMerchantKey: existingKey ?? `test_sm_${input.externalId.slice(0, 8)}` };
  },
};

/** Test ödemesinde kalemlere verilen işlem numarası. */
export const testTxnId = (paymentItemId: string) => `test_tx_${paymentItemId}`;
