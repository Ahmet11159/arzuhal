import { route } from '@/server/http';
import { markSettlementPaid } from '@/server/services/settlements';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  await markSettlementPaid(db, params.id, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
