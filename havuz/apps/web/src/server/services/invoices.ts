import 'server-only';
import { and, eq, isNull, lte, ne } from 'drizzle-orm';
import { formatTRY, uploadInvoiceInput } from '@havuz/core';
import type { DB } from '../db/client';
import * as s from '../db/schema';
import { badRequest, notFound } from '../http';
import type { SessionPayload } from '../auth/secret';
import { audit, type Actor } from '../audit';
import { notify } from '../notify';

/**
 * Tedarikçi faturaları. Pazaryeri modelinde ürün faturasını tedarikçi keser (kendi e-Fatura /
 * e-Arşiv sistemiyle) ve sipariş için buraya yükler; işletme sipariş sayfasından indirir.
 * Aynı sipariş için yeniden yükleme eskisinin yerine geçer (düzeltme faturası) ve kayda yazılır.
 */
export async function uploadInvoice(db: DB, session: SessionPayload, raw: unknown, actor: Actor) {
  const input = uploadInvoiceInput.parse(raw);
  const items = await db
    .select({ id: s.orderItems.id, status: s.orderItems.status })
    .from(s.orderItems)
    .where(and(eq(s.orderItems.orderId, input.orderId), eq(s.orderItems.supplierId, session.org)));
  if (items.length === 0) throw notFound('Sipariş');
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, input.orderId));
  if (!order || order.paymentStatus === 'unpaid') throw notFound('Sipariş');
  if (items.every((i) => i.status === 'cancelled')) throw badRequest('İptal edilmiş kalemler için fatura yüklenmez');
  if (input.issuedAt.getTime() > Date.now() + 86_400_000) throw badRequest('Fatura tarihi gelecekte olamaz');
  const mime = /^data:([^;]+);/.exec(input.file)![1];
  const size = Math.floor((input.file.length - input.file.indexOf(',') - 1) * 0.75);

  const id = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: s.invoices.id })
      .from(s.invoices)
      .where(and(eq(s.invoices.orderId, input.orderId), eq(s.invoices.supplierId, session.org)))
      .for('update');
    const values = {
      number: input.number,
      issuedAt: input.issuedAt,
      amount: input.amount,
      fileName: input.fileName,
      mime,
      size,
      fileData: input.file,
      uploadedBy: session.sub,
    };
    let invoiceId: string;
    if (existing) {
      await tx.update(s.invoices).set({ ...values, createdAt: new Date() }).where(eq(s.invoices.id, existing.id));
      invoiceId = existing.id;
    } else {
      [{ id: invoiceId }] = await tx.insert(s.invoices).values({ ...values, orderId: input.orderId, supplierId: session.org }).returning({ id: s.invoices.id });
    }
    const [sup] = await tx.select({ name: s.organizations.name }).from(s.organizations).where(eq(s.organizations.id, session.org));
    await notify(tx, {
      orgId: order.memberId,
      type: 'invoice.uploaded',
      title: `Fatura: ${order.number}`,
      body: `${sup?.name ?? 'Tedarikçi'} ${formatTRY(input.amount)} tutarındaki faturayı yükledi (no ${input.number}).`,
      link: `/uye/siparisler/${order.id}`,
      dedupeKey: `invoice.uploaded:${invoiceId}:${input.number}`,
    });
    await audit(tx, actor, existing ? 'invoice.replace' : 'invoice.upload', 'invoice', invoiceId, `${order.number} faturası ${existing ? 'yenilendi' : 'yüklendi'}: ${input.number} (${formatTRY(input.amount)})`);
    return invoiceId;
  });
  return { id };
}

/** Fatura dosyası: siparişin üyesi, faturayı yükleyen tedarikçi veya yönetim indirebilir. */
export async function invoiceFile(db: DB, session: SessionPayload, id: string): Promise<Response> {
  const [inv] = await db.select().from(s.invoices).where(eq(s.invoices.id, id));
  if (!inv) throw notFound('Fatura');
  if (session.role === 'supplier' && inv.supplierId !== session.org) throw notFound('Fatura');
  if (session.role === 'member') {
    const [o] = await db.select({ memberId: s.orders.memberId }).from(s.orders).where(eq(s.orders.id, inv.orderId));
    if (o?.memberId !== session.org) throw notFound('Fatura');
  }
  const bytes = Buffer.from(inv.fileData.slice(inv.fileData.indexOf(',') + 1), 'base64');
  const ext = inv.mime === 'application/pdf' ? 'pdf' : inv.mime.split('/')[1];
  const safeName = `fatura-${inv.number.replace(/[^A-Za-z0-9_-]+/g, '-')}.${ext}`;
  return new Response(bytes, {
    headers: {
      'Content-Type': inv.mime,
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Teslim edilmiş ama faturası yüklenmemiş siparişler (tedarikçi bazında; 3 günden eski). */
export async function missingInvoiceCounts(db: DB) {
  const rows = await db
    .selectDistinct({ supplierId: s.orderItems.supplierId, orderId: s.orderItems.orderId })
    .from(s.orderItems)
    .leftJoin(s.invoices, and(eq(s.invoices.orderId, s.orderItems.orderId), eq(s.invoices.supplierId, s.orderItems.supplierId)))
    .where(and(eq(s.orderItems.status, 'delivered'), isNull(s.invoices.id), lte(s.orderItems.deliveredAt, new Date(Date.now() - 3 * 86_400_000)), ne(s.orderItems.status, 'cancelled')));
  const out: Record<string, number> = {};
  for (const r of rows) out[r.supplierId] = (out[r.supplierId] ?? 0) + 1;
  return out;
}


