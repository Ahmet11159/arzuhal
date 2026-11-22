import { route } from '@/server/http';
import { resolveIssue } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['admin'], async ({ req, db, params }) => {
  await resolveIssue(db, params.id, await req.json().catch(() => ({})));
  return { ok: true };
});
