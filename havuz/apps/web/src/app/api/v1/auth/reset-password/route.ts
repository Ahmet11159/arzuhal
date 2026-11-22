import { clientIp, publicRoute, rateLimit } from '@/server/http';
import { resetPassword } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ req, db, actor }) => {
  rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  await resetPassword(db, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
