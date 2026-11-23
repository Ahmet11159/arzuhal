/**
 * iyzico anahtarlarınızı ve imzayı GERÇEK iyzico API'sine karşı kontrol eder (para hareketi yok).
 *
 *   1) apps/web/.env dosyasına IYZICO_API_KEY, IYZICO_SECRET_KEY, IYZICO_BASE_URL yazın
 *   2) npm run iyzico:check   (havuz klasöründen)
 *
 * .env dosyası, uygulamanın kendisiyle aynı yöntemle (Next.js) okunur. Bir değer bulunamazsa
 * dosyadaki ilgili satırlar incelenip neyin düzeltileceği söylenir; gizli değerler ekrana yazılmaz.
 * Kart BIN sorgusu (/payment/bin/check) imzalı bir istektir: başarılı yanıt, anahtarların ve
 * imza algoritmasının doğru olduğunu kanıtlar.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { iyzicoAuthHeaders } from '../src/server/payments/iyzico-auth';

const KEYS = ['PAYMENT_PROVIDER', 'IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL', 'APP_URL'] as const;
const SECRET = new Set(['IYZICO_API_KEY', 'IYZICO_SECRET_KEY']);

/** .env dosyasındaki satırlara bakıp her anahtar için ne görüldüğünü anlatır. */
function diagnose(dir: string): string[] {
  const out: string[] = [];
  const file = path.join(dir, '.env');
  if (!existsSync(file)) {
    out.push(`  • ${file} dosyası yok. Oluşturun: cp apps/web/.env.example apps/web/.env`);
    return out;
  }
  const raw = readFileSync(file, 'utf8');
  if (raw.trimStart().startsWith('{\\rtf')) {
    out.push('  • .env dosyası "zengin metin" (RTF) olarak kaydedilmiş. TextEdit\'te Biçim → Düz Metin Yap seçip kaydedin.');
    return out;
  }
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/);
  for (const key of KEYS) {
    const active = lines.find((l) => new RegExp(`^\\s*(export\\s+)?${key}\\s*=`).test(l));
    const commented = lines.find((l) => new RegExp(`^\\s*#+\\s*${key}\\s*=\\s*\\S`).test(l));
    const value = process.env[key];
    if (value) {
      out.push(`  ✓ ${key}: ${SECRET.has(key) ? `dolu (${value.length} karakter)` : value}`);
    } else if (commented && !active) {
      out.push(`  ✗ ${key}: satırın başında # işareti var, bu yüzden okunmuyor. Satır başındaki "# " kısmını silip kaydedin.`);
    } else if (active) {
      out.push(`  ✗ ${key}: satır var ama değeri boş. "=" işaretinden sonra değeri yazıp kaydedin (Cmd+S).`);
    } else {
      out.push(`  ✗ ${key}: dosyada yok. Yeni bir satır olarak ekleyin: ${key}=...`);
    }
  }
  return out;
}

async function main() {
  const dir = process.cwd();
  loadEnvConfig(dir, true, { info: () => {}, error: () => {} });
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secret = process.env.IYZICO_SECRET_KEY?.trim();
  const base = (process.env.IYZICO_BASE_URL?.trim() || 'https://sandbox-api.iyzipay.com').replace(/\/$/, '');

  console.log(`Okunan dosya: ${path.join(dir, '.env')}`);
  for (const line of diagnose(dir)) console.log(line);
  if (!apiKey || !secret) {
    console.error('\n✗ IYZICO_API_KEY ve IYZICO_SECRET_KEY okunamadı. Yukarıdaki ✗ satırlarını düzeltip tekrar çalıştırın.');
    process.exit(1);
  }
  if (process.env.PAYMENT_PROVIDER !== 'iyzico') {
    console.log('  ! PAYMENT_PROVIDER=iyzico değil: bağlantı kontrolü yapılır ama uygulama ödemede test ekranını açar.');
  }
  if (!/^https:\/\/(sandbox-)?api\.iyzipay\.com$/.test(base)) {
    console.error(`\n✗ IYZICO_BASE_URL beklenmeyen bir adres: ${base}`);
    console.error('  Test için: https://sandbox-api.iyzipay.com   Canlı için: https://api.iyzipay.com');
    process.exit(1);
  }
  const sandboxBase = base.includes('sandbox');
  const sandboxKey = apiKey.startsWith('sandbox-');
  console.log(`\niyzico adresi: ${base}${sandboxBase ? ' (test ortamı)' : ' (CANLI ortam)'}`);
  if (sandboxBase !== sandboxKey) {
    console.log(
      sandboxKey
        ? '  ! Anahtar test (sandbox) anahtarına benziyor ama adres canlı. IYZICO_BASE_URL=https://sandbox-api.iyzipay.com olmalı.'
        : '  ! Adres test ortamı ama anahtar "sandbox-" ile başlamıyor. Test panelinden (sandbox-merchant.iyzipay.com) aldığınızdan emin olun.',
    );
  }

  const p = '/payment/bin/check';
  const body = JSON.stringify({ locale: 'tr', conversationId: 'havuz-baglanti-kontrolu', binNumber: '552879' });
  const res = await fetch(base + p, { method: 'POST', headers: iyzicoAuthHeaders(apiKey, secret, p, body), body });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok && json?.status === 'success') {
    console.log(`✓ Bağlantı ve imza doğru. iyzico yanıtı: ${json.bankName ?? ''} ${json.cardAssociation ?? ''} ${json.cardType ?? ''}`.trim());
    console.log('  Sıradaki adım: npm run dev ile uygulamayı başlatıp test kartıyla bir ödeme yapın.');
    process.exit(0);
  }
  console.error(`✗ iyzico isteği reddetti (HTTP ${res.status}): ${json?.errorCode ?? ''} ${json?.errorMessage ?? JSON.stringify(json)}`);
  console.error('  Kontrol edin: anahtarlar eksiksiz kopyalandı mı (başında/sonunda boşluk yok), API ve Güvenlik anahtarı yer değiştirmiş olmasın.');
  process.exit(1);
}

main().catch((e) => {
  console.error('✗ iyzico’ya ulaşılamadı:', e instanceof Error ? e.message : e);
  process.exit(1);
});
