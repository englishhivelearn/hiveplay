import { query } from '../db.mjs';
import { GAME_REQUIREMENTS } from '../gameRegistry.mjs';

export async function registerUsage(db, gameKey, assetId, role) {
  await db.query('INSERT INTO game_asset_usage (game_key, asset_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [gameKey, assetId, role]);
}
export const usageForAsset = (slug) => query(`SELECT u.game_key AS "game", u.role FROM game_asset_usage u JOIN asset a ON a.id = u.asset_id WHERE a.slug = $1 ORDER BY 1, 2`, [slug]);
export const usageForGame = (gameKey) => query(`SELECT a.slug, a.name, u.role FROM game_asset_usage u JOIN asset a ON a.id = u.asset_id WHERE u.game_key = $1 ORDER BY a.slug`, [gameKey]);

/**
 * Validasi kompatibilitas: apakah kosakata yang dipilih punya asset yang dibutuhkan game?
 * level "warning" = akan memakai gambar pengganti; level "info" = akan memakai suara bawaan browser.
 */
export function checkCompatibility(gameKey, words) {
  const req = GAME_REQUIREMENTS[gameKey];
  if (!req) return { ok: true, known: false, warnings: [], infos: [] };
  const warnings = [], infos = [];
  for (const w of words) {
    if (req.image && !req.image.variants.some(v => w.assets && w.assets[v])) {
      warnings.push({ word: w.word, slug: w.slug, missing: 'image', variants: req.image.variants });
    }
    if (req.audio && !(w.assets && w.assets.pronunciation)) {
      (req.audio.optional ? infos : warnings).push({ word: w.word, slug: w.slug, missing: 'audio' });
    }
  }
  return { ok: warnings.length === 0, known: true, warnings, infos };
}

/** Laporan untuk halaman admin: pemakaian per game, per asset, tak terpakai, duplikat, kata tanpa gambar. */
export async function usageReport() {
  const [games, assets, duplicates, unused, noImage] = await Promise.all([
    query(`SELECT u.game_key AS game, json_agg(json_build_object('slug', a.slug, 'name', a.name, 'role', u.role) ORDER BY a.slug) AS assets
           FROM game_asset_usage u JOIN asset a ON a.id = u.asset_id GROUP BY u.game_key ORDER BY u.game_key`),
    query(`SELECT a.slug, a.name, a.status, coalesce(array_agg(DISTINCT u.game_key) FILTER (WHERE u.game_key IS NOT NULL), '{}') AS games,
           (SELECT count(*) FROM vocabulary_asset va WHERE va.asset_id = a.id)::int AS words
           FROM asset a LEFT JOIN game_asset_usage u ON u.asset_id = a.id GROUP BY a.id ORDER BY a.name`),
    query(`SELECT sha256, array_agg(slug ORDER BY slug) AS slugs FROM asset GROUP BY sha256 HAVING count(*) > 1`),
    query(`SELECT a.slug, a.name FROM asset a WHERE NOT EXISTS (SELECT 1 FROM game_asset_usage u WHERE u.asset_id = a.id)
           AND NOT EXISTS (SELECT 1 FROM vocabulary_asset v WHERE v.asset_id = a.id) ORDER BY a.name`),
    query(`SELECT v.word, v.slug FROM vocabulary v WHERE v.status = 'ACTIVE' AND NOT EXISTS
           (SELECT 1 FROM vocabulary_asset va JOIN asset a ON a.id = va.asset_id WHERE va.vocabulary_id = v.id AND a.type = 'IMAGE' AND a.status = 'ACTIVE') ORDER BY v.word`),
  ]);
  return { games, assets, duplicates, unused, wordsWithoutImage: noImage };
}
