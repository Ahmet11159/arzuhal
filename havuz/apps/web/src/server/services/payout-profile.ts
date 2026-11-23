import 'server-only';
import { eq } from 'drizzle-orm';
import {
  formatIban,
  payoutProfileInput,
  payoutProfileProblems,
  type PayoutProfileDTO,
  type PayoutProfileStatusDTO,
} from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { audit, type Actor } from '../audit';
import { notify, notifyOperators } from '../notify';
import { marketplaceEnabled, paymentProvider } from '../payments';

type Org = typeof s.organizations.$inferSelect;

/**
 * Tedarikçinin ödeme bilgileri (iyzico Pazaryeri alt satıcı kaydı).
 * Pazaryerinde tedarikçi payı iyzico tarafından doğrudan bu bilgilerdeki IBAN'a ödenir; bu yüzden
 * kayıt tamamlanmadan tedarikçi sipariş alamaz. IBAN değişikliği hesap sahibine e-postayla bildirilir.
 */
export function payoutStatus(org: Org): PayoutProfileStatusDTO {
  const problems = payoutProfileProblems({
    subMerchantType: org.subMerchantType,
    legalTitle: org.legalTitle,
    taxOffice: org.taxOffice,
    taxNo: org.taxNo,
    identityNumber: org.identityNumber,
    contactName: org.contactName,
    address: org.address,
    iban: org.iban,
    email: org.email,
    phone: org.phone,
  });
  return {
    type: org.subMerchantType,
    complete: problems.length === 0,
    problems,
    registered: !!org.subMerchantKey,
    error: org.subMerchantError,
    syncedAt: org.subMerchantSyncedAt?.toISOString() ?? null,
  };
}

const mask = (v: string | null) => (v ? `${v.slice(0, 2)}${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-2)}` : null);

function toDTO(org: Org): PayoutProfileDTO {
  return {
    subMerchantType: org.subMerchantType,
    legalTitle: org.legalTitle,
    taxOffice: org.taxOffice,
    taxNo: org.taxNo,
    identityNumberMasked: mask(org.identityNumber),
    contactName: org.contactName,
    address: org.address,
    iban: org.iban,
    email: org.email,
    phone: org.phone,
    status: payoutStatus(org),
    marketplace: marketplaceEnabled(),
  };
}

async function loadSupplier(db: DB, orgId: string) {
  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, orgId) });
  if (!org || org.type !== 'supplier') throw notFound('Tedarikçi');
  return org;
}

export async function getPayoutProfile(db: DB, orgId: string): Promise<PayoutProfileDTO> {
  return toDTO(await loadSupplier(db, orgId));
}

