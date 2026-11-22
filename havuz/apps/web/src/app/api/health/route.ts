import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import type { HealthDTO } from '@havuz/core';
import { getDb } from '@/server/db/client';
import { paymentProviderName } from '@/server/payments';
import { emailProviderName, whatsappProviderName } from '@/server/channels';

export const dynamic = 'force-dynamic';

/** Yük dengeleyici / izleme için sağlık kontrolü. Gizli bilgi döndürmez. */
export async function GET() {
  let db: HealthDTO['db'] = 'ok';
  try {
    await (await getDb()).execute(sql`select 1`);
  } catch {
    db = 'error';
  }
  const body: HealthDTO = {
    ok: db === 'ok',
    db,
    paymentProvider: paymentProviderName(),
    emailProvider: emailProviderName(),
    whatsappProvider: whatsappProviderName(),
    version: process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: db === 'ok' ? 200 : 503 });
}
