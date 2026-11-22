import { route } from '@/server/http';
import { getSettings } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ db, session }) => getSettings(db, session));
