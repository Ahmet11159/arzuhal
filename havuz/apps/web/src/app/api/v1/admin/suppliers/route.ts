import { route } from '@/server/http';
import { adminSuppliers } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ suppliers: await adminSuppliers(db) }));