/** Tedarikçinin (hesap sahibi) veya yönetimin ödeme bilgilerini güncellemesi. */
export async function updatePayoutProfile(db: DB, orgId: string, raw: unknown, actor: Actor, session?: SessionPayload): Promise<PayoutProfileDTO> {
  const input = payoutProfileInput.parse(raw);
  if (session && session.role === 'supplier') {
    if (session.org !== orgId) throw notFound('Tedarikçi');
    const [u] = await db.select({ isOwner: s.users.isOwner }).from(s.users).where(eq(s.users.id, session.sub));
    if (!u?.isOwner) throw badRequest('Ödeme bilgilerini yalnızca hesap sahibi değiştirebilir');
  }
  const before = await loadSupplier(db, orgId);
  const company = input.subMerchantType !== 'PERSONAL';
  const patch = {
    subMerchantType: input.subMerchantType,
    legalTitle: company ? input.legalTitle || null : null,
    taxOffice: company ? input.taxOffice || null : null,
    taxNo: input.subMerchantType === 'LIMITED_OR_JOINT_STOCK_COMPANY' ? input.taxNo || null : before.taxNo,
    identityNumber: input.subMerchantType === 'LIMITED_OR_JOINT_STOCK_COMPANY' ? before.identityNumber : input.identityNumber || before.identityNumber,
    contactName: input.contactName || null,
    address: input.address,
    iban: input.iban,
    email: input.email,
    phone: input.phone,
  };
  const problems = payoutProfileProblems(patch);
  if (problems.length) throw badRequest(`Eksik veya hatalı bilgi: ${problems.join(', ')}`);
  const ibanChanged = before.iban !== patch.iban;

  await db.transaction(async (tx) => {
    await tx.update(s.organizations).set(patch).where(eq(s.organizations.id, orgId));
    await audit(tx, actor, 'payout_profile.update', 'organization', orgId, `${before.name} ödeme bilgileri güncellendi${ibanChanged ? ' (IBAN değişti)' : ''}`);
    if (ibanChanged && before.iban) {
      // Güvenlik: IBAN değişikliği hesap sahibine ayrıca bildirilir (yetkisiz değişiklik fark edilsin).
      const owners = await tx.select({ email: s.users.email }).from(s.users).where(eq(s.users.orgId, orgId));
      await notify(tx, {
        orgId,
        type: 'payout.iban_changed',
        title: 'Ödeme IBAN’ınız değiştirildi',
        body: `Yeni IBAN: ${formatIban(patch.iban)}. Bu değişikliği siz yapmadıysanız hemen Havuz destek ekibine yazın.`,
        link: '/tedarikci/ayarlar',
        email: owners.length > 0,
      });
      await notifyOperators(tx, { type: 'payout.iban_changed', title: `${before.name} IBAN değiştirdi`, body: `Yeni IBAN: ${formatIban(patch.iban)}`, link: '/yonetim/tedarikciler' });
    }
  });
  await syncSubMerchant(db, orgId, actor);
  return getPayoutProfile(db, orgId);
}

/**
 * Pazaryeri açıksa tedarikçiyi iyzico'ya alt satıcı olarak kaydeder/günceller. Hata, kayda yazılır
 * (tedarikçi ve yönetim ekranında görünür); istek başarısız sayılmaz.
 */
export async function syncSubMerchant(db: DB, orgId: string, actor: Actor = {}) {
  if (!marketplaceEnabled()) return { synced: false, reason: 'Pazaryeri kapalı' };
  const org = await loadSupplier(db, orgId);
  const st = payoutStatus(org);
  if (!st.complete) return { synced: false, reason: `Eksik bilgi: ${st.problems.join(', ')}` };
  const provider = paymentProvider();
  // Demo verisindeki taklit anahtarlar gerçek iyzico'da geçersizdir: yeniden kayıt yapılır.
  const existingKey = org.subMerchantKey?.startsWith('test_') && provider.name !== 'test' ? null : org.subMerchantKey;
  try {
    const r = await provider.upsertSubMerchant(
      {
        externalId: org.id,
        type: org.subMerchantType!,
        name: org.name,
        email: org.email!,
        phone: org.phone,
        address: org.address!,
        iban: org.iban!,
        legalTitle: org.legalTitle,
        taxOffice: org.taxOffice,
        taxNumber: org.taxNo,
        identityNumber: org.identityNumber,
        contactName: org.contactName,
      },
      existingKey,
    );
    await db.transaction(async (tx) => {
      await tx
        .update(s.organizations)
        .set({ subMerchantKey: r.subMerchantKey, subMerchantError: null, subMerchantSyncedAt: new Date() })
        .where(eq(s.organizations.id, orgId));
      await audit(tx, actor, 'submerchant.sync', 'organization', orgId, `${org.name} iyzico alt satıcı kaydı ${existingKey ? 'güncellendi' : 'oluşturuldu'}`);
    });
    return { synced: true };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    await db.transaction(async (tx) => {
      await tx.update(s.organizations).set({ subMerchantError: msg }).where(eq(s.organizations.id, orgId));
      await notifyOperators(tx, { type: 'submerchant.error', title: `${org.name} iyzico kaydı yapılamadı`, body: msg, link: '/yonetim/tedarikciler' });
    });
    return { synced: false, reason: msg };
  }
}
