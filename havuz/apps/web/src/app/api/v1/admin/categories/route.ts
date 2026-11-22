import { route } from '@/server/http';
import { createCategory } from '@/server/services/catalog-admin';

export const dynamic = 'force-dynamic';

export const POST = route(['admin'], async ({ req, db, actor }) => createCategory(db, await req.json().catch(() => ({})), actor));
