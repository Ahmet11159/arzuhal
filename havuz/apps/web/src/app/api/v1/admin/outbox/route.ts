import { route } from '@/server/http';
import { listOutbox } from '@/server/services/activity';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ messages: await listOutbox(db) }));
