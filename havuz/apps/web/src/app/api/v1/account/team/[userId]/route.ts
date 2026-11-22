import { route } from '@/server/http';
import { setUserActive } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ userId: string }>(['member', 'supplier', 'admin'], async ({ req, db, session, params, actor }) => {
  await setUserActive(db, session, params.userId, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
