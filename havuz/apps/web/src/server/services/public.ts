import 'server-only';
import { count, eq } from 'drizzle-orm';
import { leadInput, type PublicStatsDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { activeWaveDTO, DAY, itemFacts } from './common';

export async function publicStats(db: DB): Promise<PublicStatsDTO> {
  const [m] = await db.select({ n: count() }).from(s.organizations).where(eq(s.organizations.type, 'member'));
  const [sp] = await db.select({ n: count() }).from(s.organizations).where(eq(s.organizations.type, 'supplier'));
  const [p] = await db.select({ n: count() }).from(s.products);
  const facts = await itemFacts(db, { since: new Date(Date.now() - 90 * DAY) });
  const volume90 = facts.reduce((a, f) => a + f.qty * f.finalUnitPrice, 0);
  const savings90 = facts.reduce((a, f) => a + f.qty * Math.max(0, f.marketPrice - f.finalUnitPrice), 0);
  return {
    members: m.n,
    suppliers: sp.n,
    products: p.n,
    volume90,
    savings90,
    avgSavingRate: volume90 + savings90 ? savings90 / (volume90 + savings90) : 0,
    openWave: await activeWaveDTO(db),
  };
}

export async function createLead(db: DB, raw: unknown) {
  const input = leadInput.parse(raw);
  await db.transaction(async (tx) => {
    const [lead] = await tx.insert(s.leads).values({ ...input, monthlySpend: input.monthlySpend ?? null }).returning();
    const { notifyNewLead } = await import('./accounts');
    await notifyNewLead(tx, lead);
  });
}
