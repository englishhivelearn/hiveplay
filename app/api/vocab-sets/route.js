import { isStaff } from '@/lib/auth';
import { json, fail } from '@/lib/apiHelpers.mjs';
import { listSets, getSet } from '@/lib/services/vocabularySetService.mjs';
import { checkCompatibility } from '@/lib/services/gameAssetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Daftar set kosakata yang dipublikasikan. Dengan ?game= tiap set diberi tanda kompatibel atau tidak.
export async function GET(req) {
  if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url).searchParams, game = u.get('game'), category = u.get('category');
  try {
    const out = [];
    for (const s of await listSets({ level: u.get('level') || undefined })) {
      const full = await getSet(s.id), words = full.words;
      if (category && !words.some(w => w.category.slug === category || w.category.parent === category)) continue;
      const check = game ? checkCompatibility(game, words) : null;
      out.push({ ...s, wordCount: words.length, compatible: check ? check.ok : true, warnings: check ? check.warnings.length : 0 });
    }
    return json({ sets: out });
  } catch (e) { return fail(e); }
}
