import { route } from '@/server/http';
import { getWave } from '@/server/services/waves';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['member', 'supplier', 'admin'], async ({ db, params }) => ({ wave: await getWave(db, params.id) }));
