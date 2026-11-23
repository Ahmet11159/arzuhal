/**
 * iyzico anahtarlarınızı ve imzayı GERÇEK iyzico API'sine karşı kontrol eder (para hareketi yok).
 *
 *   1) apps/web/.env dosyasına IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL yazın
 *   2) npm run iyzico:check -w @havuz/web
 *
 * Kart BIN sorgusu (/payment/bin/check) imzalı bir istektir: başarılı yanıt, anahtarların ve
 * imza algoritmasının doğru olduğunu kanıtlar.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { iyzicoAuthHeaders } from '../src/server/payments/iyzico-auth';

function loadEnv() {
  const file = path.join(process.cwd(), '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

async function main() {
  loadEnv();
  const apiKey = process.env.IYZICO_API_KEY;
  const secret = process.env.IYZICO_SECRET_KEY;
  const base = (process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com').replace(/\/$/, '');
  if (!apiKey || !secret) {
    console.error('✗ IYZICO_API_KEY ve IYZICO_SECRET_KEY bulunamadı. apps/web/.env dosyasına ekleyin.');
    process.exit(1);
  }
  console.log(`iyzico adresi: ${base}${base.includes('sandbox') ? ' (test ortamı)' : ' (CANLI ortam)'}`);
  console.log(`API anahtarı: ${apiKey.slice(0, 8)}… (${apiKey.length} karakter)`);

  const p = '/payment/bin/check';
  const body = JSON.stringify({ locale: 'tr', conversationId: 'havuz-baglanti-kontrolu', binNumber: '552879' });
  const res = await fetch(base + p, { method: 'POST', headers: iyzicoAuthHeaders(apiKey, secret, p, body), body });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && json?.status === 'success') {
    console.log(`✓ Bağlantı ve imza doğru. iyzico yanıtı: ${json.bankName ?? ''} ${json.cardAssociation ?? ''} ${json.cardType ?? ''}`.trim());
    console.log('  Sıradaki adım: PAYMENT_PROVIDER=iyzico ile uygulamayı başlatıp test kartıyla bir ödeme yapın.');
    process.exit(0);
  }
  console.error(`✗ iyzico isteği reddetti (HTTP ${res.status}): ${json?.errorCode ?? ''} ${json?.errorMessage ?? JSON.stringify(json)}`);
  console.error('  Kontrol edin: anahtarlar doğru kopyalandı mı (başında/sonunda boşluk yok), sandbox anahtarı sandbox adresiyle mi kullanılıyor?');
  process.exit(1);
}

main().catch((e) => {
  console.error('✗ iyzico’ya ulaşılamadı:', e instanceof Error ? e.message : e);
  process.exit(1);
});
