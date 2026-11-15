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
