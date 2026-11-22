import { route } from '@/server/http';
import { createSettlements } from '@/server/services/settlements';

export const dynamic = 'force-dynamic';

export const POST = route(['admin'], async ({ req, db, actor }) => createSettlements(db, await req.json().catch(() => ({})), actor));
