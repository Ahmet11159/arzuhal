import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  formatTRY,
  PAYMENT_PURPOSE_LABEL,
  PAYMENT_WINDOW_MINUTES,
  PRO_MONTHLY_FEE,
  startPaymentInput,
  TEST_CARDS,
  testCardInput,
  type PaymentDTO,
  type StartPaymentResult,
  type TestPaymentPageDTO,
} from '@havuz/core';
import type { DB, Executor } from '../db/client';
import * as s from '../db/schema';
import { AppError, badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { paymentProvider, PaymentConfigError } from '../payments';
import { audit, SYSTEM, type Actor } from '../audit';
import { APP_URL, notify } from '../notify';
import { notifySuppliersOfOrder } from './orders';

const returnUrlFor = (p: { purpose: string; orderId: string | null }) =>
  p.purpose === 'subscription' ? '/uye/hesap' : p.purpose === 'due' ? '/uye/hesap' : `/uye/siparisler/${p.orderId}`;

/**
 * Ödeme başlatır: tutar her zaman sunucuda hesaplanır (istemciden gelmez).
 * Aynı hedef için bekleyen eski ödeme denemeleri iptal edilir.
 */
export async function startPayment(db: DB, session: SessionPayload, raw: unknown, actor: Actor): Promise<StartPaymentResult> {
  const input = startPaymentInput.parse(raw);
  let provider;
  try {
    provider = paymentProvider();
  } catch (e) {
    if (e instanceof PaymentConfigError) throw new AppError(503, 'payment_unavailable', 'Kartla ödeme şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    throw e;
  }

  const org = await db.query.organizations.findFirst({ where: eq(s.organizations.id, session.org) });
  const user = await db.query.users.findFirst({ where: eq(s.users.id, session.sub) });
  if (!org || !user || org.type !== 'member') throw notFound('İşletme');

  let amount = 0;
  let description = '';
  let orderId: string | null = null;
  if (input.purpose === 'subscription') {
    if (org.plan === 'pro') throw badRequest('Zaten Pro üyesiniz');
    amount = PRO_MONTHLY_FEE;
    description = 'Havuz Pro üyelik (1 ay)';
  } else {
    const o = await db.query.orders.findFirst({ where: and(eq(s.orders.id, input.orderId!), eq(s.orders.memberId, org.id)) });
    if (!o) throw notFound('Sipariş');
    if (input.purpose === 'order') {
      if (o.paymentStatus !== 'unpaid' || o.status === 'cancelled') throw badRequest('Bu sipariş için ödeme beklenmiyor');
      if (Date.now() - o.createdAt.getTime() > PAYMENT_WINDOW_MINUTES * 60_000) throw badRequest('Ödeme süresi doldu; sipariş iptal edilecek');
    } else if (!['due', 'overdue'].includes(o.paymentStatus)) {
      throw badRequest('Bu sipariş için ödenecek bir bakiye yok');
    }
    amount = o.total;
    orderId = o.id;
    description = `${o.number} ${PAYMENT_PURPOSE_LABEL[input.purpose].toLocaleLowerCase('tr-TR')}`;
  }
  if (amount <= 0) throw badRequest('Ödenecek tutar yok');

  const [pay] = await db.transaction(async (tx) => {
    await tx
      .update(s.payments)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(s.payments.orgId, org.id),
          eq(s.payments.purpose, input.purpose),
          eq(s.payments.status, 'pending'),
          orderId ? eq(s.payments.orderId, orderId) : undefined,
        ),
      );
    return tx
      .insert(s.payments)
      .values({ orgId: org.id, userId: user.id, purpose: input.purpose, orderId, amount, provider: provider.name })
      .returning();
  });

  try {
    const checkout = await provider.createCheckout({
      paymentId: pay.id,
      amount,
      purpose: input.purpose,
      description,
      buyer: {
        id: org.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? org.phone,
        city: org.city,
        address: `${org.district ?? ''} ${org.city}`.trim(),
        taxNo: org.taxNo,
        ip: actor.ip ?? '127.0.0.1',
      },
      callbackUrl: `${APP_URL()}/api/v1/payments/iyzico/callback`,
    });
    await db.update(s.payments).set({ providerToken: checkout.token }).where(eq(s.payments.id, pay.id));
    await db.transaction((tx) =>
      audit(tx, { ...actor, userId: user.id, orgId: org.id, name: org.name }, 'payment.start', 'payment', pay.id, `${description} için ${formatTRY(amount)} ödeme başlatıldı (${provider.name})`),
    );
    return { paymentId: pay.id, redirectUrl: checkout.redirectUrl, provider: provider.name };
  } catch (e) {
    await db
      .update(s.payments)
      .set({ status: 'failed', errorMessage: e instanceof Error ? e.message.slice(0, 300) : 'Başlatılamadı', completedAt: new Date() })
      .where(eq(s.payments.id, pay.id));
    if (e instanceof AppError) throw e;
    console.error('[ödeme] başlatma hatası', e);
    throw new AppError(502, 'payment_provider_error', 'Ödeme sağlayıcısına bağlanılamadı. Lütfen tekrar deneyin.');
  }
}

