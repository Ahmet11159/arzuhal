import 'server-only';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import * as s from '../db/schema';

/**
 * Dış kanal adaptörleri. Sağlayıcı ortam değişkeniyle seçilir:
 *   EMAIL_PROVIDER    = console (varsayılan) | resend
 *   WHATSAPP_PROVIDER = console (varsayılan) | cloud   (Meta WhatsApp Cloud API)
 * "console" geliştirmede mesajı sunucu kaydına yazar ve gönderildi sayar.
 */
interface Sender {
  name: string;
  send(msg: { recipient: string; subject: string; body: string }): Promise<void>;
}

const consoleSender = (channel: string): Sender => ({
  name: 'console',
  async send(m) {
    console.info(`[havuz:${channel}] → ${m.recipient} · ${m.subject}`);
  },
});

const resendSender: Sender = {
  name: 'resend',
  async send(m) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) throw new Error('RESEND_API_KEY ve EMAIL_FROM tanımlı olmalı');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [m.recipient], subject: m.subject, text: m.body }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
};

/**
 * WhatsApp Cloud API. İşletme tarafından başlatılan mesajlar için Meta onaylı bir şablon gerekir:
 * WHATSAPP_TEMPLATE (tek gövde parametreli, tr dilinde) tanımlıysa şablon, değilse düz metin gönderilir
 * (düz metin yalnızca kullanıcının son 24 saatte yazdığı numaralara ulaşır).
 */
const whatsappCloudSender: Sender = {
  name: 'cloud',
  async send(m) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) throw new Error('WHATSAPP_TOKEN ve WHATSAPP_PHONE_NUMBER_ID tanımlı olmalı');
    const to = normalizeTrPhone(m.recipient);
    if (!to) throw new Error('Geçersiz telefon numarası');
    const template = process.env.WHATSAPP_TEMPLATE;
    const payload = template
      ? {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: { name: template, language: { code: 'tr' }, components: [{ type: 'body', parameters: [{ type: 'text', text: m.body.slice(0, 1000) }] }] },
        }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: m.body.slice(0, 4000) } };
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
  },
};

export function normalizeTrPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0')) d = '9' + d;
  if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  return /^90\d{10}$/.test(d) ? d : null;
}

export function emailProviderName() {
  return process.env.EMAIL_PROVIDER === 'resend' ? 'resend' : 'console';
}
export function whatsappProviderName() {
  return process.env.WHATSAPP_PROVIDER === 'cloud' ? 'cloud' : 'console';
}
function senderFor(channel: 'email' | 'whatsapp'): Sender {
  if (channel === 'email') return emailProviderName() === 'resend' ? resendSender : consoleSender('email');
  return whatsappProviderName() === 'cloud' ? whatsappCloudSender : consoleSender('whatsapp');
}

const MAX_ATTEMPTS = 5;

/** Bekleyen mesajları gönderir; başarısızlıkta artan bekleme ile 5 kez dener. */
export async function flushOutbox(db: DB, limit = 50) {
  const due = await db
    .select()
    .from(s.outbox)
    .where(and(eq(s.outbox.status, 'pending'), lte(s.outbox.nextAttemptAt, new Date())))
    .orderBy(asc(s.outbox.createdAt))
    .limit(limit);
  let sent = 0;
  let failed = 0;
  for (const m of due) {
    // Aynı mesajı iki sürecin göndermesini engelle: önce "deneniyor" olarak işaretle.
    const claimed = await db
      .update(s.outbox)
      .set({ attempts: sql`${s.outbox.attempts} + 1`, nextAttemptAt: new Date(Date.now() + 5 * 60_000) })
      .where(and(eq(s.outbox.id, m.id), eq(s.outbox.attempts, m.attempts), eq(s.outbox.status, 'pending')))
      .returning({ attempts: s.outbox.attempts });
    if (!claimed.length) continue;
    try {
      await senderFor(m.channel).send(m);
      await db.update(s.outbox).set({ status: 'sent', sentAt: new Date(), lastError: null }).where(eq(s.outbox.id, m.id));
      sent++;
    } catch (e) {
      const attempts = claimed[0].attempts;
      const giveUp = attempts >= MAX_ATTEMPTS;
      await db
        .update(s.outbox)
        .set({
          status: giveUp ? 'failed' : 'pending',
          lastError: e instanceof Error ? e.message.slice(0, 300) : 'Bilinmeyen hata',
          nextAttemptAt: new Date(Date.now() + 2 ** attempts * 60_000),
        })
        .where(eq(s.outbox.id, m.id));
      failed++;
    }
  }
  return { sent, failed };
}
