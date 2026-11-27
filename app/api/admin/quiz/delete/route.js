import { adminHandle } from '@/lib/quizAdminApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import * as A from '@/lib/services/quizAdminService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (req) => adminHandle(async () => {
  const b = await body(req);
  return json(await A.deleteGames(b.ids, b.withSessions === true));
});