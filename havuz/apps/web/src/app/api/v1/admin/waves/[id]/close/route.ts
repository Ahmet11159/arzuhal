import { route } from '@/server/http';
import { closeWave } from '@/server/services/waves';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string }>(['admin'], async ({ db, params, actor }) => closeWave(db, params.id, actor));
