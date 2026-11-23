import 'server-only';
import { asc, count, eq, getTableColumns, like, max, min, sql } from 'drizzle-orm';
import {
  createCategoryInput,
  createOfferInput,
  createProductInput,
  formatTRY,
  updateProductInput,
  type AdminProductDTO,
  productImageUrl,
} from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { AppError, badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { audit, type Actor } from '../audit';

const slugify = (t: string) =>
  t
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export async function adminProducts(db: DB): Promise<AdminProductDTO[]> {
  const rows = await db
    .select({
      p: getTableColumns(s.products),
      imageVersion: sql<string | null>`left(md5(${s.products.image}), 10)`,
      c: s.categories,
      offerCount: count(s.offers.id),
      bestPrice: min(s.offers.basePrice),
    })
    .from(s.products)
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .leftJoin(s.offers, eq(s.offers.productId, s.products.id))
    .groupBy(s.products.id, s.categories.id)
    .orderBy(asc(s.categories.sort), asc(s.products.sku));
  return rows.map((r) => ({
    id: r.p.id,
    sku: r.p.sku,
    name: r.p.name,
    unit: r.p.unit,
    packLabel: r.p.packLabel,
    description: r.p.description,
    vatRate: r.p.vatRate,
    marketPrice: r.p.marketPrice,
    imageUrl: productImageUrl(r.p.id, r.imageVersion),
    category: { id: r.c.id, name: r.c.name, icon: r.c.icon },
    offerCount: r.offerCount,
    bestPrice: r.bestPrice ?? null,
  }));
}

export async function createCategory(db: DB, raw: unknown, actor: Actor) {
  const input = createCategoryInput.parse(raw);
  const slug = slugify(input.name);
  if (!slug) throw badRequest('Geçerli bir kategori adı girin');
  return db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, slug));
    if (exists) throw new AppError(409, 'exists', 'Bu isimde bir kategori zaten var');
    const [{ m }] = await tx.select({ m: max(s.categories.sort) }).from(s.categories);
    const [c] = await tx.insert(s.categories).values({ slug, name: input.name, icon: input.icon, sort: (m ?? 0) + 1 }).returning();
    await audit(tx, actor, 'category.create', 'category', c.id, `Kategori eklendi: ${c.name}`);
    return { id: c.id };
  });
}

/** SKU kategoriye göre otomatik üretilir: kategori kodu + sıra (örn. KI-007). */
export async function createProduct(db: DB, raw: unknown, actor: Actor) {
  const input = createProductInput.parse(raw);
  return db.transaction(async (tx) => {
    const [cat] = await tx.select().from(s.categories).where(eq(s.categories.id, input.categoryId));
    if (!cat) throw notFound('Kategori');
    const prefix = slugify(cat.name).replace(/-/g, '').slice(0, 2).toUpperCase();
    const [{ n }] = await tx
      .select({ n: sql<number>`coalesce(max(cast(split_part(${s.products.sku}, '-', 2) as integer)), 0)`.mapWith(Number) })
      .from(s.products)
      .where(like(s.products.sku, `${prefix}-%`));
    const sku = `${prefix}-${String(n + 1).padStart(3, '0')}`;
    const [p] = await tx.insert(s.products).values({ ...input, sku }).returning();
    await audit(tx, actor, 'product.create', 'product', p.id, `Ürün eklendi: ${p.name} (${sku}), piyasa ${formatTRY(p.marketPrice)}`);
    return { id: p.id, sku };
  });
}

export async function updateProduct(db: DB, id: string, raw: unknown, actor: Actor) {
  const input = updateProductInput.parse(raw);
  await db.transaction(async (tx) => {
    const [p] = await tx.update(s.products).set(input).where(eq(s.products.id, id)).returning();
    if (!p) throw notFound('Ürün');
    await audit(tx, actor, 'product.update', 'product', id, `Ürün güncellendi: ${p.name} (${Object.keys(input).map((k) => (k === 'image' ? (input.image ? 'fotoğraf' : 'fotoğraf kaldırıldı') : k)).join(', ')})`, {
      ...(input.marketPrice ? { marketPrice: input.marketPrice } : {}),
    });
  });
}

/** Tedarikçi, katalogda henüz teklif vermediği bir ürüne teklif açar. */
export async function createOffer(db: DB, session: SessionPayload, raw: unknown, actor: Actor) {
  const input = createOfferInput.parse(raw);
  const tiers = [...input.tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].unitPrice >= tiers[i - 1].unitPrice) throw badRequest('Her kademe bir öncekinden ucuz olmalı');
    if (tiers[i].minQty === tiers[i - 1].minQty) throw badRequest('Aynı eşikte iki kademe olamaz');
  }
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(s.products).where(eq(s.products.id, input.productId));
    if (!p) throw notFound('Ürün');
    const [o] = await tx
      .insert(s.offers)
      .values({ productId: p.id, supplierId: session.org, basePrice: input.basePrice, tiers, stock: input.stock, leadTimeDays: input.leadTimeDays })
      .onConflictDoNothing()
      .returning();
    if (!o) throw new AppError(409, 'exists', 'Bu ürün için zaten bir teklifiniz var; Teklifler sayfasından düzenleyebilirsiniz');
    await audit(tx, { ...actor, userId: session.sub, orgId: session.org }, 'offer.create', 'offer', o.id, `${p.name} için teklif açıldı: ${formatTRY(o.basePrice)}`);
    return { id: o.id };
  });
}
