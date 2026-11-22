import { route } from '@/server/http';
import { adminOverview } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => adminOverview(db));
