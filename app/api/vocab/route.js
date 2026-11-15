import { isStaff } from '@/lib/auth';
import { json, fail } from '@/lib/apiHelpers.mjs';
import { listVocabulary } from '@/lib/services/vocabularyService.mjs';
import { checkCompatibility } from '@/lib/services/gameAssetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hanya membaca. Tidak ada endpoint tulis untuk guru.
export async function GET(req) {
  if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url).searchParams;
  try {
    const words = await listVocabulary({
      q: u.get('q') || undefined, category: u.get('category') || undefined,
      difficulty: u.get('difficulty') ? +u.get('difficulty') : undefined,
      tag: u.get('tag') || undefined, set: u.get('set') || undefined, letter: u.get('letter') || undefined,
      limit: Math.min(+u.get('limit') || 200, 500),
    });
    const game = u.get('game');
    return json({ words, count: words.length, check: game ? checkCompatibility(game, words) : null });
  } catch (e) { return fail(e); }
}
