import { route } from '@/server/http';
import { completeTestPayment, testPaymentPage } from '@/server/services/payments';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['member'], async ({ db, session, params }) => ({ payment: await testPaymentPage(db, session, params.id) }));

export const POST = route<{ id: string }>(['member'], async ({ req, db, session, params, actor }) =>
  completeTestPayment(db, session, params.id, await req.json().catch(() => ({})), actor),
);
