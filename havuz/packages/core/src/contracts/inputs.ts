import { z } from 'zod';
import { BUSINESS_TYPES, CATEGORY_ICONS, ISSUE_TYPES, ITEM_STATUSES, PAYMENT_PURPOSES, PAYMENT_TERMS } from '../domain/enums';
import { luhnValid, passwordProblem } from '../domain/payment';
import { normalizeIban } from '../domain/settlement';
import { SUB_MERCHANT_TYPES } from '../domain/marketplace';

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
  /** Kullanım ve iptal-iade koşullarının onayı (sipariş başına kaydedilir). */
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Kullanım ve iptal-iade koşullarını onaylayın' }) }),
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
  /** KVKK aydınlatma metninin okunduğu onayı */
  kvkkConsent: z.literal(true, { errorMap: () => ({ message: 'Devam etmek için aydınlatma metnini onaylayın' }) }),
});
export type LeadInput = z.input<typeof leadInput>;

export const productQueryInput = z.object({
  category: z.string().optional(),
  q: z.string().trim().max(80).optional(),
});
export type ProductQuery = z.infer<typeof productQueryInput>;

// ---------------------------------------------------------------------------
// Hesap ve kimlik
// ---------------------------------------------------------------------------
const strongPassword = z
  .string()
  .max(128)
  .superRefine((v, ctx) => {
    const p = passwordProblem(v);
    if (p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
  });

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifrenizi girin'),
  newPassword: strongPassword,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

export const forgotPasswordInput = z.object({ email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin') });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;

export const resetPasswordInput = z.object({
  token: z.string().min(20).max(200),
  newPassword: strongPassword,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInput>;

const phone = z
  .string()
  .trim()
  .regex(/^[0-9+()\s-]{10,20}$/, 'Geçerli bir telefon girin');
const ibanField = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIban(v);
    if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Geçerli bir TR IBAN girin' });
    return n ?? '';
  });

export const createOrgInput = z
  .object({
    type: z.enum(['member', 'supplier']),
    name: z.string().trim().min(2).max(120),
    businessType: z.enum(BUSINESS_TYPES).optional(),
    city: z.string().trim().min(2).max(60),
    district: z.string().trim().max(60).optional(),
    taxNo: z
      .string()
      .trim()
      .regex(/^\d{10,11}$/, 'Vergi/TC kimlik no 10–11 hane olmalı')
      .optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    phone: phone.optional(),
    plan: z.enum(['free', 'pro']).default('free'),
    creditLimit: z.number().int().min(0).max(1_000_000_000).default(10_000_000),
    commissionBps: z.number().int().min(0).max(2_000).default(300),
    iban: ibanField.optional(),
    owner: z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
      phone: phone.optional(),
    }),
    leadId: z.string().optional(),
  })
  .refine((v) => v.type === 'supplier' || !!v.businessType, { message: 'İşletme türü gerekli', path: ['businessType'] });
export type CreateOrgInput = z.input<typeof createOrgInput>;

export const updateOrgInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(60),
    district: z.string().trim().max(60).nullable(),
    taxNo: z.string().trim().regex(/^\d{10,11}$/).nullable(),
    email: z.string().trim().toLowerCase().email().nullable(),
    phone: phone.nullable(),
    plan: z.enum(['free', 'pro']),
    creditLimit: z.number().int().min(0).max(1_000_000_000),
    commissionBps: z.number().int().min(0).max(2_000),
    active: z.boolean(),
    iban: ibanField.nullable(),
  })
  .partial();
export type UpdateOrgInput = z.input<typeof updateOrgInput>;

export const inviteUserInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  phone: phone.optional(),
});
export type InviteUserInput = z.infer<typeof inviteUserInput>;

export const updateUserInput = z.object({ active: z.boolean() });

export const profileInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    phone: phone.nullable(),
    orgEmail: z.string().trim().toLowerCase().email().nullable(),
    orgPhone: phone.nullable(),
    iban: ibanField.nullable(),
  })
  .partial();
export type ProfileInput = z.input<typeof profileInput>;

export const leadDecisionInput = z.object({ status: z.literal('rejected') });

// ---------------------------------------------------------------------------
// Katalog yönetimi
// ---------------------------------------------------------------------------
export const createCategoryInput = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.enum(CATEGORY_ICONS),
});
export type CreateCategoryInput = z.infer<typeof createCategoryInput>;

/** Ürün fotoğrafı: tarayıcıda küçültülmüş JPEG/PNG/WebP data URL (en fazla ~220 KB). */
export const productImage = z
  .string()
  .max(300_000, 'Fotoğraf çok büyük')
  .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, 'Geçersiz fotoğraf biçimi');

export const createProductInput = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  unit: z.string().trim().min(1).max(20),
  packLabel: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).default(''),
  vatRate: z.union([z.literal(1), z.literal(10), z.literal(20)]),
  marketPrice: z.number().int().min(1),
  /** null → fotoğrafı kaldır */
  image: productImage.nullable().optional(),
});
export type CreateProductInput = z.input<typeof createProductInput>;

export const updateProductInput = createProductInput.partial();
export type UpdateProductInput = z.input<typeof updateProductInput>;

