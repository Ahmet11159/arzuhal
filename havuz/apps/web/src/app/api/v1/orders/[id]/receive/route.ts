import { route } from '@/server/http';
import { confirmDelivery } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string }>(['member'], async ({ db, session, params }) => {
  await confirmDelivery(db, session, params.id);
  return { ok: true };
});
