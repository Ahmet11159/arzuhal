import { clientIp, publicRoute, rateLimit } from '@/server/http';
import { createLead } from '@/server/services/public';

export const dynamic = 'force-dynamic';

export const POST = publicRoute(async ({ req, db }) => {
  rateLimit(`lead:${clientIp(req)}`, 5, 10 * 60_000);
  await createLead(db, await req.json().catch(() => ({})));
  return { ok: true };
});
