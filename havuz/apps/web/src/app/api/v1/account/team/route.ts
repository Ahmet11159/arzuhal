import { route } from '@/server/http';
import { inviteUser } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const POST = route(['member', 'supplier', 'admin'], async ({ req, db, session, actor }) => inviteUser(db, session, await req.json().catch(() => ({})), actor));