/**
 * Başarılı ödemeyi işler. İdempotenttir (sağlayıcı callback'i iki kez gelse de etki bir kez uygulanır).
 * Kilit sırası: sipariş → ödeme (süresi dolan sipariş iptaliyle aynı sıra; kilitlenme olmaz).
 */
export async function markPaymentSucceeded(
  db: DB,
  paymentId: string,
  info: { providerPaymentId?: string; cardLast4?: string; paidAmount?: number },
  actor: Actor = SYSTEM,
) {
  return db.transaction(async (tx) => {
    const [peek] = await tx.select({ orderId: s.payments.orderId }).from(s.payments).where(eq(s.payments.id, paymentId));
    if (!peek) throw notFound('Ödeme');
    const order = peek.orderId ? (await tx.select().from(s.orders).where(eq(s.orders.id, peek.orderId)).for('no key update'))[0] : null;
    const [p] = await tx.select().from(s.payments).where(eq(s.payments.id, paymentId)).for('update');
    if (p.status === 'succeeded') return { alreadyProcessed: true, mismatch: false as const, payment: p };
    if (info.paidAmount !== undefined && info.paidAmount !== p.amount) {
      // Hata fırlatılmaz: "başarısız" kaydı ve işlem kaydı kalıcı olarak yazılmalı (rollback olmamalı).
      const reason = `Tutar uyuşmazlığı: sağlayıcı ${formatTRY(info.paidAmount)}, beklenen ${formatTRY(p.amount)}`;
      await tx.update(s.payments).set({ status: 'failed', errorMessage: reason, completedAt: new Date() }).where(eq(s.payments.id, p.id));
      await audit(tx, actor, 'payment.amount_mismatch', 'payment', p.id, reason);
      console.error('[ödeme] tutar uyuşmazlığı', { paymentId: p.id, expected: p.amount, paid: info.paidAmount });
      return { alreadyProcessed: false, mismatch: true as const, payment: p };
    }
    await tx
      .update(s.payments)
      .set({ status: 'succeeded', providerPaymentId: info.providerPaymentId ?? null, cardLast4: info.cardLast4 ?? null, completedAt: new Date(), errorMessage: null })
      .where(eq(s.payments.id, p.id));

    const now = new Date();
    // Para gerçekten tahsil edildi ama karşılığı artık geçerli değilse (çift ödeme, iptal edilmiş sipariş,
    // zaten Pro olan üyelik): tutar asla yok sayılmaz, üyenin kredisine iade edilir.
    const refundToCredit = async (why: string) => {
      await tx.insert(s.ledgerEntries).values({ orgId: p.orgId, type: 'adjustment', amount: p.amount, description: why, refId: order?.id ?? p.id });
      await notify(tx, { orgId: p.orgId, type: 'payment.refunded_credit', title: 'Ödemeniz krediye eklendi', body: `${why}: ${formatTRY(p.amount)} kredi bakiyenize eklendi.`, link: '/uye/hesap', email: true });
    };
    if (p.purpose === 'subscription') {
      const [org] = await tx.select().from(s.organizations).where(eq(s.organizations.id, p.orgId)).for('no key update');
      if (org.plan === 'pro') {
        await refundToCredit('Pro üyelik zaten aktifken alınan ödeme iadesi');
      } else {
        await tx
          .update(s.organizations)
          .set({ plan: 'pro', creditLimit: Math.max(org.creditLimit, 25_000_000) })
          .where(eq(s.organizations.id, p.orgId));
        await tx.insert(s.subscriptions).values({ orgId: p.orgId, amount: p.amount, periodStart: new Date(now.getFullYear(), now.getMonth(), 1) });
        await notify(tx, { orgId: p.orgId, type: 'payment.succeeded', title: 'Pro üyeliğiniz aktif', body: `${formatTRY(p.amount)} ödeme alındı. 60 gün vade ve düşük vade farkı artık kullanılabilir.`, link: '/uye/hesap', email: true });
      }
    } else if (order) {
      const expected = p.purpose === 'order' ? ['unpaid'] : ['due', 'overdue'];
      if (order.status === 'cancelled') {
        await refundToCredit(`${order.number} iptal edildikten sonra alınan ödeme iadesi`);
      } else if (!expected.includes(order.paymentStatus)) {
        await refundToCredit(`${order.number} için mükerrer ödeme iadesi`);
      } else {
        await tx.update(s.orders).set({ paymentStatus: 'paid', paidAt: now }).where(eq(s.orders.id, order.id));
        if (p.purpose === 'order') await notifySuppliersOfOrder(tx, order.id);
        await notify(tx, { orgId: p.orgId, type: 'payment.succeeded', title: `Ödeme alındı: ${order.number}`, body: `${formatTRY(p.amount)} kartınızdan tahsil edildi.`, link: `/uye/siparisler/${order.id}` });
      }
    }
    await audit(tx, actor, 'payment.succeeded', 'payment', p.id, `${PAYMENT_PURPOSE_LABEL[p.purpose]} başarılı: ${formatTRY(p.amount)}`, { provider: p.provider });
    return { alreadyProcessed: false, mismatch: false as const, payment: p };
  });
}

