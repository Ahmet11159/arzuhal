import { route } from '@/server/http';
import { invoiceFile } from '@/server/services/invoices';

export const dynamic = 'force-dynamic';

export const GET = route<{ id: string }>(['member', 'supplier', 'admin'], async ({ db, session, params }) => invoiceFile(db, session, params.id));
