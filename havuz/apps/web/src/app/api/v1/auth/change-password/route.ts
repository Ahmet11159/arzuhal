import { route } from '@/server/http';
import { changePassword } from '@/server/services/accounts';
import { setSessionCookie } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export const POST = route(
  ['member', 'supplier', 'admin'],
  async ({ req, db, session, actor }) => {
    const token = await changePassword(db, session, await req.json().catch(() => ({})), actor);
    setSessionCookie(token);
    return { token };
  },
  { allowMustChange: true },
);
