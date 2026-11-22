import { route } from '@/server/http';
import { memberAccount } from '@/server/services/member';

export const dynamic = 'force-dynamic';

export const GET = route(['member'], async ({ db, session }) => memberAccount(db, session));
