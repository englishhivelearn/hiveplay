import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { setVocabularyLink, removeVocabularyLink } from '@/lib/services/vocabularyService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { const b = await body(req); return json({ links: await setVocabularyLink((await params).id, b.assetId, b.role, !!b.isPrimary) }); } catch (e) { return fail(e); }
}
export async function DELETE(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { const b = await body(req); return json({ links: await removeVocabularyLink((await params).id, b.assetId, b.role) }); } catch (e) { return fail(e); }
}
