import 'server-only';
import { eq } from 'drizzle-orm';
import { companyInput, type CompanyDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { audit, type Actor } from '../audit';

const EMPTY: Omit<CompanyDTO, 'configured' | 'updatedAt'> = {
  legalName: '[Şirket ticari unvanı]',
  brandName: 'Havuz',
  address: '[Şirket adresi]',
  taxOffice: '[Vergi dairesi]',
  taxNo: '[Vergi no]',
  mersisNo: '',
  tradeRegistryNo: '',
  phone: '[Telefon]',
  email: 'destek@havuz.app',
  kepAddress: '',
  supportHours: 'Hafta içi 09:00–18:00',
  kvkkEmail: '',
  etbisNo: '',
};

/** Yasal sayfalarda ve iletişimde kullanılan şirket bilgileri. Girilmediyse yer tutucular döner. */
export async function getCompany(db: DB): Promise<CompanyDTO> {
  const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, 'company'));
  if (!row) return { ...EMPTY, configured: false, updatedAt: null };
  const v = row.value as Partial<CompanyDTO>;
  const pick = (k: keyof typeof EMPTY) => (typeof v[k] === 'string' && (v[k] as string).trim() ? (v[k] as string) : EMPTY[k]);
  return {
    legalName: pick('legalName'),
    brandName: pick('brandName'),
    address: pick('address'),
    taxOffice: pick('taxOffice'),
    taxNo: pick('taxNo'),
    mersisNo: (v.mersisNo as string) ?? '',
    tradeRegistryNo: (v.tradeRegistryNo as string) ?? '',
    phone: pick('phone'),
    email: pick('email'),
    kepAddress: (v.kepAddress as string) ?? '',
    supportHours: pick('supportHours'),
    kvkkEmail: (v.kvkkEmail as string) || pick('email'),
    etbisNo: (v.etbisNo as string) ?? '',
    configured: true,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function updateCompany(db: DB, raw: unknown, actor: Actor): Promise<CompanyDTO> {
  const input = companyInput.parse(raw);
  await db.transaction(async (tx) => {
    await tx
      .insert(s.siteSettings)
      .values({ key: 'company', value: input, updatedAt: new Date() })
      .onConflictDoUpdate({ target: s.siteSettings.key, set: { value: input, updatedAt: new Date() } });
    await audit(tx, actor, 'company.update', 'site', 'company', `Şirket bilgileri güncellendi: ${input.legalName}`);
  });
  return getCompany(db);
}
