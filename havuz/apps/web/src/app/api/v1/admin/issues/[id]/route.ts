import { route } from '@/server/http';
import { resolveIssue } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  await resolveIssue(db, params.id, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
