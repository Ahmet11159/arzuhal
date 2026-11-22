import { route } from '@/server/http';
import { adminMembers } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ members: await adminMembers(db) }));
