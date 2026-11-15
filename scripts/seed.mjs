// Memasukkan isi assets/library/manifest.json ke database. Aman dijalankan berulang kali:
// hanya MENAMBAH yang belum ada dan tidak pernah menimpa perubahan yang dibuat admin.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { pathToFileURL } from 'node:url';
import { pool, tx, closePool } from '../lib/db.mjs';
import { validateSvg } from '../lib/svg.mjs';
import { ensureAsset } from '../lib/services/assetService.mjs';
import { ensureVocabulary, linkAsset } from '../lib/services/vocabularyService.mjs';
import { ensureSet, addToSet } from '../lib/services/vocabularySetService.mjs';
import { registerUsage } from '../lib/services/gameAssetService.mjs';

export async function seed(log = console.log) {
  const root = path.join(process.cwd(), 'assets', 'library');
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const stats = { assets: 0, skipped: [], vocabulary: 0, sets: 0, usage: 0 };
  await tx(async (db) => {
    for (const c of m.categories) await db.query('INSERT INTO asset_category (name, slug, grp) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING', [c.name, c.slug, c.group]);
    for (const c of m.vocabularyCategories.filter(c => !c.parent)) await db.query('INSERT INTO vocabulary_category (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO NOTHING', [c.name, c.slug]);
    for (const c of m.vocabularyCategories.filter(c => c.parent)) await db.query('INSERT INTO vocabulary_category (name, slug, parent_id) VALUES ($1,$2,(SELECT id FROM vocabulary_category WHERE slug=$3)) ON CONFLICT (slug) DO NOTHING', [c.name, c.slug, c.parent]);
    const assetId = {};
    for (const a of m.assets) {
      const buf = fs.readFileSync(path.join(root, a.file));
      if (a.format === 'svg') { const v = validateSvg(buf.toString('utf8')); if (!v.ok) { stats.skipped.push(a.slug + ': ' + v.reasons.join('; ')); continue; } }
      const r = await ensureAsset(db, a, { size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
      assetId[a.slug] = r.id; if (r.created) stats.assets++;
    }
    const vocabId = {};
    for (const v of m.vocabulary) {
      const r = await ensureVocabulary(db, v); vocabId[v.slug] = r.id; if (r.created) stats.vocabulary++;
      for (const l of v.assets) if (assetId[l.asset]) await linkAsset(db, r.id, assetId[l.asset], l.role, !!l.primary);
    }
    for (const s of m.sets) {
      const r = await ensureSet(db, s); if (r.created) stats.sets++;
      for (const [i, w] of s.words.entries()) await addToSet(db, r.id, vocabId[w], i);
    }
    for (const u of m.usage) if (assetId[u.asset]) { await registerUsage(db, u.game, assetId[u.asset], u.role); stats.usage++; }
  });
  log(`seed: +${stats.assets} asset, +${stats.vocabulary} kosakata, +${stats.sets} set` + (stats.skipped.length ? ` | DITOLAK: ${stats.skipped.join(' | ')}` : ''));
  return stats;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  seed().then(() => closePool()).catch(e => { console.error('Seed gagal:', e.message); process.exit(1); });
}
