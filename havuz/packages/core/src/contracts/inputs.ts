import { z } from 'zod';
import { BUSINESS_TYPES, ISSUE_TYPES, ITEM_STATUSES, PAYMENT_TERMS } from '../domain/enums';

/** İstemci ve sunucunun ortak kullandığı istek şemaları (tek doğruluk kaynağı). */

export const loginInput = z.object({
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});
export type LoginInput = z.infer<typeof loginInput>;

export const createOrderInput = z.object({
  items: z
    .array(z.object({ offerId: z.string().min(1), qty: z.number().int().min(1).max(10_000) }))
    .min(1, 'Sepet boş')
    .max(100),
  waveId: z.string().min(1).nullable().default(null),
  paymentTerm: z.enum(PAYMENT_TERMS).default('cash'),
  useCredit: z.boolean().default(false),
  note: z.string().trim().max(500).optional(),
});
export type CreateOrderInput = z.input<typeof createOrderInput>;

/** Mal kabul fotoğrafı: istemcide sıkıştırılmış JPEG/PNG/WebP data URL (en fazla ~500 KB). */
export const issuePhoto = z
  .string()
  .max(700_000, 'Fotoğraf çok büyük')
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Geçersiz fotoğraf biçimi');

export const reportIssueInput = z.object({
  type: z.enum(ISSUE_TYPES),
  qty: z.number().int().min(1),
  note: z.string().trim().max(500).optional(),
  photo: issuePhoto.optional(),
});
export type ReportIssueInput = z.infer<typeof reportIssueInput>;

export const updateItemStatusInput = z.object({
  status: z.enum(ITEM_STATUSES),
});
export type UpdateItemStatusInput = z.infer<typeof updateItemStatusInput>;

export const priceTierInput = z.object({
  minQty: z.number().int().min(2),
  unitPrice: z.number().int().min(1),
});

export const updateOfferInput = z
  .object({
    basePrice: z.number().int().min(1),
    stock: z.number().int().min(0),
    active: z.boolean(),
    leadTimeDays: z.number().int().min(0).max(30),
    tiers: z.array(priceTierInput).max(6),
  })
  .partial()
  .refine(
    (v) => !v.tiers || !v.basePrice || v.tiers.every((t) => t.unitPrice < v.basePrice!),
    'Kademe fiyatları taban fiyattan düşük olmalı',
  );
export type UpdateOfferInput = z.infer<typeof updateOfferInput>;

export const createWaveInput = z
  .object({
    title: z.string().trim().min(3).max(80),
    region: z.string().trim().min(2).max(60),
    cutoffAt: z.coerce.date(),
    deliveryAt: z.coerce.date(),
  })
  .refine((v) => v.deliveryAt > v.cutoffAt, 'Teslimat tarihi kapanıştan sonra olmalı');
/** JSON üzerinden tarihler ISO string olarak gelir; sunucu Date'e çevirir. */
export interface CreateWaveInput {
  title: string;
  region: string;
  cutoffAt: string | Date;
  deliveryAt: string | Date;
}

export const resolveIssueInput = z.object({
  status: z.enum(['resolved', 'rejected']),
  creditAmount: z.number().int().min(0).optional(),
});
export type ResolveIssueInput = z.infer<typeof resolveIssueInput>;

export const leadInput = z.object({
  businessName: z.string().trim().min(2, 'İşletme adı gerekli').max(120),
  contactName: z.string().trim().min(2, 'Ad soyad gerekli').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{10,20}$/, 'Geçerli bir telefon girin'),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  city: z.string().trim().min(2, 'Şehir gerekli').max(60),
  businessType: z.enum(BUSINESS_TYPES),
  monthlySpend: z.number().int().min(0).optional(),
  kind: z.enum(['member', 'supplier']).default('member'),
});
export type LeadInput = z.input<typeof leadInput>;

export const productQueryInput = z.object({
  category: z.string().optional(),
  q: z.string().trim().max(80).optional(),
});
export type ProductQuery = z.infer<typeof productQueryInput>;
