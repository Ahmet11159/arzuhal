import { productQueryInput } from '@havuz/core';
import { route } from '@/server/http';
import { listProducts } from '@/server/services/catalog';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'supplier', 'admin'], async ({ req, db }) => {
  const url = new URL(req.url);
  const q = productQueryInput.parse({ category: url.searchParams.get('category') ?? undefined, q: url.searchParams.get('q') ?? undefined });
  return { products: await listProducts(db, q) };
});
