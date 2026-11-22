import { route } from '@/server/http';
import { upgradeToPro } from '@/server/services/member';

export const dynamic = 'force-dynamic';

export const POST = route(['member'], async ({ db, session }) => {
  await upgradeToPro(db, session);
  return { ok: true };
});
