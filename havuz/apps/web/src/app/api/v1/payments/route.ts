import { route } from '@/server/http';
import { listPayments, startPayment } from '@/server/services/payments';

export const dynamic = 'force-dynamic';

export const GET = route(['member', 'admin'], async ({ db, session }) => ({ payments: await listPayments(db, session) }));

export const POST = route(['member'], async ({ req, db, session, actor }) => startPayment(db, session, await req.json().catch(() => ({})), actor));
