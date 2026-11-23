import { route } from '@/server/http';
import { getPayoutProfile, updatePayoutProfile } from '@/server/services/payout-profile';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => getPayoutProfile(db, session.org));

export const PUT = route(['supplier'], async ({ req, db, session, actor }) =>
  updatePayoutProfile(db, session.org, await req.json().catch(() => ({})), actor, session),
);