export const createOfferInput = z
  .object({
    productId: z.string().min(1),
    basePrice: z.number().int().min(1),
    tiers: z.array(priceTierInput).max(6).default([]),
    stock: z.number().int().min(0),
    leadTimeDays: z.number().int().min(0).max(30).default(1),
  })
  .refine((v) => v.tiers.every((t) => t.unitPrice < v.basePrice), 'Kademe fiyatları taban fiyattan düşük olmalı');
export type CreateOfferInput = z.input<typeof createOfferInput>;

// ---------------------------------------------------------------------------
// Ödeme ve hakediş
// ---------------------------------------------------------------------------
export const startPaymentInput = z
  .object({
    purpose: z.enum(PAYMENT_PURPOSES),
    orderId: z.string().min(1).optional(),
  })
  .refine((v) => v.purpose === 'subscription' || !!v.orderId, { message: 'Sipariş gerekli', path: ['orderId'] });
export type StartPaymentInput = z.infer<typeof startPaymentInput>;

export const testCardInput = z.object({
  holder: z.string().trim().min(3, 'Kart üzerindeki adı girin').max(80),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => luhnValid(v), 'Kart numarası geçersiz'),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Son kullanma AA/YY biçiminde olmalı'),
  cvc: z.string().trim().regex(/^\d{3,4}$/, 'CVC 3–4 hane olmalı'),
});
export type TestCardInput = z.input<typeof testCardInput>;

export const createSettlementsInput = z.object({ periodEnd: z.coerce.date() });
export type CreateSettlementsInput = { periodEnd: string | Date };

export const markSettlementPaidInput = z.object({ reference: z.string().trim().min(3, 'Havale/EFT referansı girin').max(80) });
export type MarkSettlementPaidInput = z.infer<typeof markSettlementPaidInput>;

/** Tedarikçi ödeme (iyzico alt satıcı) bilgileri. Türüne göre zorunlu alanlar sunucuda da denetlenir. */
export const payoutProfileInput = z.object({
  subMerchantType: z.enum(SUB_MERCHANT_TYPES),
  legalTitle: z.string().trim().max(200).optional().or(z.literal('')),
  taxOffice: z.string().trim().max(100).optional().or(z.literal('')),
  taxNo: z.string().trim().regex(/^\d{10}$/, 'Vergi no 10 haneli olmalı').optional().or(z.literal('')),
  /** Boş bırakılırsa kayıtlı değer korunur. */
  identityNumber: z.string().trim().regex(/^\d{11}$/, 'T.C. kimlik no 11 haneli olmalı').optional().or(z.literal('')),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  address: z.string().trim().min(10, 'Açık adres en az 10 karakter olmalı').max(400),
  iban: z
    .string()
    .trim()
    .transform((v) => normalizeIban(v))
    .refine((v): v is string => v !== null, 'Geçerli bir TR IBAN girin'),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  phone: z.string().trim().min(10, 'Telefon numarası gerekli').max(20),
});
export type PayoutProfileInput = z.input<typeof payoutProfileInput>;

/** Fatura dosyası: PDF veya görsel, data URL (en fazla ~2 MB). */
export const INVOICE_MAX_BYTES = 2_000_000;
export const invoiceFile = z
  .string()
  .max(Math.ceil((INVOICE_MAX_BYTES * 4) / 3) + 100, 'Dosya en fazla 2 MB olabilir')
  .regex(/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/, 'Yalnızca PDF, JPG, PNG veya WebP yüklenebilir');

export const uploadInvoiceInput = z.object({
  orderId: z.string().min(1),
  number: z.string().trim().min(3, 'Fatura numarası gerekli').max(40),
  issuedAt: z.coerce.date(),
  /** KDV dahil fatura tutarı (kuruş) */
  amount: z.number().int().min(0),
  fileName: z.string().trim().min(1).max(120),
  file: invoiceFile,
});
export type UploadInvoiceInput = z.input<typeof uploadInvoiceInput>;

/** Yasal metinlerde ve iletişim sayfasında kullanılan şirket bilgileri (yönetim düzenler). */
export const companyInput = z.object({
  legalName: z.string().trim().min(3, 'Ticari unvan gerekli').max(200),
  brandName: z.string().trim().min(2).max(60).default('Havuz'),
  address: z.string().trim().min(10, 'Açık adres gerekli').max(400),
  taxOffice: z.string().trim().max(100).optional().or(z.literal('')),
  taxNo: z.string().trim().max(20).optional().or(z.literal('')),
  mersisNo: z.string().trim().max(30).optional().or(z.literal('')),
  tradeRegistryNo: z.string().trim().max(40).optional().or(z.literal('')),
  phone: z.string().trim().min(10, 'Telefon gerekli').max(30),
  email: z.string().trim().toLowerCase().email('Geçerli bir e-posta girin'),
  kepAddress: z.string().trim().max(120).optional().or(z.literal('')),
  supportHours: z.string().trim().max(120).optional().or(z.literal('')),
  /** KVKK başvuruları için e-posta (boşsa genel e-posta) */
  kvkkEmail: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
  etbisNo: z.string().trim().max(60).optional().or(z.literal('')),
});
export type CompanyInput = z.input<typeof companyInput>;
