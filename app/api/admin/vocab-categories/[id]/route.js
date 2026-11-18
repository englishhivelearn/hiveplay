import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { updateVocabCategory } from '@/lib/services/vocabularyService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function PATCH(req, { params }) { const g = await adminOnly(req); if (g) return g; try { return json({ category: await updateVocabCategory((await params).id, await body(req)) }); } catch (e) { return fail(e); } }