export async function markPaymentFailed(db: DB, paymentId: string, error: string, actor: Actor = SYSTEM) {
  await db.transaction(async (tx) => {
    const [p] = await tx.select().from(s.payments).where(eq(s.payments.id, paymentId)).for('update');
    if (!p || p.status !== 'pending') return;
    await tx.update(s.payments).set({ status: 'failed', errorMessage: error.slice(0, 300), completedAt: new Date() }).where(eq(s.payments.id, p.id));
    await audit(tx, actor, 'payment.failed', 'payment', p.id, `${PAYMENT_PURPOSE_LABEL[p.purpose]} başarısız: ${error}`);
  });
}

async function ownPayment(db: Executor, session: SessionPayload, id: string) {
  const p = await db.query.payments.findFirst({ where: eq(s.payments.id, id), with: { org: true, order: true } });
  if (!p || p.orgId !== session.org) throw notFound('Ödeme');
  return p;
}

export async function testPaymentPage(db: DB, session: SessionPayload, id: string): Promise<TestPaymentPageDTO> {
  const p = await ownPayment(db, session, id);
  if (p.provider !== 'test') throw badRequest('Bu ödeme test modunda değil');
  return {
    id: p.id,
    purpose: p.purpose,
    orderId: p.orderId,
    status: p.status,
    amount: p.amount,
    orgName: p.org.name,
    orderNumber: p.order?.number ?? null,
    returnUrl: returnUrlFor(p),
  };
}

