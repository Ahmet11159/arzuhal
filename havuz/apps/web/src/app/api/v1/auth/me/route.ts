import { route } from '@/server/http';
import { me } from '@/server/services/auth';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ db, session }) => ({ user: await me(db, session.sub) }), { allowMustChange: true });
