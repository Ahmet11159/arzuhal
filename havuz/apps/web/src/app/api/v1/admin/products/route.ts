import { route } from '@/server/http';
import { adminProducts, createProduct } from '@/server/services/catalog-admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ products: await adminProducts(db) }));

export const POST = route(['admin'], async ({ req, db, actor }) => createProduct(db, await req.json().catch(() => ({})), actor));
