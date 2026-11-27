import { handle } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import * as Q from '@/lib/services/quizService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (req) => handle(req, async (o) => json({ games: await Q.listGames(o.id) }));
export const POST = (req) => handle(req, async (o) => json({ id: await Q.createGame(o.id, await body(req)) }, 201));