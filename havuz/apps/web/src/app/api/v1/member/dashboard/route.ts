import { route } from '@/server/http';
import { memberDashboard } from '@/server/services/member';

export const dynamic = 'force-dynamic';

export const GET = route(['member'], async ({ db, session }) => memberDashboard(db, session));
