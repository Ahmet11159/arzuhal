import { route } from '@/server/http';
import { listAuditLogs } from '@/server/services/activity';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ req, db }) => {
  const u = new URL(req.url);
  return { logs: await listAuditLogs(db, u.searchParams.get('q') || undefined, u.searchParams.get('entity') || undefined) };
});
