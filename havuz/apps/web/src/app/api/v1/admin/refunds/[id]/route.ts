import { z } from 'zod';
import { parseBody, route } from '@/server/http';
import { markRefundDone, retryRefund } from '@/server/services/refunds';

export const dynamic = 'force-dynamic';

const body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('retry') }),
  z.object({ action: z.literal('mark_done'), note: z.string().trim().min(3, 'Kontrol notu / referans gerekli').max(120) }),
]);

/** Yönetim: incelemedeki iadeyi yeniden dene ya da elle yapıldı olarak işaretle. */
export const POST = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  const input = await parseBody(req, body);
  if (input.action === 'retry') await retryRefund(db, params.id, actor);
  else await markRefundDone(db, params.id, input.note, actor);
  return { ok: true };
});
