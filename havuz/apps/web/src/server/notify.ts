import 'server-only';
import { and, eq } from 'drizzle-orm';
import type { Executor } from './db/client';
import * as s from './db/schema';

export interface NotifyInput {
  orgId: string;
  /** Belirli bir kullanıcı; boşsa kuruluşun tüm kullanıcıları görür. */
  userId?: string | null;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  /** Aynı anahtarla ikinci bildirim yazılmaz (zamanlanmış hatırlatmalar için). */
  dedupeKey?: string;
  /** Kuruluş kullanıcılarına e-posta da gönderilsin mi? */
  email?: boolean;
  /** Kuruluşun telefonuna WhatsApp mesajı da gönderilsin mi? */
  whatsapp?: boolean;
}

const APP_URL = () => process.env.APP_URL ?? 'http://localhost:3100';

/** Uygulama içi bildirim + (isteğe bağlı) e-posta/WhatsApp kuyruğu. İşlemle aynı transaction'da yazılır. */
export async function notify(tx: Executor, n: NotifyInput): Promise<boolean> {
  const inserted = await tx
    .insert(s.notifications)
    .values({
      orgId: n.orgId,
      userId: n.userId ?? null,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link ?? null,
      dedupeKey: n.dedupeKey ?? null,
    })
    .onConflictDoNothing({ target: s.notifications.dedupeKey })
    .returning({ id: s.notifications.id });
  if (inserted.length === 0) return false;

  const link = n.link ? `${APP_URL()}${n.link}` : APP_URL();
  if (n.email) {
    const recipients = await tx
      .select({ email: s.users.email })
      .from(s.users)
      .where(and(eq(s.users.orgId, n.orgId), eq(s.users.active, true), n.userId ? eq(s.users.id, n.userId) : undefined));
    for (const r of recipients) {
      await tx.insert(s.outbox).values({ channel: 'email', recipient: r.email, subject: n.title, body: `${n.body}\n\n${link}` });
    }
  }
  if (n.whatsapp) {
    const [org] = await tx.select({ phone: s.organizations.phone }).from(s.organizations).where(eq(s.organizations.id, n.orgId));
    if (org?.phone) {
      await tx.insert(s.outbox).values({ channel: 'whatsapp', recipient: org.phone, subject: n.title, body: `${n.title}\n${n.body}\n${link}` });
    }
  }
  return true;
}

/** Hassas e-posta (geçici şifre, sıfırlama bağlantısı): gövdesi yönetim ekranında gizlenir. */
export async function sendSensitiveEmail(tx: Executor, to: string, subject: string, body: string) {
  await tx.insert(s.outbox).values({ channel: 'email', recipient: to, subject, body, sensitive: true });
}

/** Yönetim (operatör) kuruluşuna bildirim. */
export async function notifyOperators(tx: Executor, n: Omit<NotifyInput, 'orgId'>) {
  const ops = await tx.select({ id: s.organizations.id }).from(s.organizations).where(eq(s.organizations.type, 'operator'));
  for (const o of ops) await notify(tx, { ...n, orgId: o.id, dedupeKey: n.dedupeKey ? `${n.dedupeKey}:${o.id}` : undefined });
}

export { APP_URL };
