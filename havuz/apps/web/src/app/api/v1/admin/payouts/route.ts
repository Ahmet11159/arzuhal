import { route } from '@/server/http';
import { adminPayouts } from '@/server/services/settlements';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => adminPayouts(db));
