import bcrypt from 'bcryptjs';
import { inArray, sql } from 'drizzle-orm';
import {
  closeWave,
  computeOrderTotals,
  computeSettlement,
  formatSettlementNumber,
  dueDate,
  formatOrderNumber,
  resolveTier,
  type BusinessType,
  type PaymentTerm,
  type Plan,
  type PriceTier,
  type WaveLine,
} from '@havuz/core';
import type { DB } from './client';
import * as s from './schema';

/**
 * Demo veri seti. Tarihler çalıştırma anına göre hesaplanır; böylece demo
 * her zaman "canlı" görünür (açık dalga, son 6 ayın geçmişi).
 * Deterministik rastgele üreteç kullanılır: aynı seed → aynı veri.
 */

export const DEMO_PASSWORD = 'havuz123';
export const DEMO_ACCOUNTS = {
  member: 'uye@havuz.app',
  supplier: 'tedarikci@havuz.app',
  admin: 'yonetim@havuz.app',
} as const;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L = (lira: number) => Math.round(lira * 100);
const DAY = 86_400_000;
/** Sipariş miktarı çarpanı — gerçekçi aylık hacim için. */
const QTY_SCALE = 2.5;

const CATEGORIES = [
  { slug: 'temel', name: 'Yağ & Temel Gıda', icon: 'Wheat' },
  { slug: 'kahve', name: 'Kahve & İçecek', icon: 'Coffee' },
  { slug: 'sut', name: 'Süt Ürünleri', icon: 'Milk' },
  { slug: 'taze', name: 'Taze Sebze & Meyve', icon: 'Apple' },
  { slug: 'et', name: 'Et & Tavuk', icon: 'Beef' },
  { slug: 'ambalaj', name: 'Ambalaj & Sarf', icon: 'Package' },
  { slug: 'temizlik', name: 'Temizlik & Hijyen', icon: 'SprayCan' },
] as const;
type CatSlug = (typeof CATEGORIES)[number]['slug'];

interface ProductSeed {
  sku: string;
  cat: CatSlug;
  name: string;
  unit: string;
  pack: string;
  desc: string;
  vat: number;
  market: number; // TL, KDV hariç
  typical: number; // sipariş başına tipik miktar
}

