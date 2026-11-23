import { route } from '@/server/http';
import { syncSubMerchant } from '@/server/services/payout-profile';

export const dynamic = 'force-dynamic';

/** Tedarikçiyi iyzico'ya alt satıcı olarak (yeniden) kaydeder. */
export const POST = route<{ id: string }>(['admin'], async ({ db, params, actor }) => syncSubMerchant(db, params.id, actor));
