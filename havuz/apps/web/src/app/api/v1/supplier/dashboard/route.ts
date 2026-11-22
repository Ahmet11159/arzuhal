import { route } from '@/server/http';
import { supplierDashboard } from '@/server/services/supplier';

export const dynamic = 'force-dynamic';

export const GET = route(['supplier'], async ({ db, session }) => supplierDashboard(db, session));
