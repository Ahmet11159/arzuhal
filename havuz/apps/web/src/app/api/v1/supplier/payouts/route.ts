import { route } from '@/server/http';
import { supplierPayouts } from '@/server/services/settlements';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => supplierPayouts(db, session));
