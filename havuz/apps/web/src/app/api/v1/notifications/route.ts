import { route } from '@/server/http';
import { listNotifications } from '@/server/services/activity';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ db, session }) => listNotifications(db, session));
