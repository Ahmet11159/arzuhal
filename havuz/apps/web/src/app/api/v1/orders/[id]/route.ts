import { route } from '@/server/http';
import { getOrder } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['member', 'supplier', 'admin'], async ({ db, session, params }) => ({
  order: await getOrder(db, session, params.id),
}));
