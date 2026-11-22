import { z } from 'zod';
import { parseBody, route } from '@/server/http';
import { markNotificationsRead } from '@/server/services/activity';

export const dynamic = 'force-dynamic';

export const POST = route(['member', 'supplier', 'admin'], async ({ req, db, session }) => {
  const { id } = await parseBody(req, z.object({ id: z.string().optional() }));
  await markNotificationsRead(db, session, id);
  return { ok: true };
});
