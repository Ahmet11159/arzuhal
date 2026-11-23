import { createHmac, randomBytes } from 'node:crypto';

/**
 * iyzico IYZWSv2 imzası (sunucu kodu ve kontrol betiği ortak kullanır):
 *   Authorization: IYZWSv2 base64("apiKey:<key>&randomKey:<rnd>&signature:<hex(HMAC-SHA256(secret, rnd + uriPath + body))>")
 */
export function iyzicoAuthHeaders(apiKey: string, secretKey: string, uriPath: string, body: string, randomKey?: string) {
  const rnd = randomKey ?? `${Date.now()}${randomBytes(4).toString('hex')}`;
  const signature = createHmac('sha256', secretKey).update(rnd + uriPath + body).digest('hex');
  const auth = Buffer.from(`apiKey:${apiKey}&randomKey:${rnd}&signature:${signature}`).toString('base64');
  return { Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': rnd, 'Content-Type': 'application/json', Accept: 'application/json' };
}

/** iyzico'nun beklediği GSM biçimi: +905xxxxxxxxx. Geçersizse gönderilmez (alan isteğe bağlı). */
export function iyzicoGsm(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = '9' + d;
  if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  return /^90\d{10}$/.test(d) ? `+${d}` : undefined;
}

/**
 * Ad soyadı iyzico'nun istediği ad / soyad alanlarına böler. Türkçe kullanımda soyad son kelimedir:
 * "Ali Rıza Yılmaz" → { name: "Ali Rıza", surname: "Yılmaz" }. Tek kelimede ikisi de aynı olur.
 */
export function iyzicoName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: 'Havuz', surname: 'Üyesi' };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] };
}
