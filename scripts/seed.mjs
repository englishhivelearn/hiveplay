// Menyinkronkan database dengan assets/library/manifest.json.
// manifest.json adalah SATU-SATUNYA sumber konten: kata, gambar, audio, kategori, set, dan pemakaian game.
// Aman dijalankan berulang kali (idempotent):
//   - yang ada di manifest ditambahkan atau diperbarui,
//   - kata dan asset yang sudah tidak ada di manifest diarsipkan (tidak tampil ke guru),
//   - set yang sudah tidak ada di manifest dihapus.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { pathToFileURL } from 'node:url';
import { tx, closePool } from '../lib/db.mjs';
import { validateSvg } from '../lib/svg.mjs';
import { ensureAsset } from '../lib/services/assetService.mjs';
import { ensureVocabulary, linkAsset } from '../lib/services/vocabularyService.mjs';
import { ensureSet, addToSet } from '../lib/services/vocabularySetService.mjs';
import { registerUsage } from '../lib/services/gameAssetService.mjs';

export async function seed(log = console.log) {
  const root = path.join(process.cwd(), 'assets', 'library');
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const stats = { assets: 0, skipped: [], vocabulary: 0, sets: 0, usage: 0, archivedWords: 0, archivedAssets: 0, removedSets: 0 };
  await tx(async (db) => {
    for (const c of m.categories) await db.query('INSERT INTO asset_category (name, slug, grp) VALUES ($1,$2,$3) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, grp = EXCLUDED.grp', [c.name, c.slug, c.group]);
    for (const c of m.vocabularyCategories.filter(c => !c.parent)) await db.query('INSERT INTO vocabulary_category (name, slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = NULL', [c.name, c.slug]);
    for (const c of m.vocabularyCategories.filter(c => c.parent)) await db.query('INSERT INTO vocabulary_category (name, slug, parent_id) VALUES ($1,$2,(SELECT id FROM vocabulary_category WHERE slug=$3)) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id', [c.name, c.slug, c.parent]);

    const assetId = {};
    for (const a of m.assets) {
      const file = path.join(root, a.file);
      if (!fs.existsSync(file)) { stats.skipped.push(a.slug + ': file tidak ditemukan (' + a.file + ')'); continue; }
      const buf = fs.readFileSync(file);
      if (a.format === 'svg') { const v = validateSvg(buf.toString('utf8')); if (!v.ok) { stats.skipped.push(a.slug + ': ' + v.reasons.join('; ')); continue; } }
      const r = await ensureAsset(db, a, { size: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
      assetId[a.slug] = r.id; if (r.created) stats.assets++;
    }

    const vocabId = {};
    for (const v of m.vocabulary) {
      const r = await ensureVocabulary(db, v); vocabId[v.slug] = r.id; if (r.created) stats.vocabulary++;
      await db.query('DELETE FROM vocabulary_asset WHERE vocabulary_id = $1', [r.id]); // tautan disamakan dengan manifest
      for (const l of v.assets || []) {
        if (!assetId[l.asset]) { stats.skipped.push(`${v.slug}: asset "${l.asset}" tidak tersedia`); continue; }
        await linkAsset(db, r.id, assetId[l.asset], l.role, !!l.primary);
      }
    }

    const setNames = [];
    for (const s of m.sets) {
      const r = await ensureSet(db, s); setNames.push(s.name); if (r.created) stats.sets++;
      await db.query('DELETE FROM vocabulary_set_item WHERE set_id = $1', [r.id]); // isi set disamakan dengan manifest
      for (const [i, w] of s.words.entries()) {
        if (!vocabId[w]) throw new Error(`Set "${s.name}": kata "${w}" tidak ada di daftar vocabulary pada manifest.json`);
        await addToSet(db, r.id, vocabId[w], i);
      }
    }

    await db.query('DELETE FROM game_asset_usage'); // dibuat ulang dari manifest
    for (const u of m.usage || []) if (assetId[u.asset]) { await registerUsage(db, u.game, assetId[u.asset], u.role); stats.usage++; }

    // Yang sudah dihapus dari manifest ikut hilang dari guru.
    stats.archivedWords = (await db.query("UPDATE vocabulary SET status = 'ARCHIVED', updated_at = now() WHERE status <> 'ARCHIVED' AND slug <> ALL($1::text[])", [Object.keys(vocabId)])).rowCount;
    stats.archivedAssets = (await db.query("UPDATE asset SET status = 'ARCHIVED', updated_at = now() WHERE status <> 'ARCHIVED' AND slug <> ALL($1::text[])", [Object.keys(assetId)])).rowCount;
    stats.removedSets = (await db.query('DELETE FROM vocabulary_set WHERE name <> ALL($1::text[])', [setNames])).rowCount;
  });
  log(`seed: +${stats.assets} asset, +${stats.vocabulary} kosakata, +${stats.sets} set | diarsipkan: ${stats.archivedWords} kata, ${stats.archivedAssets} asset | set dihapus: ${stats.removedSets}`
    + (stats.skipped.length ? ` | DILEWATI: ${stats.skipped.join(' | ')}` : ''));
  return stats;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  seed().then(() => closePool()).catch(e => { console.error('Seed gagal:', e.message); process.exit(1); });
}
