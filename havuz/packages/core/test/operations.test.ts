import { describe, expect, it } from 'vitest';
import {
  computeSettlement,
  createOrgInput,
  formatSettlementNumber,
  luhnValid,
  normalizeIban,
  passwordProblem,
  startPaymentInput,
  testCardInput,
  TEST_CARDS,
} from '../src';

describe('hakediş', () => {
  it('KDV dahil satıştan komisyon ve iadeleri düşer', () => {
    const r = computeSettlement(
      [
        { qty: 2, finalUnitPrice: 100_000, vatRate: 1, commissionBps: 300 },
        { qty: 1, finalUnitPrice: 50_000, vatRate: 20, commissionBps: 300 },
      ],
      [5_000],
    );
    expect(r.grossSales).toBe(200_000 + 2_000 + 50_000 + 10_000);
    expect(r.commission).toBe(6_000 + 1_500);
    expect(r.issueDeductions).toBe(5_000);
    expect(r.netAmount).toBe(262_000 - 7_500 - 5_000);
    expect(r.itemCount).toBe(2);
  });
  it('numara biçimi', () => expect(formatSettlementNumber(7, 2026)).toBe('HKD-2026-00007'));
});

describe('IBAN', () => {
  it('geçerli TR IBAN’ı normalize eder', () => {
    expect(normalizeIban('tr33 0006 1005 1978 6457 8413 26')).toBe('TR330006100519786457841326');
  });
  it('hatalı kontrol hanesini reddeder', () => {
    expect(normalizeIban('TR330006100519786457841327')).toBeNull();
    expect(normalizeIban('DE89370400440532013000')).toBeNull();
  });
});

describe('ödeme girdileri', () => {
  it('Luhn kontrolü ve test kartları', () => {
    expect(luhnValid(TEST_CARDS.success)).toBe(true);
    expect(luhnValid(TEST_CARDS.declined)).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
  });
  it('kart formu doğrulanır', () => {
    expect(testCardInput.safeParse({ holder: 'Ali Veli', cardNumber: '4242 4242 4242 4242', expiry: '12/30', cvc: '123' }).success).toBe(true);
    expect(testCardInput.safeParse({ holder: 'Ali Veli', cardNumber: '4242', expiry: '13/30', cvc: '1' }).success).toBe(false);
  });
  it('sipariş ödemesi için sipariş kimliği zorunlu', () => {
    expect(startPaymentInput.safeParse({ purpose: 'order' }).success).toBe(false);
    expect(startPaymentInput.safeParse({ purpose: 'subscription' }).success).toBe(true);
  });
});

describe('hesap', () => {
  it('zayıf şifreyi reddeder', () => {
    expect(passwordProblem('kisa1')).not.toBeNull();
    expect(passwordProblem('sadeceharf')).not.toBeNull();
    expect(passwordProblem('Guclu2026')).toBeNull();
  });
  it('işletme için işletme türü zorunlu, tedarikçi için değil', () => {
    const base = { name: 'Test', city: 'İstanbul', owner: { name: 'Ad Soyad', email: 'a@b.co' } };
    expect(createOrgInput.safeParse({ ...base, type: 'member' }).success).toBe(false);
    expect(createOrgInput.safeParse({ ...base, type: 'member', businessType: 'cafe' }).success).toBe(true);
    expect(createOrgInput.safeParse({ ...base, type: 'supplier' }).success).toBe(true);
  });
});
