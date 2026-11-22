import { route } from '@/server/http';
import { updateProduct } from '@/server/services/catalog-admin';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  await updateProduct(db, params.id, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
