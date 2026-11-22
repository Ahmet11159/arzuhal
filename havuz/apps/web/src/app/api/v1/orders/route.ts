import { route } from '@/server/http';
import { createOrder, listOrders } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'admin'], async ({ db, session }) => ({ orders: await listOrders(db, session) }));

export const POST = route(['member'], async ({ req, db, session }) => ({
  order: await createOrder(db, session, await req.json().catch(() => ({}))),
}));
