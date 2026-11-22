import { route } from '@/server/http';
import { updateProfile } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const PATCH = route(['member', 'supplier', 'admin'], async ({ req, db, session, actor }) => {
  await updateProfile(db, session, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
