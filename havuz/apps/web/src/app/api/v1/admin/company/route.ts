import { route } from '@/server/http';
import { getCompany, updateCompany } from '@/server/services/site';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => getCompany(db));
export const PUT = route(['admin'], async ({ req, db, actor }) => updateCompany(db, await req.json().catch(() => ({})), actor));
