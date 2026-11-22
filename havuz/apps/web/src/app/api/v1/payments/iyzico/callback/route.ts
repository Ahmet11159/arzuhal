import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { APP_URL } from '@/server/notify';
import { handleIyzicoCallback } from '@/server/services/payments';

export const dynamic = 'force-dynamic';

/**
 * iyzico, ödeme sonrası kullanıcının tarayıcısıyla bu adrese `token` POST eder.
 * Sonuç her zaman sunucudan sunucuya (retrieve) doğrulanır; form verisine tek başına güvenilmez.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');
  if (!token) return NextResponse.redirect(`${APP_URL()}/uye?odeme=hata`, 303);
  try {
    const r = await handleIyzicoCallback(await getDb(), token);
    return NextResponse.redirect(`${APP_URL()}${r.redirect}`, 303);
  } catch (e) {
    console.error('[iyzico callback]', e);
    return NextResponse.redirect(`${APP_URL()}/uye?odeme=hata`, 303);
  }
}
