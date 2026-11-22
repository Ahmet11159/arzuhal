import { route } from '@/server/http';
import { supplierOffers } from '@/server/services/supplier';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => ({ offers: await supplierOffers(db, session) }));
