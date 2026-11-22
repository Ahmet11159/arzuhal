import { route } from '@/server/http';
import { memberStatement } from '@/server/services/statements';

export const dynamic = 'force-dynamic';

export const GET = route<{ month: string }>(['member'], async ({ db, session, params }) => ({ statement: await memberStatement(db, session, params.month) }));