const PRODUCTS: ProductSeed[] = [
  { sku: 'TG-001', cat: 'temel', name: 'Ayçiçek Yağı', unit: 'teneke', pack: '18 L teneke', desc: 'Kızartma ve pişirme için rafine ayçiçek yağı.', vat: 1, market: 2150, typical: 2 },
  { sku: 'TG-002', cat: 'temel', name: 'Riviera Zeytinyağı', unit: 'bidon', pack: '5 L bidon', desc: 'Salata ve soğuk mutfak için riviera zeytinyağı.', vat: 1, market: 1650, typical: 2 },
  { sku: 'TG-003', cat: 'temel', name: 'Buğday Unu Tip 550', unit: 'çuval', pack: '25 kg çuval', desc: 'Ekmek, pide ve hamur işleri için çok amaçlı un.', vat: 1, market: 980, typical: 3 },
  { sku: 'TG-004', cat: 'temel', name: 'Toz Şeker', unit: 'çuval', pack: '25 kg çuval', desc: 'Kristal toz şeker.', vat: 1, market: 1180, typical: 2 },
  { sku: 'TG-005', cat: 'temel', name: 'Baldo Pirinç', unit: 'paket', pack: '5 kg paket', desc: 'Pilavlık baldo pirinç.', vat: 1, market: 420, typical: 4 },
  { sku: 'TG-006', cat: 'temel', name: 'Domates Salçası', unit: 'teneke', pack: '4,3 kg teneke', desc: 'Yoğun kıvamlı domates salçası.', vat: 1, market: 390, typical: 2 },
  { sku: 'TG-007', cat: 'temel', name: 'Penne Makarna', unit: 'paket', pack: '5 kg paket', desc: 'Durum buğdayı irmiğinden penne.', vat: 1, market: 210, typical: 3 },
  { sku: 'KI-001', cat: 'kahve', name: 'Espresso Çekirdek Kahve', unit: 'kg', pack: '1 kg paket', desc: 'Brezilya–Kolombiya harmanı, orta-koyu kavrum.', vat: 1, market: 1150, typical: 6 },
  { sku: 'KI-002', cat: 'kahve', name: 'Filtre Kahve', unit: 'kg', pack: '1 kg paket', desc: 'Etiyopya ağırlıklı, açık kavrum, öğütülmüş.', vat: 1, market: 980, typical: 3 },
  { sku: 'KI-003', cat: 'kahve', name: 'Türk Kahvesi', unit: 'kg', pack: '1 kg paket', desc: 'Taze çekilmiş Türk kahvesi.', vat: 1, market: 890, typical: 3 },
  { sku: 'KI-004', cat: 'kahve', name: 'Siyah Çay', unit: 'paket', pack: '5 kg paket', desc: 'Rize dökme siyah çay.', vat: 1, market: 1450, typical: 1 },
  { sku: 'KI-005', cat: 'kahve', name: 'Maden Suyu', unit: 'koli', pack: '24 × 200 ml', desc: 'Doğal mineralli maden suyu.', vat: 1, market: 260, typical: 4 },
  { sku: 'KI-006', cat: 'kahve', name: 'Karamel Şurup', unit: 'şişe', pack: '750 ml cam şişe', desc: 'Barista kahve şurubu.', vat: 20, market: 240, typical: 3 },
  { sku: 'SU-001', cat: 'sut', name: 'UHT Tam Yağlı Süt', unit: 'koli', pack: '12 × 1 L', desc: 'Uzun ömürlü tam yağlı süt.', vat: 1, market: 480, typical: 4 },
  { sku: 'SU-002', cat: 'sut', name: 'Barista Süt', unit: 'koli', pack: '12 × 1 L', desc: 'Köpürtmeye uygun yüksek proteinli süt.', vat: 1, market: 560, typical: 4 },
  { sku: 'SU-003', cat: 'sut', name: 'Tam Yağlı Beyaz Peynir', unit: 'teneke', pack: '5 kg teneke', desc: 'Olgunlaştırılmış inek peyniri.', vat: 1, market: 1650, typical: 1 },
  { sku: 'SU-004', cat: 'sut', name: 'Kaşar Peyniri', unit: 'blok', pack: '2 kg blok', desc: 'Tost ve pizza için taze kaşar.', vat: 1, market: 980, typical: 2 },
  { sku: 'SU-005', cat: 'sut', name: 'Tereyağı', unit: 'kg', pack: '1 kg blok', desc: 'İnek sütünden tereyağı.', vat: 1, market: 520, typical: 3 },
  { sku: 'SU-006', cat: 'sut', name: 'Sıvı Krema', unit: 'L', pack: '1 L kutu', desc: '%35 yağlı pişirme ve şanti kreması.', vat: 1, market: 210, typical: 4 },
  { sku: 'TZ-001', cat: 'taze', name: 'Domates', unit: 'kg', pack: '1. sınıf, kasa', desc: 'Sofralık salkım domates.', vat: 1, market: 38, typical: 20 },
  { sku: 'TZ-002', cat: 'taze', name: 'Salatalık', unit: 'kg', pack: '1. sınıf, kasa', desc: 'Silivri salatalığı.', vat: 1, market: 32, typical: 12 },
  { sku: 'TZ-003', cat: 'taze', name: 'Limon', unit: 'kg', pack: 'Mersin, kasa', desc: 'Sulu Mersin limonu.', vat: 1, market: 45, typical: 8 },
  { sku: 'TZ-004', cat: 'taze', name: 'Patates', unit: 'kg', pack: 'Niğde, çuval', desc: 'Kızartmalık patates.', vat: 1, market: 22, typical: 30 },
  { sku: 'TZ-005', cat: 'taze', name: 'Kuru Soğan', unit: 'kg', pack: 'Çuval', desc: 'Yemeklik kuru soğan.', vat: 1, market: 18, typical: 20 },
  { sku: 'TZ-006', cat: 'taze', name: 'Muz', unit: 'kg', pack: 'Anamur, koli', desc: 'Smoothie ve kahvaltı için yerli muz.', vat: 1, market: 85, typical: 6 },
  { sku: 'ET-001', cat: 'et', name: 'Dana Kıyma', unit: 'kg', pack: 'Vakumlu, %20 yağ', desc: 'Günlük çekilmiş dana kıyma.', vat: 1, market: 720, typical: 8 },
  { sku: 'ET-002', cat: 'et', name: 'Tavuk Göğüs', unit: 'kg', pack: 'Fileto, kasa', desc: 'Kemiksiz derisiz tavuk göğüs.', vat: 1, market: 230, typical: 12 },
  { sku: 'ET-003', cat: 'et', name: 'Dana Bonfile', unit: 'kg', pack: 'Vakumlu', desc: 'Dinlendirilmiş dana bonfile.', vat: 1, market: 1650, typical: 3 },
  { sku: 'AM-001', cat: 'ambalaj', name: 'Karton Bardak 8 oz', unit: 'koli', pack: '1000 adet', desc: 'Çift cidarlı sıcak içecek bardağı.', vat: 20, market: 1050, typical: 2 },
  { sku: 'AM-002', cat: 'ambalaj', name: 'Bardak Kapağı', unit: 'koli', pack: '1000 adet', desc: '8 oz bardaklarla uyumlu kapak.', vat: 20, market: 520, typical: 2 },
  { sku: 'AM-003', cat: 'ambalaj', name: 'Kraft Paket Servis Kutusu', unit: 'koli', pack: '500 adet', desc: 'Yağa dayanıklı kraft kutu.', vat: 20, market: 1450, typical: 1 },
  { sku: 'AM-004', cat: 'ambalaj', name: 'Peçete', unit: 'koli', pack: '48 × 100 adet', desc: 'Tek katlı servis peçetesi.', vat: 20, market: 690, typical: 2 },
  { sku: 'AM-005', cat: 'ambalaj', name: 'Kağıt Pipet', unit: 'koli', pack: '500 adet', desc: 'Doğada çözünen kağıt pipet.', vat: 20, market: 280, typical: 2 },
  { sku: 'TM-001', cat: 'temizlik', name: 'Bulaşık Makinesi Deterjanı', unit: 'bidon', pack: '20 kg bidon', desc: 'Endüstriyel makineler için sıvı deterjan.', vat: 20, market: 1350, typical: 1 },
  { sku: 'TM-002', cat: 'temizlik', name: 'Yüzey Dezenfektanı', unit: 'bidon', pack: '5 L bidon', desc: 'Gıda temas yüzeyleri için onaylı.', vat: 20, market: 380, typical: 2 },
  { sku: 'TM-003', cat: 'temizlik', name: 'Jumbo Çöp Poşeti', unit: 'koli', pack: '10 rulo', desc: '80×110 cm kalın çöp poşeti.', vat: 20, market: 420, typical: 1 },
  { sku: 'TM-004', cat: 'temizlik', name: 'Nitril Eldiven', unit: 'koli', pack: '10 × 100 adet', desc: 'Pudrasız gıdaya uygun eldiven.', vat: 20, market: 1200, typical: 1 },
];

