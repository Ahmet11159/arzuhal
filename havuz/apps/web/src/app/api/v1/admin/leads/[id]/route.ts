import { leadDecisionInput } from '@havuz/core';
import { parseBody, route } from '@/server/http';
import { rejectLead } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  await parseBody(req, leadDecisionInput);
  await rejectLead(db, params.id, actor);
  return { ok: true };
});
