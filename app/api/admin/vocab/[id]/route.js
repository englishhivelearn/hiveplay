import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { getVocabulary, updateVocabulary, deleteVocabulary, vocabularyLinks } from '@/lib/services/vocabularyService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { const w = await getVocabulary((await params).id); return w ? json({ word: w, links: await vocabularyLinks(w.id) }) : json({ error: 'Kata tidak ditemukan.' }, 404); } catch (e) { return fail(e); }
}
export async function PATCH(req, { params }) { const g = await adminOnly(req); if (g) return g; try { return json({ word: await updateVocabulary((await params).id, await body(req)) }); } catch (e) { return fail(e); } }
export async function DELETE(req, { params }) { const g = await adminOnly(req); if (g) return g; try { return json(await deleteVocabulary((await params).id)); } catch (e) { return fail(e); } }
