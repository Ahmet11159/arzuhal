import { route } from '@/server/http';
import { createOrganization } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const POST = route(['admin'], async ({ req, db, actor }) => createOrganization(db, await req.json().catch(() => ({})), actor));
