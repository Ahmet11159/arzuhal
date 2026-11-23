import { route } from '@/server/http';
import { uploadInvoice } from '@/server/services/invoices';

export const dynamic = 'force-dynamic';

/** Tedarikçi sipariş faturasını yükler (aynı sipariş için yeniden yükleme eskisinin yerine geçer). */
export const POST = route(['supplier'], async ({ req, db, session, actor }) => uploadInvoice(db, session, await req.json().catch(() => ({})), actor));
