import 'server-only';
import { iyzicoProvider } from './iyzico';
import { PaymentConfigError, type PaymentProvider } from './provider';
import { testProvider } from './test-provider';

/**
 * PAYMENT_PROVIDER = test | iyzico
 * Geliştirmede varsayılan "test". Production'da açıkça seçilmeli; "test" yalnızca
 * PAYMENT_ALLOW_TEST=true ile (ör. demo sunucusu) kullanılabilir.
 */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? (process.env.NODE_ENV === 'production' ? '' : 'test');
  if (name === 'iyzico') return iyzicoProvider;
  if (name === 'test') {
    if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_ALLOW_TEST !== 'true') {
      throw new PaymentConfigError('Production ortamında test ödeme modu kapalı (PAYMENT_ALLOW_TEST=true ile açılır)');
    }
    return testProvider;
  }
  throw new PaymentConfigError('PAYMENT_PROVIDER tanımlı değil (test | iyzico)');
}

export function paymentProviderName(): string {
  try {
    return paymentProvider().name;
  } catch {
    return 'yapılandırılmamış';
  }
}

export { PaymentConfigError };
