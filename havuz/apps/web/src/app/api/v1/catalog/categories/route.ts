import { route } from '@/server/http';
import { listCategories } from '@/server/services/catalog';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ db }) => ({ categories: await listCategories(db) }));
