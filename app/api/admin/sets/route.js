import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { listSetsAdmin, createSet } from '@/lib/services/vocabularySetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) { const g = await adminOnly(req); if (g) return g; try { return json({ sets: await listSetsAdmin() }); } catch (e) { return fail(e); } }
export async function POST(req) { const g = await adminOnly(req); if (g) return g; try { return json({ set: await createSet(await body(req)) }, 201); } catch (e) { return fail(e); } }
