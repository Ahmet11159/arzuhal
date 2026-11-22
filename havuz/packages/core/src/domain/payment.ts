/** Peşin siparişte kart ödemesi için süre; dolunca sipariş iptal edilir ve stok geri döner. */
export const PAYMENT_WINDOW_MINUTES = 30;

/** Test modunda kullanılabilecek kartlar (gerçek para çekilmez). */
export const TEST_CARDS = {
  success: '4242424242424242',
  declined: '4000000000000002',
  insufficient: '4000000000009995',
} as const;

export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Güçlü şifre kuralı: en az 8 karakter, harf ve rakam. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Şifre en az 8 karakter olmalı';
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(pw) || !/\d/.test(pw)) return 'Şifre en az bir harf ve bir rakam içermeli';
  return null;
}
