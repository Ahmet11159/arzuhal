import { route } from '@/server/http';
import { getPayoutProfile, updatePayoutProfile } from '@/server/services/payout-profile';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['admin'], async ({ db, params }) => getPayoutProfile(db, params.id));

export const PUT = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) =>
  updatePayoutProfile(db, params.id, await req.json().catch(() => ({})), actor),
);
