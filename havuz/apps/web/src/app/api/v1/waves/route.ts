import { route } from '@/server/http';
import { listWaves } from '@/server/services/waves';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ db }) => ({ waves: await listWaves(db) }));
