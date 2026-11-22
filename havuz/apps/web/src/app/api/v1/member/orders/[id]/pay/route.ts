import { route } from '@/server/http';
import { payOrder } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string }>(['member'], async ({ db, session, params }) => {
  await payOrder(db, session, params.id);
  return { ok: true };
});
