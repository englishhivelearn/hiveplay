import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { getSetAdmin, updateSet, deleteSet } from '@/lib/services/vocabularySetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req, { params }) { const g = await adminOnly(req); if (g) return g; try { const s = await getSetAdmin((await params).id); return s ? json({ set: s }) : json({ error: 'Set tidak ditemukan.' }, 404); } catch (e) { return fail(e); } }
export async function PATCH(req, { params }) { const g = await adminOnly(req); if (g) return g; try { return json({ set: await updateSet((await params).id, await body(req)) }); } catch (e) { return fail(e); } }
export async function DELETE(req, { params }) { const g = await adminOnly(req); if (g) return g; try { return json(await deleteSet((await params).id)); } catch (e) { return fail(e); } }
