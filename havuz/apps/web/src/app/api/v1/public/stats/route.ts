import { publicRoute } from '@/server/http';
import { publicStats } from '@/server/services/public';

export const dynamic = 'force-dynamic';

export const GET = publicRoute(async ({ db }) => publicStats(db));
