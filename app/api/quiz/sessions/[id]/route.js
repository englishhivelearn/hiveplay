import { handle } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import * as Q from '@/lib/services/quizService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = (req, { params }) => handle(req, async (o) => json({ session: await Q.getSession(o.ids, (await params).id) }));
export const POST = (req, { params }) => handle(req, async (o) => json(await Q.act(o.ids, (await params).id, await body(req))));
export const DELETE = (req, { params }) => handle(req, async (o) => { await Q.deleteSession(o.ids, (await params).id); return json({ ok: true }); });