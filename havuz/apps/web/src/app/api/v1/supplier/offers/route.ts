import { route } from '@/server/http';
import { supplierOffers } from '@/server/services/supplier';
import { createOffer } from '@/server/services/catalog-admin';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => ({ offers: await supplierOffers(db, session) }));

export const POST = route(['supplier'], async ({ req, db, session, actor }) => createOffer(db, session, await req.json().catch(() => ({})), actor));