interface SupplierSeed {
  key: string;
  name: string;
  district: string;
  commissionBps: number;
  rating: number;
  onTimeRate: number;
  cats: CatSlug[];
  /** Piyasa fiyatına göre taban fiyat oranı. */
  priceFactor: number;
  email?: string;
}

const SUPPLIERS: SupplierSeed[] = [
  { key: 'anadolu', name: 'Anadolu Gıda Toptan', district: 'Ümraniye', commissionBps: 300, rating: 4.7, onTimeRate: 0.96, cats: ['temel', 'sut', 'et'], priceFactor: 0.93, email: 'tedarikci@havuz.app' },
  { key: 'kavrulmus', name: 'Kavrulmuş Kahve Co.', district: 'Kağıthane', commissionBps: 350, rating: 4.8, onTimeRate: 0.97, cats: ['kahve'], priceFactor: 0.9 },
  { key: 'bereket', name: 'Bereket Hal Sebze-Meyve', district: 'Bayrampaşa', commissionBps: 400, rating: 4.4, onTimeRate: 0.91, cats: ['taze'], priceFactor: 0.9 },
  { key: 'marmara', name: 'Marmara Et Kombinası', district: 'Esenyurt', commissionBps: 250, rating: 4.6, onTimeRate: 0.94, cats: ['et'], priceFactor: 0.95 },
  { key: 'trakya', name: 'Trakya Süt Ürünleri', district: 'Silivri', commissionBps: 300, rating: 4.6, onTimeRate: 0.93, cats: ['sut', 'kahve'], priceFactor: 0.95 },
  { key: 'ege', name: 'Ege Ambalaj', district: 'İkitelli', commissionBps: 450, rating: 4.5, onTimeRate: 0.95, cats: ['ambalaj'], priceFactor: 0.85 },
  { key: 'piril', name: 'Pırıl Hijyen', district: 'Başakşehir', commissionBps: 400, rating: 4.3, onTimeRate: 0.92, cats: ['temizlik', 'ambalaj'], priceFactor: 0.87 },
];

interface MemberSeed {
  name: string;
  type: BusinessType;
  district: string;
  plan: Plan;
  creditLimit: number; // TL
  buys: CatSlug[];
  scale: number; // sipariş büyüklüğü çarpanı
  email?: string;
}

const MEMBERS: MemberSeed[] = [
  { name: 'Moda Sahil Kahve', type: 'cafe', district: 'Kadıköy', plan: 'free', creditLimit: 150_000, buys: ['kahve', 'sut', 'ambalaj', 'temizlik', 'temel', 'taze'], scale: 1, email: 'uye@havuz.app' },
  { name: 'Yeldeğirmeni Fırın', type: 'bakery', district: 'Kadıköy', plan: 'free', creditLimit: 120_000, buys: ['temel', 'sut', 'ambalaj', 'temizlik'], scale: 1.2 },
  { name: 'Cihangir Bistro', type: 'restaurant', district: 'Beyoğlu', plan: 'pro', creditLimit: 300_000, buys: ['temel', 'taze', 'et', 'sut', 'temizlik', 'kahve'], scale: 1.3 },
  { name: 'Nişantaşı Brunch House', type: 'restaurant', district: 'Şişli', plan: 'pro', creditLimit: 350_000, buys: ['temel', 'taze', 'sut', 'kahve', 'et', 'ambalaj'], scale: 1.5 },
  { name: 'Üsküdar Çay Bahçesi', type: 'cafe', district: 'Üsküdar', plan: 'free', creditLimit: 80_000, buys: ['kahve', 'sut', 'ambalaj', 'temel'], scale: 0.8 },
  { name: 'Bebek Espresso Bar', type: 'cafe', district: 'Beşiktaş', plan: 'pro', creditLimit: 200_000, buys: ['kahve', 'sut', 'ambalaj', 'taze'], scale: 1.1 },
  { name: 'Ataşehir Burger Lab', type: 'restaurant', district: 'Ataşehir', plan: 'free', creditLimit: 200_000, buys: ['et', 'taze', 'temel', 'ambalaj', 'temizlik'], scale: 1.4 },
  { name: 'Bakırköy Ev Yemekleri', type: 'restaurant', district: 'Bakırköy', plan: 'free', creditLimit: 150_000, buys: ['temel', 'taze', 'et', 'sut'], scale: 1.2 },
  { name: 'Karaköy Roastery Cafe', type: 'cafe', district: 'Beyoğlu', plan: 'pro', creditLimit: 250_000, buys: ['kahve', 'sut', 'ambalaj', 'temizlik', 'taze'], scale: 1.3 },
  { name: 'Maltepe Sahil Pide', type: 'restaurant', district: 'Maltepe', plan: 'free', creditLimit: 120_000, buys: ['temel', 'et', 'sut', 'taze', 'ambalaj'], scale: 1.1 },
  { name: 'Beşiktaş Meyhane 34', type: 'bar', district: 'Beşiktaş', plan: 'free', creditLimit: 180_000, buys: ['taze', 'sut', 'et', 'temel', 'temizlik'], scale: 1.2 },
  { name: 'Sarıyer Börekçisi', type: 'bakery', district: 'Sarıyer', plan: 'free', creditLimit: 100_000, buys: ['temel', 'sut', 'ambalaj'], scale: 1 },
  { name: 'Kozyatağı Ofis Catering', type: 'catering', district: 'Kadıköy', plan: 'pro', creditLimit: 400_000, buys: ['temel', 'taze', 'et', 'sut', 'ambalaj', 'temizlik'], scale: 2 },
  { name: 'Fenerbahçe Pastanesi', type: 'bakery', district: 'Kadıköy', plan: 'free', creditLimit: 120_000, buys: ['temel', 'sut', 'kahve', 'ambalaj'], scale: 1 },
];

