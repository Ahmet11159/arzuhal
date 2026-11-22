import { reportIssueInput } from '@havuz/core';
import { parseBody, route } from '@/server/http';
import { reportIssue } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const POST = route<{ id: string; itemId: string }>(['member'], async ({ req, db, session, params }) => {
  await reportIssue(db, session, params.id, params.itemId, await parseBody(req, reportIssueInput));
  return { ok: true };
});
