import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { formatTRY, type RefundDTO } from '@havuz/core';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { badRequest } from '../http';
import { audit, type Actor } from '../audit';
import { notify } from '../notify';
import { kickRefunds } from './money-flow';

type Row = typeof s.refunds.$inferSelect & { org: { name: string }; order: { number: string } | null };

export function toRefundDTO(r: Row): RefundDTO {
  return {
    id: r.id,
    orgName: r.org.name,
    orderId: r.orderId,
    orderNumber: r.order?.number ?? null,
    amount: r.amount,
    reason: r.reason,
    status: r.status,
    description: r.description,
    error: r.error,
    attempts: r.attempts,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  };
}

export async function listRefunds(db: Executor, opts: { orgId?: string; orderId?: string; statuses?: RefundDTO['status'][]; limit?: number } = {}): Promise<RefundDTO[]> {
  const rows = await db.query.refunds.findMany({
    where: and(
      opts.orgId ? eq(s.refunds.orgId, opts.orgId) : undefined,
      opts.orderId ? eq(s.refunds.orderId, opts.orderId) : undefined,
      opts.statuses ? inArray(s.refunds.status, opts.statuses) : undefined,
    ),
    with: { org: { columns: { name: true } }, order: { columns: { number: true } } },
    orderBy: [desc(s.refunds.createdAt)],
    limit: opts.limit ?? 100,
  });
  return (rows as Row[]).map(toRefundDTO);
}

/** Yönetim: incelemedeki iadeyi yeniden dener. */
export async function retryRefund(db: DB, id: string, actor: Actor) {
  await db.transaction(async (tx) => {
    const [r] = await tx
      .update(s.refunds)
      .set({ status: 'pending', nextAttemptAt: new Date(), error: null })
      .where(and(eq(s.refunds.id, id), inArray(s.refunds.status, ['needs_review', 'failed'])))
      .returning();
    if (!r) throw badRequest('Yalnızca başarısız veya incelemedeki iade yeniden denenebilir');
    await audit(tx, actor, 'refund.retry', 'refund', id, `${formatTRY(r.amount)} iade yeniden denenecek`);
  });
  kickRefunds(db);
}

/**
 * Yönetim: iade iyzico panelinden elle yapıldıysa (veya sağlayıcıda zaten yapılmış olduğu
 * doğrulandıysa) kaydı tamamlandı olarak işaretler. Otomatik yeniden deneme yapılmaz.
 */
export async function markRefundDone(db: DB, id: string, note: string, actor: Actor) {
  if (!note || note.trim().length < 3) throw badRequest('Kontrol notu / referans gerekli');
  await db.transaction(async (tx) => {
    const [r] = await tx
      .update(s.refunds)
      .set({ status: 'succeeded', providerRefundId: `elle: ${note.trim().slice(0, 80)}`, completedAt: new Date(), error: null })
      .where(and(eq(s.refunds.id, id), inArray(s.refunds.status, ['needs_review', 'failed'])))
      .returning();
    if (!r) throw badRequest('Yalnızca başarısız veya incelemedeki iade işaretlenebilir');
    const [pi] = await tx.select().from(s.paymentItems).where(eq(s.paymentItems.id, r.paymentItemId));
    if (pi) await tx.update(s.paymentItems).set({ refundedAmount: pi.refundedAmount + r.amount }).where(eq(s.paymentItems.id, pi.id));
    await notify(tx, {
      orgId: r.orgId,
      type: 'refund.succeeded',
      title: `${formatTRY(r.amount)} kartınıza iade edildi`,
      body: `${r.description}. Bankanıza bağlı olarak hesabınıza yansıması birkaç iş günü sürebilir.`,
      link: r.orderId ? `/uye/siparisler/${r.orderId}` : '/uye/hesap',
      dedupeKey: `refund.succeeded:${r.id}`,
    });
    await audit(tx, actor, 'refund.manual', 'refund', id, `${formatTRY(r.amount)} iade elle tamamlandı olarak işaretlendi: ${note.trim()}`);
  });
}
