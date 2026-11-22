import { route } from '@/server/http';
import { settlementDetail } from '@/server/services/settlements';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['supplier', 'admin'], async ({ db, session, params }) => ({ settlement: await settlementDetail(db, session, params.id) }));
