import { handle } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import * as Q from '@/lib/services/quizService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (req) => handle(req, async (o) => {
  const u = new URL(req.url);
  return json({ sessions: await Q.listSessions(o.ids, { gameId: u.searchParams.get('gameId'), done: u.searchParams.get('done') === '1' }) });
});
export const POST = (req) => handle(req, async (o) => json({ id: await Q.startSession(o.ids, await body(req)) }, 201));