/** Test modu: kart numarasına göre sonuç (gerçek para çekilmez). */
export async function completeTestPayment(db: DB, session: SessionPayload, id: string, raw: unknown, actor: Actor) {
  const card = testCardInput.parse(raw);
  const p = await ownPayment(db, session, id);
  if (p.provider !== 'test') throw badRequest('Bu ödeme test modunda değil');
  if (p.status === 'succeeded') return { status: 'succeeded' as const, returnUrl: returnUrlFor(p) };
  if (p.status !== 'pending') throw badRequest('Bu ödeme artık geçerli değil; lütfen yeniden başlatın');
  const [mm, yy] = card.expiry.split('/').map(Number);
  if (new Date(2000 + yy, mm, 1) <= new Date()) {
    await markPaymentFailed(db, p.id, 'Kartın son kullanma tarihi geçmiş', actor);
    return { status: 'failed' as const, error: 'Kartın son kullanma tarihi geçmiş', returnUrl: returnUrlFor(p) };
  }
  const outcomes: Record<string, string | null> = {
    [TEST_CARDS.success]: null,
    [TEST_CARDS.declined]: 'Kart bankanız tarafından reddedildi',
    [TEST_CARDS.insufficient]: 'Kartta yeterli bakiye yok',
  };
  const error = card.cardNumber in outcomes ? outcomes[card.cardNumber] : 'Test modunda yalnızca test kartları kullanılabilir';
  if (error) {
    await markPaymentFailed(db, p.id, error, actor);
    return { status: 'failed' as const, error, returnUrl: returnUrlFor(p) };
  }
  await markPaymentSucceeded(db, p.id, { providerPaymentId: `test_${p.id.slice(0, 8)}`, cardLast4: card.cardNumber.slice(-4), paidAmount: p.amount }, actor);
  return { status: 'succeeded' as const, returnUrl: returnUrlFor(p) };
}

/** iyzico callback: token ile sonucu sağlayıcıdan doğrular, sonra kullanıcıyı uygulamaya yönlendirir. */
export async function handleIyzicoCallback(db: DB, token: string) {
  const p = await db.query.payments.findFirst({ where: and(eq(s.payments.providerToken, token), eq(s.payments.provider, 'iyzico')) });
  if (!p) return { redirect: '/uye?odeme=bulunamadi' };
  const back = returnUrlFor(p);
  if (p.status === 'succeeded') return { redirect: `${back}?odeme=basarili` };
  const r = await paymentProvider().retrieve(token, p.id);
  if (r.conversationId && r.conversationId !== p.id) {
    await markPaymentFailed(db, p.id, 'Ödeme kimliği eşleşmedi');
    return { redirect: `${back}?odeme=hata` };
  }
  if (r.status === 'succeeded') {
    const done = await markPaymentSucceeded(db, p.id, { providerPaymentId: r.providerPaymentId, cardLast4: r.cardLast4, paidAmount: r.paidAmount });
    return { redirect: `${back}?odeme=${done.mismatch ? 'hata' : 'basarili'}` };
  }
  await markPaymentFailed(db, p.id, r.error ?? 'Ödeme başarısız');
  return { redirect: `${back}?odeme=hata` };
}

export async function listPayments(db: DB, session: SessionPayload): Promise<PaymentDTO[]> {
  const rows = await db.query.payments.findMany({
    where: session.role === 'admin' ? undefined : eq(s.payments.orgId, session.org),
    with: { org: true, order: true },
    orderBy: [desc(s.payments.createdAt)],
    limit: 200,
  });
  return rows.map((p) => ({
    id: p.id,
    purpose: p.purpose,
    status: p.status,
    amount: p.amount,
    provider: p.provider,
    orgName: p.org.name,
    orderId: p.orderId,
    orderNumber: p.order?.number ?? null,
    cardLast4: p.cardLast4,
    errorMessage: p.errorMessage,
    createdAt: p.createdAt.toISOString(),
    completedAt: p.completedAt?.toISOString() ?? null,
  }));
}

/** Bakım: ödeme süresi dolan peşin siparişleri iptal eder. */
export async function expireUnpaidOrders(db: DB, now = new Date()) {
  const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60_000);
  const candidates = await db
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(and(eq(s.orders.paymentStatus, 'unpaid'), inArray(s.orders.status, ['pending', 'confirmed'])));
  let expired = 0;
  const { cancelUnpaidOrder } = await import('./orders');
  for (const c of candidates) {
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(s.orders).where(eq(s.orders.id, c.id)).for('no key update');
      if (!o || o.paymentStatus !== 'unpaid' || o.status === 'cancelled' || o.createdAt > cutoff) return;
      await cancelUnpaidOrder(tx, o, `Ödeme ${PAYMENT_WINDOW_MINUTES} dakika içinde tamamlanmadığı için sipariş iptal edildi; stok ve kredi iade edildi.`);
      await audit(tx, SYSTEM, 'order.expire', 'order', o.id, `${o.number} ödeme süresi dolduğu için iptal edildi`);
      expired++;
    });
  }
  return expired;
}
