import { route } from '@/server/http';
import { createWave } from '@/server/services/waves';

export const dynamic = 'force-dynamic';

export const POST = route(['admin'], async ({ req, db, actor }) => ({ wave: await createWave(db, await req.json().catch(() => ({})), actor) }));
