import { describe, expect, it } from 'vitest';
import {
  allocate,
  computeCharges,
  computeSettlement,
  payoutProfileProblems,
  supplierShareAfterRefund,
  tcknValid,
  vknValid,
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
  it('dondurulmuş kalem tutarlarını toplar: satış − iade − komisyon − komisyon KDV = net', () => {
    const b = computeCharges(
      [
        { id: 'a', qty: 2, finalUnitPrice: 100_000, vatRate: 1, commissionBps: 300 },
        { id: 'b', qty: 1, finalUnitPrice: 50_000, vatRate: 20, commissionBps: 300, issueCredit: 6_000 },
      ],
      0,
    );
    const r = computeSettlement(b.lines.map((l) => ({ charge: l.charge, issueDeduction: l.issueCredit, commission: l.commission, commissionVat: l.commissionVat, supplierShare: l.supplierShare })));
    expect(r.grossSales).toBe(202_000 + 60_000);
    expect(r.issueDeductions).toBe(6_000);
    // b kaleminin %10'u iade edildi → komisyonun da %10'u alınmaz
    expect(r.commission).toBe(6_000 + 1_350);
    expect(r.commissionVat).toBe(1_200 + 270);
    expect(r.netAmount).toBe(r.grossSales - r.issueDeductions - r.commission - r.commissionVat);
    expect(r.itemCount).toBe(2);
  });
  it('numara biçimi', () => expect(formatSettlementNumber(7, 2026)).toBe('HKD-2026-00007'));
});

describe('pazaryeri tahsilat dökümü', () => {
  const items = [
    { id: 'x', qty: 3, finalUnitPrice: 33_333, vatRate: 10, commissionBps: 300 },
    { id: 'y', qty: 1, finalUnitPrice: 12_345, vatRate: 20, commissionBps: 450 },
    { id: 'z', qty: 5, finalUnitPrice: 9_999, vatRate: 1, commissionBps: 300, cancelled: true },
  ];
  it('kalem tutarları toplamı sipariş toplamına kuruşu kuruşuna eşittir; vade farkı kalemlere dağılır', () => {
    const b = computeCharges(items, 150);
    expect(b.lines.reduce((a, l) => a + l.charge, 0)).toBe(b.total);
    expect(b.lines.reduce((a, l) => a + l.financingShare, 0)).toBe(b.financingFee);
    expect(b.total).toBe(b.subtotal + b.vat + b.financingFee);
    expect(b.lines[2]).toMatchObject({ charge: 0, supplierShare: 0, commission: 0 });
  });
  it('tedarikçi payı = tutar − komisyon − komisyon KDV’si; vade farkı tedarikçide kalır', () => {
    const b = computeCharges(items, 150);
    for (const l of b.lines) expect(l.supplierShare).toBe(Math.max(0, l.charge - l.commission - l.commissionVat));
    const x = b.lines[0];
    expect(x.commission).toBe(Math.round((99_999 * 300) / 10_000));
    expect(x.commissionVat).toBe(Math.round(x.commission * 0.2));
  });
  it('allocate toplamı korur ve ağırlıksız durumda sıfır döner', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(7, [0, 0])).toEqual([0, 0]);
    expect(allocate(0, [5])).toEqual([0]);
  });
  it('kısmi iade tedarikçi payını orantılı düşürür', () => {
    expect(supplierShareAfterRefund(10_000, 9_000, 2_500)).toBe(6_750);
    expect(supplierShareAfterRefund(10_000, 9_000, 10_000)).toBe(0);
  });
});

describe('alt satıcı bilgileri', () => {
  it('T.C. kimlik ve vergi numarası algoritmaları', () => {
    expect(tcknValid('10000000146')).toBe(true);
    expect(tcknValid('10000000147')).toBe(false);
    expect(tcknValid('01234567890')).toBe(false);
    // VKN: ilk 9 haneden kontrol hanesi hesaplanır
    const nine = '123456789';
    const ok = Array.from({ length: 10 }, (_, d) => nine + d).filter(vknValid);
    expect(ok).toHaveLength(1);
    expect(vknValid('12345')).toBe(false);
  });
  it('şirket türüne göre eksikleri listeler', () => {
    const base = { legalTitle: null, taxOffice: null, taxNo: null, identityNumber: null, contactName: null, address: 'Atatürk Cad. No:1 Kadıköy', iban: 'TR330006100519786457841326', email: 'a@b.co', phone: '05321234567' };
    expect(payoutProfileProblems({ ...base, subMerchantType: null })).toEqual(['Şirket türü seçilmeli']);
    expect(payoutProfileProblems({ ...base, subMerchantType: 'PERSONAL', contactName: 'Ali Veli', identityNumber: '10000000146' })).toEqual([]);
    expect(payoutProfileProblems({ ...base, subMerchantType: 'LIMITED_OR_JOINT_STOCK_COMPANY' })).toEqual(['Ticari unvan', 'Vergi dairesi', 'Vergi no (10 hane)']);
  });
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
