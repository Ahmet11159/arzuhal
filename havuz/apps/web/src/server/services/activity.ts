import 'server-only';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { AuditLogDTO, NotificationDTO, OutboxDTO } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import type { SessionPayload } from '../auth/secret';

const visibleTo = (session: SessionPayload) =>
  and(eq(s.notifications.orgId, session.org), or(isNull(s.notifications.userId), eq(s.notifications.userId, session.sub)));

export async function listNotifications(db: DB, session: SessionPayload): Promise<{ notifications: NotificationDTO[]; unread: number }> {
  const rows = await db.select().from(s.notifications).where(visibleTo(session)).orderBy(desc(s.notifications.createdAt)).limit(40);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(s.notifications)
    .where(and(visibleTo(session), isNull(s.notifications.readAt)));
  return {
    unread: n,
    notifications: rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, link: r.link, read: !!r.readAt, createdAt: r.createdAt.toISOString() })),
  };
}

export async function markNotificationsRead(db: DB, session: SessionPayload, id?: string) {
  await db
    .update(s.notifications)
    .set({ readAt: new Date() })
    .where(and(visibleTo(session), isNull(s.notifications.readAt), id ? eq(s.notifications.id, id) : undefined));
}

export async function listAuditLogs(db: DB, q?: string, entity?: string): Promise<AuditLogDTO[]> {
  const rows = await db
    .select()
    .from(s.auditLogs)
    .where(and(entity ? eq(s.auditLogs.entity, entity) : undefined, q ? or(ilike(s.auditLogs.summary, `%${q}%`), ilike(s.auditLogs.actorName, `%${q}%`)) : undefined))
    .orderBy(desc(s.auditLogs.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    actorName: r.actorName,
    action: r.action,
    entity: r.entity,
    entityId: r.entityId,
    summary: r.summary,
    ip: r.ip,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function listOutbox(db: DB): Promise<OutboxDTO[]> {
  const rows = await db.select().from(s.outbox).orderBy(desc(s.outbox.createdAt)).limit(200);
  return rows.map((r) => ({
    id: r.id,
    channel: r.channel,
    recipient: r.recipient,
    subject: r.subject,
    // Geçici şifre / sıfırlama bağlantısı içeren mesajların gövdesi gösterilmez.
    body: r.sensitive ? null : r.body,
    status: r.status,
    attempts: r.attempts,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
    sentAt: r.sentAt?.toISOString() ?? null,
  }));
}
