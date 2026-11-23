import 'server-only';
import { getDb } from '@/server/db/client';
import { getCompany } from '@/server/services/site';

/** Yasal sayfalar için şirket bilgileri (yönetim panelinden girilir). */
export async function loadCompany() {
  return getCompany(await getDb());
}

export const LEGAL_UPDATED = '24 Kasım 2026';
