import 'server-only';
import type { Executor } from './db/client';
import * as s from './db/schema';

export interface Actor {
  userId?: string | null;
  orgId?: string | null;
  name?: string | null;
  ip?: string | null;
}

/**
 * İşlem kaydı. Kayıt, işlemle aynı transaction içinde yazılır: işlem geri alınırsa kayıt da düşer.
 * meta içine şifre, token veya kart bilgisi KONMAZ.
 */
export async function audit(
  tx: Executor,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
  meta?: Record<string, unknown>,
) {
  await tx.insert(s.auditLogs).values({
    actorUserId: actor.userId ?? null,
    actorOrgId: actor.orgId ?? null,
    actorName: actor.name ?? null,
    action,
    entity,
    entityId,
    summary,
    meta: meta ?? null,
    ip: actor.ip ?? null,
  });
}

export const SYSTEM: Actor = { name: 'Sistem' };
