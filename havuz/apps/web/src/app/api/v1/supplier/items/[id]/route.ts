import { updateItemStatusInput } from '@havuz/core';
import { parseBody, route } from '@/server/http';
import { updateItemStatus } from '@/server/services/orders';

export const dynamic = 'force-dynamic';

export const PATCH = route<{ id: string }>(['supplier'], async ({ req, db, session, params }) => {
  const { status } = await parseBody(req, updateItemStatusInput);
  await updateItemStatus(db, session, params.id, status);
  return { ok: true };
});
