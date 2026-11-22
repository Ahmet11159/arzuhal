import { route } from '@/server/http';
import { supplierItems } from '@/server/services/supplier';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => ({ items: await supplierItems(db, session) }));
