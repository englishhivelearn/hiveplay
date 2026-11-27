import { handle } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import * as Q from '@/lib/services/quizService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (req, { params }) => handle(req, async (o) => json({ game: await Q.getGame(o.id, (await params).id) }));
export const PUT = (req, { params }) => handle(req, async (o) => json(await Q.saveGame(o.id, (await params).id, await body(req))));
export const DELETE = (req, { params }) => handle(req, async (o) => { await Q.deleteGame(o.id, (await params).id); return json({ ok: true }); });