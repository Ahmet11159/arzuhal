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
