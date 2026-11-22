import { route } from '@/server/http';
import { updateOrganization } from '@/server/services/accounts';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['admin'], async ({ req, db, params, actor }) => {
  await updateOrganization(db, params.id, await req.json().catch(() => ({})), actor);
  return { ok: true };
});
