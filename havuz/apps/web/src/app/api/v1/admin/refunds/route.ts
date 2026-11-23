import { route } from '@/server/http';
import { listRefunds } from '@/server/services/refunds';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ refunds: await listRefunds(db, { limit: 200 }) }));
