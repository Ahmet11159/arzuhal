import 'server-only';
import { iyzicoProvider } from './iyzico';
import { PaymentConfigError, PaymentProviderRejected, type PaymentProvider } from './provider';
import { testProvider } from './test-provider';

/**
 * PAYMENT_PROVIDER = test | iyzico
 * Geliştirmede varsayılan "test". Production'da açıkça seçilmeli; "test" yalnızca
 * PAYMENT_ALLOW_TEST=true ile (ör. demo sunucusu) kullanılabilir.
 */
export function paymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? (process.env.NODE_ENV === 'production' ? '' : 'test');
  return providerByName(name);
}

/** Kayıtlı bir ödemenin sağlayıcısı (iade/onay, ödemenin yapıldığı sağlayıcıyla yapılır). */
export function providerByName(name: string): PaymentProvider {
  if (name === 'iyzico') return iyzicoProvider;
  if (name === 'test') {
    if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_ALLOW_TEST !== 'true') {
      throw new PaymentConfigError('Production ortamında test ödeme modu kapalı (PAYMENT_ALLOW_TEST=true ile açılır)');
    }
    return testProvider;
  }
  throw new PaymentConfigError('PAYMENT_PROVIDER tanımlı değil (test | iyzico)');
}

/**
 * Pazaryeri modu: ödeme tedarikçi payı ayrılarak alınır, tedarikçiye iyzico öder.
 * Test sağlayıcısında her zaman açıktır (taklit edilir). iyzico'da hesabınız Pazaryeri olarak
 * tanımlandığında IYZICO_MARKETPLACE=true yapılır; kapalıyken ödemeler standart alınır ve
 * hakedişler Havuz tarafından havaleyle ödenir.
 */
export function marketplaceEnabled(): boolean {
  try {
    const p = paymentProvider();
    return p.name === 'test' ? process.env.PAYMENT_MARKETPLACE !== 'false' : process.env.IYZICO_MARKETPLACE === 'true';
  } catch {
    return false;
  }
}

export function paymentProviderName(): string {
  try {
    return paymentProvider().name;
  } catch {
    return 'yapılandırılmamış';
  }
}

export { PaymentConfigError, PaymentProviderRejected };
