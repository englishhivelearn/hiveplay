import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { createVocabCategory } from '@/lib/services/vocabularyService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req) { const g = await adminOnly(req); if (g) return g; try { return json({ category: await createVocabCategory(await body(req)) }, 201); } catch (e) { return fail(e); } }
