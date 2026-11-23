import { eq } from 'drizzle-orm';
import { publicRoute, notFound } from '@/server/http';
import * as s from '@/server/db/schema';

export const dynamic = 'force-dynamic';

/** Ürün fotoğrafı. Adres sürüm içerdiği (?v=) için uzun süre önbelleğe alınabilir. */
export const GET = publicRoute<{ id: string }>(async ({ db, params }) => {
  const [p] = await db.select({ image: s.products.image }).from(s.products).where(eq(s.products.id, params.id));
  if (!p?.image) throw notFound('Fotoğraf');
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p.image);
  if (!m) throw notFound('Fotoğraf');
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
});