const slug = (t: string) =>
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

/** Geçerli kontrol haneli demo TR IBAN üretir (banka kodu 00062 + rastgele hesap). */
function demoIban(rand: () => number): string {
  const bban = '00062' + '0' + Array.from({ length: 16 }, () => Math.floor(rand() * 10)).join('');
  const numeric = bban + '2927' + '00';
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  return `TR${String(98 - rem).padStart(2, '0')}${bban}`;
}

async function insertChunks<T extends object>(db: DB, table: Parameters<DB['insert']>[0], rows: T[], size = 400) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as never);
  }
}

export async function resetDatabase(db: DB) {
  await db.execute(
    sql`TRUNCATE TABLE ${s.auditLogs}, ${s.outbox}, ${s.notifications}, ${s.passwordResets}, ${s.payments}, ${s.settlements}, ${s.issues}, ${s.ledgerEntries}, ${s.orderItems}, ${s.orders}, ${s.waves}, ${s.offers}, ${s.products}, ${s.categories}, ${s.subscriptions}, ${s.leads}, ${s.users}, ${s.organizations} RESTART IDENTITY CASCADE`,
  );
}

export async function seed(db: DB, now: Date = new Date()) {
  const rand = rng(20261122);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (a: number, b: number) => a + rand() * (b - a);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const t0 = now.getTime();

  // --- Kuruluşlar ve kullanıcılar ---
  const operatorId = crypto.randomUUID();
  const orgRows: (typeof s.organizations.$inferInsert)[] = [
    { id: operatorId, type: 'operator', name: 'Havuz Operasyon', city: 'İstanbul', district: 'Kadıköy', createdAt: new Date(t0 - 220 * DAY) },
  ];
  const userRows: (typeof s.users.$inferInsert)[] = [
    { orgId: operatorId, name: 'Operasyon Ekibi', email: DEMO_ACCOUNTS.admin, passwordHash, role: 'admin', isOwner: true },
  ];

  const supplierIds: Record<string, string> = {};
  for (const sp of SUPPLIERS) {
    const id = crypto.randomUUID();
    supplierIds[sp.key] = id;
    orgRows.push({
      id,
      type: 'supplier',
      name: sp.name,
      city: 'İstanbul',
      district: sp.district,
      taxNo: String(1000000000 + Math.floor(rand() * 8999999999)).slice(0, 10),
      commissionBps: sp.commissionBps,
      iban: demoIban(rand),
      email: sp.email ?? `satis@${slug(sp.name)}.demo`,
      phone: `0212 555 ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))}`,
      rating: sp.rating,
      onTimeRate: sp.onTimeRate,
      createdAt: new Date(t0 - 210 * DAY),
    });
    userRows.push({ orgId: id, name: `${sp.name} Satış`, email: sp.email ?? `satis@${slug(sp.name)}.demo`, passwordHash, role: 'supplier', isOwner: true });
  }

  const memberIds: string[] = [];
  MEMBERS.forEach((m, i) => {
    const id = crypto.randomUUID();
    memberIds.push(id);
    orgRows.push({
      id,
      type: 'member',
      name: m.name,
      businessType: m.type,
      city: 'İstanbul',
      district: m.district,
      taxNo: String(2000000000 + Math.floor(rand() * 7999999999)).slice(0, 10),
      plan: m.plan,
      creditLimit: L(m.creditLimit),
      email: m.email ?? `iletisim@${slug(m.name)}.demo`,
      phone: `0532 555 ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))}`,
      createdAt: new Date(t0 - (200 - i * 6) * DAY),
    });
    userRows.push({ orgId: id, name: `${m.name} Yönetici`, email: m.email ?? `iletisim@${slug(m.name)}.demo`, passwordHash, role: 'member', isOwner: true });
  });

  await db.insert(s.organizations).values(orgRows);
  await db.insert(s.users).values(userRows);

  // --- Katalog ---
  const catIds: Record<string, string> = {};
  await db.insert(s.categories).values(
    CATEGORIES.map((c, i) => {
      const id = crypto.randomUUID();
      catIds[c.slug] = id;
      return { id, slug: c.slug, name: c.name, icon: c.icon, sort: i };
    }),
  );

  const productIds: Record<string, string> = {};
  await db.insert(s.products).values(
    PRODUCTS.map((p) => {
      const id = crypto.randomUUID();
      productIds[p.sku] = id;
      return {
        id,
        categoryId: catIds[p.cat],
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        packLabel: p.pack,
        description: p.desc,
        vatRate: p.vat,
        marketPrice: L(p.market),
      };
    }),
  );

  interface OfferRow {
    id: string;
    productId: string;
    supplierId: string;
    basePrice: number;
    tiers: PriceTier[];
    stock: number;
    leadTimeDays: number;
    sponsored: boolean;
    sponsoredFee: number;
    commissionBps: number;
    sku: string;
  }
  const offerRows: OfferRow[] = [];
  const sponsoredSkus = new Set(['KI-001', 'AM-001', 'SU-002']);
  for (const p of PRODUCTS) {
    const sellers = SUPPLIERS.filter((sp) => sp.cats.includes(p.cat));
    for (const sp of sellers) {
      const base = L(p.market * (sp.priceFactor + between(-0.02, 0.03)));
      const t1 = Math.max(2, Math.round(p.typical * QTY_SCALE * 3));
      const t2 = Math.max(t1 + 1, Math.round(p.typical * QTY_SCALE * 7));
      const sponsored = sponsoredSkus.has(p.sku) && sp === sellers[0];
      offerRows.push({
        id: crypto.randomUUID(),
        productId: productIds[p.sku],
        supplierId: supplierIds[sp.key],
        basePrice: base,
        tiers: [
          { minQty: t1, unitPrice: Math.round(base * 0.95) },
          { minQty: t2, unitPrice: Math.round(base * 0.9) },
        ],
        stock: Math.round(p.typical * QTY_SCALE * 400),
        leadTimeDays: p.cat === 'taze' || p.cat === 'et' ? 1 : pick([1, 2, 2, 3]),
        sponsored,
        sponsoredFee: sponsored ? L(7500) : 0,
        commissionBps: sp.commissionBps,
        sku: p.sku,
      });
    }
  }
  await db.insert(s.offers).values(offerRows.map(({ commissionBps: _c, sku: _s, ...o }) => o));
  const productBySku = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));

  // --- Dalgalar ---
  const WEEKS = 24;
  const startCode = 41;
  // Bir sonraki perşembe 18:00 (yerel) → açık dalganın kapanışı
  const nextThu = new Date(now);
  nextThu.setHours(18, 0, 0, 0);
  const add = (4 - nextThu.getDay() + 7) % 7 || 7;
  nextThu.setTime(nextThu.getTime() + add * DAY);
  if (nextThu.getTime() - t0 < 1.5 * DAY) nextThu.setTime(nextThu.getTime() + 7 * DAY);

  interface WaveRow {
    id: string;
    code: string;
    title: string;
    region: string;
    status: 'open' | 'closed' | 'delivered';
    opensAt: Date;
    cutoffAt: Date;
    deliveryAt: Date;
    closedAt: Date | null;
    totalCredit: number;
  }
  const waveRows: WaveRow[] = [];
  for (let w = 0; w <= WEEKS; w++) {
    const cutoff = new Date(nextThu.getTime() - (WEEKS - w) * 7 * DAY);
    const code = `#${startCode + w}`;
    const open = w === WEEKS;
    waveRows.push({
      id: crypto.randomUUID(),
      code,
      title: `Haftalık Dalga ${code}`,
      region: 'İstanbul',
      status: open ? 'open' : 'delivered',
      opensAt: new Date(cutoff.getTime() - 7 * DAY),
      cutoffAt: cutoff,
      deliveryAt: new Date(cutoff.getTime() + 2 * DAY - 8 * 3600_000),
      closedAt: open ? null : cutoff,
      totalCredit: 0,
    });
  }

  // --- Siparişler ---
  interface ItemRow {
    id: string;
    orderId: string;
    offerId: string;
    productId: string;
    supplierId: string;
    qty: number;
    unitPrice: number;
    finalUnitPrice: number;
    marketPrice: number;
    vatRate: number;
    commissionBps: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    updatedAt: Date;
    deliveredAt?: Date | null;
    settlementId?: string | null;
  }
  interface OrderDraft {
    id: string;
    memberIdx: number;
    waveIdx: number | null;
    createdAt: Date;
    term: PaymentTerm;
    items: ItemRow[];
    open: boolean;
  }
  const drafts: OrderDraft[] = [];
  const offersBySku: Record<string, OfferRow[]> = {};
  for (const o of offerRows) (offersBySku[o.sku] ??= []).push(o);

  const inflation = (daysAgo: number) => 1 - 0.0009 * daysAgo; // ~%2,7/ay

  function buildItems(orderId: string, memberIdx: number, daysAgo: number): ItemRow[] {
    const m = MEMBERS[memberIdx];
    const pool = PRODUCTS.filter((p) => m.buys.includes(p.cat));
    const count = Math.min(pool.length, 3 + Math.floor(rand() * 5));
    const chosen = [...pool].sort(() => rand() - 0.5).slice(0, count);
    return chosen.map((p) => {
      const candidates = offersBySku[p.sku];
      // Üyeler çoğunlukla en ucuz teklifi seçer, bazen alışkanlıkla diğerini.
      const sorted = [...candidates].sort((a, b) => a.basePrice - b.basePrice);
      const offer = rand() < 0.8 ? sorted[0] : pick(sorted);
      const qty = Math.max(1, Math.round(p.typical * QTY_SCALE * m.scale * between(0.6, 1.5)));
      const f = inflation(daysAgo);
      return {
        id: crypto.randomUUID(),
        orderId,
        offerId: offer.id,
        productId: offer.productId,
        supplierId: offer.supplierId,
        qty,
        unitPrice: Math.round(resolveTier(offer, qty).unitPrice * f),
        finalUnitPrice: 0,
        marketPrice: Math.round(L(p.market) * f),
        vatRate: p.vat,
        commissionBps: offer.commissionBps,
        status: 'delivered',
        updatedAt: new Date(t0 - daysAgo * DAY),
      };
    });
  }

  for (let w = 0; w <= WEEKS; w++) {
    const wave = waveRows[w];
    const isOpen = wave.status === 'open';
    MEMBERS.forEach((m, mi) => {
      // Dalga siparişi
      const joinP = mi === 0 ? 0.92 : isOpen ? 0.7 : 0.62;
      if (rand() < joinP && !(isOpen && mi === 0)) {
        const createdAt = isOpen
          ? new Date(t0 - between(0.05, Math.max(0.2, (t0 - wave.opensAt.getTime()) / DAY)) * DAY)
          : new Date(wave.cutoffAt.getTime() - between(0.3, 6.5) * DAY);
        if (createdAt.getTime() > t0) return;
        const id = crypto.randomUUID();
        const daysAgo = (t0 - createdAt.getTime()) / DAY;
        drafts.push({
          id,
          memberIdx: mi,
          waveIdx: w,
          createdAt,
          term: m.plan === 'pro' ? pick<PaymentTerm>(['cash', 'net30', 'net30', 'net60']) : pick<PaymentTerm>(['cash', 'cash', 'net30']),
          items: buildItems(id, mi, daysAgo),
          open: isOpen,
        });
      }
      // Hemen teslim (dalga dışı) sipariş
      if (rand() < 0.45 * m.scale) {
        const createdAt = new Date(wave.cutoffAt.getTime() - between(0, 7) * DAY);
        if (createdAt.getTime() > t0) return;
        const id = crypto.randomUUID();
        const daysAgo = (t0 - createdAt.getTime()) / DAY;
        drafts.push({
          id,
          memberIdx: mi,
          waveIdx: null,
          createdAt,
          term: pick<PaymentTerm>(['cash', 'cash', 'net30']),
          items: buildItems(id, mi, daysAgo).slice(0, 3),
          open: false,
        });
      }
    });
  }

  // Dalga içi fiyatlama: sırayla havuzlanan miktar → ödenen kademe; kapanışta nihai kademe.
  const offerById = Object.fromEntries(offerRows.map((o) => [o.id, o]));
  const creditByOrder: Record<string, number> = {};
  for (let w = 0; w <= WEEKS; w++) {
    const wd = drafts.filter((d) => d.waveIdx === w).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const running: Record<string, number> = {};
    const lines: WaveLine[] = [];
    for (const d of wd) {
      const f = inflation((t0 - d.createdAt.getTime()) / DAY);
      for (const it of d.items) {
        running[it.offerId] = (running[it.offerId] ?? 0) + it.qty;
        it.unitPrice = Math.round(resolveTier(offerById[it.offerId], running[it.offerId]).unitPrice * f);
        lines.push({ lineId: it.id, orderId: d.id, memberId: String(d.memberIdx), offerId: it.offerId, qty: it.qty, paidUnitPrice: it.unitPrice });
      }
    }
    if (waveRows[w].status === 'open') {
      for (const d of wd) for (const it of d.items) it.finalUnitPrice = it.unitPrice;
      continue;
    }
    // Enflasyon düzeltmesi nedeniyle her teklif için o dalganın fiyat çarpanını kullan.
    const f = inflation((t0 - waveRows[w].cutoffAt.getTime()) / DAY);
    const scaled = Object.fromEntries(
      Object.keys(running).map((id) => {
        const o = offerById[id];
        return [id, { basePrice: Math.round(o.basePrice * f), tiers: o.tiers.map((t) => ({ minQty: t.minQty, unitPrice: Math.round(t.unitPrice * f) })) }];
      }),
    );
    const result = closeWave(lines, scaled);
    const finalByLine = Object.fromEntries(result.lines.map((l) => [l.lineId, l.finalUnitPrice]));
    for (const d of wd) for (const it of d.items) it.finalUnitPrice = finalByLine[it.id];
    Object.assign(creditByOrder, result.creditsByOrder);
    waveRows[w].totalCredit = result.totalCredit;
  }
  for (const d of drafts) for (const it of d.items) if (!it.finalUnitPrice) it.finalUnitPrice = it.unitPrice;

  // Son siparişlerin durumları
  for (const d of drafts) {
    const age = (t0 - d.createdAt.getTime()) / DAY;
    for (const it of d.items) {
      if (d.open) it.status = rand() < 0.4 ? 'confirmed' : 'pending';
      else if (d.waveIdx === null && age < 1) it.status = pick(['pending', 'confirmed']);
      else if (d.waveIdx === null && age < 2) it.status = pick(['confirmed', 'shipped', 'shipped']);
      else if (d.waveIdx === WEEKS - 1 && age < 9 && t0 < waveRows[WEEKS - 1].deliveryAt.getTime()) it.status = 'shipped';
      else it.status = rand() < 0.012 ? 'cancelled' : 'delivered';
    }
  }
  // Demo üyesi için son dalgadan yola çıkmış bir sipariş garanti et (mal kabul akışı görülsün)
  const demoLast = drafts
    .filter((d) => d.memberIdx === 0 && !d.open)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (demoLast) for (const it of demoLast.items) it.status = 'shipped';

  drafts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const orderRows: (typeof s.orders.$inferInsert)[] = [];
  const allItems: ItemRow[] = [];
  const ledger: (typeof s.ledgerEntries.$inferInsert)[] = [];
  const statusOrder = ['pending', 'confirmed', 'shipped', 'delivered'] as const;

  drafts.forEach((d, i) => {
    const m = MEMBERS[d.memberIdx];
    const totals = computeOrderTotals(
      d.items.map((it) => ({ qty: it.qty, unitPrice: it.unitPrice, marketPrice: it.marketPrice, vatRate: it.vatRate })),
      { plan: m.plan, term: d.term },
    );
    const active = d.items.filter((it) => it.status !== 'cancelled');
    const minIdx = active.length ? Math.min(...active.map((it) => statusOrder.indexOf(it.status as (typeof statusOrder)[number]))) : -1;
    const status = minIdx === -1 ? 'cancelled' : statusOrder[minIdx];
    const c = d.createdAt.getTime();
    const due = d.term === 'cash' ? null : dueDate(d.createdAt, d.term);
    let paymentStatus: 'paid' | 'due' | 'overdue' = 'paid';
    if (due) {
      if (due.getTime() > t0) paymentStatus = 'due';
      else paymentStatus = d.memberIdx === 6 && t0 - due.getTime() < 20 * DAY ? 'overdue' : 'paid';
    }
    orderRows.push({
      id: d.id,
      number: formatOrderNumber(i + 1, d.createdAt.getFullYear()),
      memberId: memberIds[d.memberIdx],
      waveId: d.waveIdx === null ? null : waveRows[d.waveIdx].id,
      status,
      paymentTerm: d.term,
      paymentStatus,
      dueAt: due,
      paidAt: paymentStatus === 'paid' ? (due ?? d.createdAt) : null,
      subtotal: totals.subtotal,
      vat: totals.vat,
      financingFee: totals.financingFee,
      creditApplied: 0,
      total: totals.total,
      marketTotal: totals.marketTotal,
      waveCredit: creditByOrder[d.id] ?? 0,
      createdAt: d.createdAt,
      confirmedAt: minIdx >= 1 ? new Date(c + 3 * 3600_000) : null,
      shippedAt: minIdx >= 2 ? new Date(c + 26 * 3600_000) : null,
      deliveredAt: minIdx >= 3 ? new Date(c + (d.waveIdx === null ? 30 : 60) * 3600_000) : null,
    });
    const deliveredAt = minIdx >= 3 ? new Date(c + (d.waveIdx === null ? 30 : 60) * 3600_000) : null;
    for (const it of d.items) it.deliveredAt = it.status === 'delivered' ? deliveredAt ?? new Date(c + 48 * 3600_000) : null;
    allItems.push(...d.items);
    const credit = creditByOrder[d.id];
    if (credit) {
      ledger.push({
        orgId: memberIds[d.memberIdx],
        type: 'wave_rebate',
        amount: credit,
        description: `${waveRows[d.waveIdx!].title} kademe farkı`,
        refId: d.id,
        createdAt: waveRows[d.waveIdx!].cutoffAt,
      });
    }
  });

  await insertChunks(db, s.waves, waveRows);
  await insertChunks(db, s.orders, orderRows);
  await insertChunks(db, s.orderItems, allItems);

  // --- Mal kabul sorunları ---
  const delivered = allItems.filter((it) => it.status === 'delivered');
  const issueRows: (typeof s.issues.$inferInsert)[] = [];
  const orderById = Object.fromEntries(orderRows.map((o) => [o.id, o]));
  const issueTypes = ['missing', 'damaged', 'quality', 'wrong_item'] as const;
  for (const it of delivered) {
    if (rand() > 0.025) continue;
    const order = orderById[it.orderId];
    const recent = t0 - (order.createdAt as Date).getTime() < 10 * DAY;
    const qty = Math.max(1, Math.round(it.qty * between(0.1, 0.4)));
    const credit = Math.round(qty * it.finalUnitPrice * (1 + it.vatRate / 100));
    const resolved = !recent;
    issueRows.push({
      orderItemId: it.id,
      type: pick([...issueTypes]),
      qty,
      note: pick(['Kolide ezilme vardı', 'Eksik geldi', 'Tazelik beklenen seviyede değildi', 'Farklı ürün gönderildi', null]),
      status: resolved ? 'resolved' : 'open',
      creditAmount: resolved ? credit : 0,
      createdAt: new Date((order.createdAt as Date).getTime() + 2 * DAY),
      resolvedAt: resolved ? new Date((order.createdAt as Date).getTime() + 3 * DAY) : null,
    });
    if (resolved) {
      ledger.push({
        orgId: order.memberId,
        type: 'issue_credit',
        amount: credit,
        description: `${order.number} mal kabul iadesi`,
        refId: order.id,
        createdAt: new Date((order.createdAt as Date).getTime() + 3 * DAY),
      });
    }
  }
  if (issueRows.length) await insertChunks(db, s.issues, issueRows);

  // Bazı üyeler biriken kredilerini kullanmış olsun
  const balance: Record<string, number> = {};
  for (const e of ledger) balance[e.orgId] = (balance[e.orgId] ?? 0) + e.amount;
  memberIds.forEach((id, i) => {
    if (i % 3 === 1 && balance[id] > 0) {
      ledger.push({
        orgId: id,
        type: 'credit_used',
        amount: -Math.round(balance[id] * 0.6),
        description: 'Siparişte kredi kullanımı',
        createdAt: new Date(t0 - 12 * DAY),
      });
    }
  });
  await insertChunks(db, s.ledgerEntries, ledger);

  // --- Hakedişler: 14 günden eski teslimatlar aylık hakedişlerle ödenmiş olsun ---
  const settleBefore = t0 - 14 * DAY;
  const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  const groups = new Map<string, ItemRow[]>();
  for (const it of allItems) {
    if (it.status !== 'delivered' || !it.deliveredAt || it.deliveredAt.getTime() > settleBefore) continue;
    const end = monthEnd(it.deliveredAt);
    if (end.getTime() > settleBefore) continue; // içinde bulunulan ay henüz kapanmadı
    const key = `${it.supplierId}|${end.toISOString()}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
  }
  const issueByItem = new Map(issueRows.filter((i) => i.status === 'resolved').map((i) => [i.orderItemId, i]));
  let settlementSeq = 0;
  const sortedKeys = [...groups.keys()].sort((a, b) => a.split('|')[1].localeCompare(b.split('|')[1]));
  for (const key of sortedKeys) {
    const items = groups.get(key)!;
    const [supplierId, endIso] = key.split('|');
    const periodEnd = new Date(endIso);
    const issuesHere = items.map((it) => issueByItem.get(it.id)).filter(Boolean) as (typeof s.issues.$inferInsert)[];
    const t = computeSettlement(items, issuesHere.map((i) => i.creditAmount ?? 0));
    const id = crypto.randomUUID();
    const paidAt = new Date(periodEnd.getTime() + 5 * DAY);
    settlementSeq++;
    const sup = orgRows.find((o) => o.id === supplierId)!;
    await db.insert(s.settlements).values({
      id,
      number: formatSettlementNumber(settlementSeq, periodEnd.getFullYear()),
      supplierId,
      periodEnd,
      itemCount: t.itemCount,
      grossSales: t.grossSales,
      commission: t.commission,
      issueDeductions: t.issueDeductions,
      netAmount: t.netAmount,
      status: paidAt.getTime() < t0 ? 'paid' : 'pending',
      reference: paidAt.getTime() < t0 ? `EFT${String(100000 + Math.floor(rand() * 899999))}` : null,
      iban: sup.iban ?? null,
      createdAt: new Date(periodEnd.getTime() + 2 * DAY),
      paidAt: paidAt.getTime() < t0 ? paidAt : null,
    });
    const ids = items.map((i) => i.id);
    for (let k = 0; k < ids.length; k += 300) {
      await db.update(s.orderItems).set({ settlementId: id }).where(inArray(s.orderItems.id, ids.slice(k, k + 300)));
    }
    const issueIds = issuesHere.map((i) => i.orderItemId as string);
    if (issueIds.length) await db.update(s.issues).set({ settlementId: id }).where(inArray(s.issues.orderItemId, issueIds));
  }
  // Kimlik sırası, elle verilen numaralarla çakışmasın
  await db.execute(sql`SELECT setval(pg_get_serial_sequence('settlements', 'seq'), ${settlementSeq + 1}, false)`);

  // --- Kartla ödenen peşin siparişler için ödeme kayıtları (son 60 gün) ---
  const paymentRows: (typeof s.payments.$inferInsert)[] = orderRows
    .filter((o) => o.paymentTerm === 'cash' && (o.createdAt as Date).getTime() > t0 - 60 * DAY)
    .map((o) => ({
      orgId: o.memberId,
      purpose: 'order' as const,
      orderId: o.id,
      amount: o.total,
      provider: 'test',
      status: 'succeeded' as const,
      providerPaymentId: `test_${(o.id as string).slice(0, 8)}`,
      cardLast4: '4242',
      createdAt: o.createdAt,
      completedAt: new Date((o.createdAt as Date).getTime() + 60_000),
    }));
  if (paymentRows.length) await insertChunks(db, s.payments, paymentRows);

  // --- Örnek bildirimler ---
  const lastClosed = waveRows.filter((w) => w.status !== 'open').at(-1);
  const demoMember = memberIds[0];
  const demoSupplier = supplierIds['anadolu'];
  await db.insert(s.notifications).values([
    { orgId: demoMember, type: 'wave.opened', title: `${waveRows.at(-1)!.title} açıldı`, body: 'Sipariş alımı perşembe 18:00’e kadar açık. Havuz büyüdükçe fiyatlar düşer.', link: '/uye/dalga', createdAt: waveRows.at(-1)!.opensAt },
    ...(lastClosed
      ? [{ orgId: demoMember, type: 'wave.rebate', title: `${lastClosed.title} kapandı`, body: 'Havuz büyüdüğü için nihai fiyat düştü; fark kredi bakiyenize eklendi.', link: '/uye/hesap', createdAt: lastClosed.cutoffAt, readAt: lastClosed.cutoffAt }]
      : []),
    { orgId: demoSupplier, type: 'settlement.paid', title: 'Hakediş ödendi', body: 'Geçen ayın hakedişi hesabınıza gönderildi.', link: '/tedarikci/hakedis', createdAt: new Date(t0 - 10 * DAY), readAt: new Date(t0 - 9 * DAY) },
  ]);

  // --- Pro abonelik faturaları (son 6 ay) ---
  const subs: (typeof s.subscriptions.$inferInsert)[] = [];
  MEMBERS.forEach((m, i) => {
    if (m.plan !== 'pro') return;
    for (let k = 0; k < 6; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      subs.push({ orgId: memberIds[i], amount: L(1490), periodStart: d, createdAt: d });
    }
  });
  await db.insert(s.subscriptions).values(subs);

  // --- Başvurular ---
  await db.insert(s.leads).values([
    { kind: 'member', businessName: 'Moda Bowl & Juice', contactName: 'Deniz Aksoy', phone: '0532 000 00 01', email: 'deniz@ornek.demo', city: 'İstanbul', businessType: 'cafe', monthlySpend: L(180_000), createdAt: new Date(t0 - 1 * DAY) },
    { kind: 'member', businessName: 'Kuzguncuk Lokanta', contactName: 'Ece Yılmaz', phone: '0533 000 00 02', email: 'ece@ornek.demo', city: 'İstanbul', businessType: 'restaurant', monthlySpend: L(420_000), createdAt: new Date(t0 - 2 * DAY) },
    { kind: 'supplier', businessName: 'Doğa Organik Tarım', contactName: 'Mert Kaya', phone: '0534 000 00 03', email: 'mert@ornek.demo', city: 'Bursa', businessType: 'catering', createdAt: new Date(t0 - 4 * DAY) },
    { kind: 'member', businessName: 'Galata Tost Evi', contactName: 'Selin Demir', phone: '0535 000 00 04', email: 'selin@ornek.demo', city: 'İstanbul', businessType: 'cafe', monthlySpend: L(95_000), createdAt: new Date(t0 - 6 * DAY) },
  ]);

  return {
    organizations: orgRows.length,
    products: PRODUCTS.length,
    offers: offerRows.length,
    waves: waveRows.length,
    orders: orderRows.length,
    items: allItems.length,
    issues: issueRows.length,
  };
}
