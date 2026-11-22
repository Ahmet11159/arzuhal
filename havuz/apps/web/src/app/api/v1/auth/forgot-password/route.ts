import { clientIp, publicRoute, rateLimit } from '@/server/http';
import { requestPasswordReset } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ req, db, actor }) => {
  rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  await requestPasswordReset(db, await req.json().catch(() => ({})), actor);
  // Kayıtlı olsun olmasın aynı yanıt: e-posta adresi keşfedilemez.
  return { ok: true };
});
