import { route } from '@/server/http';
import { updateOffer } from '@/server/services/supplier';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['supplier'], async ({ req, db, session, params }) => {
  await updateOffer(db, session, params.id, await req.json().catch(() => ({})));
  return { ok: true };
});
