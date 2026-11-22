import { route } from '@/server/http';
import { adminIssues } from '@/server/services/admin';

export const dynamic = 'force-dynamic';

export const GET = route(['admin'], async ({ db }) => ({ issues: await adminIssues(db) }));
