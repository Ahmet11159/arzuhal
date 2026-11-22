import { route } from '@/server/http';
import { adminLeads } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ leads: await adminLeads(db) }));
