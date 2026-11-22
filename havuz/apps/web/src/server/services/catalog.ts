import 'server-only';
import { asc, count, eq } from 'drizzle-orm';
import { pickBestOffer, type CategoryDTO, type ProductDTO, type ProductQuery } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { getActiveWave, pooledForWave, waveOfferState } from './common';
import { notFound } from '../http';

export async function listCategories(db: DB): Promise<CategoryDTO[]> {
  const rows = await db
    .select({ id: s.categories.id, slug: s.categories.slug, name: s.categories.name, icon: s.categories.icon, productCount: count(s.products.id) })
    .from(s.categories)
    .leftJoin(s.products, eq(s.products.categoryId, s.categories.id))
    .groupBy(s.categories.id)
    .orderBy(asc(s.categories.sort));
  return rows;
}

const norm = (t: string) => t.toLocaleLowerCase('tr-TR');

export async function listProducts(db: DB, q: ProductQuery = {}): Promise<ProductDTO[]> {
  const rows = await db.query.products.findMany({
    with: { category: true, offers: { with: { supplier: true } } },
    orderBy: (p, { asc }) => [asc(p.sku)],
  });
  const wave = await getActiveWave(db);
  const pooled = wave ? await pooledForWave(db, wave.id) : {};

  const needle = q.q ? norm(q.q) : null;
  return rows
    .filter((p) => !q.category || p.category.slug === q.category)
    .filter((p) => !needle || norm(`${p.name} ${p.packLabel} ${p.category.name} ${p.sku}`).includes(needle))
    .sort((a, b) => a.category.sort - b.category.sort || a.sku.localeCompare(b.sku))
    .map((p) => toProductDTO(p, wave ? pooled : null));
}

export async function getProduct(db: DB, id: string): Promise<ProductDTO> {
  const p = await db.query.products.findFirst({
    where: eq(s.products.id, id),
    with: { category: true, offers: { with: { supplier: true } } },
  });
  if (!p) throw notFound('Ürün');
  const wave = await getActiveWave(db);
  const pooled = wave ? await pooledForWave(db, wave.id, p.offers.map((o) => o.id)) : null;
  return toProductDTO(p, pooled);
}

type ProductRow = typeof s.products.$inferSelect & {
  category: typeof s.categories.$inferSelect;
  offers: (typeof s.offers.$inferSelect & { supplier: typeof s.organizations.$inferSelect })[];
};

function toProductDTO(p: ProductRow, pooled: Record<string, number> | null): ProductDTO {
  const offers = [...p.offers].sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || a.basePrice - b.basePrice);
  const best = pickBestOffer(offers, pooled ?? {});
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    packLabel: p.packLabel,
    description: p.description,
    vatRate: p.vatRate,
    marketPrice: p.marketPrice,
    category: { id: p.category.id, slug: p.category.slug, name: p.category.name, icon: p.category.icon },
    bestOfferId: best?.id ?? null,
    offers: offers.map((o) => ({
      id: o.id,
      supplier: { id: o.supplier.id, name: o.supplier.name, rating: o.supplier.rating, onTimeRate: o.supplier.onTimeRate },
      basePrice: o.basePrice,
      tiers: o.tiers,
      stock: o.stock,
      leadTimeDays: o.leadTimeDays,
      active: o.active,
      sponsored: o.sponsored,
      wave: pooled ? waveOfferState(o, pooled[o.id] ?? 0) : null,
    })),
  };
}
