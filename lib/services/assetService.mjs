import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../db.mjs';

const UPLOAD_ROOT = () => path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'assets', 'library');
const SEED_ROOT = () => path.join(process.cwd(), 'assets', 'library');
const like = (s) => '%' + String(s).replace(/[\\%_]/g, '\\$&') + '%';

export const assetUrl = (a) => `/media/${encodeURIComponent(a.slug)}?v=${a.version}`;

export function mapAsset(r) {
  return {
    id: r.id, slug: r.slug, name: r.name, type: r.type, variant: r.variant, format: r.format,
    sizeBytes: r.size_bytes, width: r.width, height: r.height, durationMs: r.duration_ms, frames: r.frames,
    inlineRig: r.inline_rig, sha256: r.sha256, tags: r.tags, status: r.status, source: r.source,
    version: r.version, createdAt: r.created_at, filePath: r.file_path,
    category: r.category_slug ? { slug: r.category_slug, name: r.category_name, group: r.category_group } : undefined,
    url: assetUrl(r),
  };
}

const BASE = `SELECT a.*, c.slug AS category_slug, c.name AS category_name, c.grp AS category_group
              FROM asset a JOIN asset_category c ON c.id = a.category_id`;

export async function listAssets({ q, group, category, type, status = 'ACTIVE', vocabularyId, limit = 100, offset = 0 } = {}) {
  const w = [], p = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replaceAll('?', '$' + p.length)); };
  if (status !== 'all') add('a.status = ?', status);
  if (group) add('c.grp = ?', group);
  if (category) add('c.slug = ?', category);
  if (type) add('a.type = ?', type);
  if (vocabularyId) add('EXISTS (SELECT 1 FROM vocabulary_asset va WHERE va.asset_id = a.id AND va.vocabulary_id = ?)', vocabularyId);
  if (q) add("(a.name ILIKE ? OR a.slug ILIKE ? OR EXISTS (SELECT 1 FROM unnest(a.tags) t WHERE t ILIKE ?))", like(q));
  p.push(Math.min(+limit || 100, 500), +offset || 0);
  const rows = await query(`${BASE} ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY a.name LIMIT $${p.length - 1} OFFSET $${p.length}`, p);
  return rows.map(mapAsset);
}

export async function getAsset(idOrSlug) {
  const rows = await query(`${BASE} WHERE a.slug = $1 OR a.id = $1`, [idOrSlug]);
  return rows[0] ? mapAsset(rows[0]) : null;
}

/** Menambah asset bila slug belum ada. Tidak pernah menimpa data yang sudah diubah admin. */
export async function ensureAsset(db, e, fileInfo) {
  const cat = (await db.query('SELECT id FROM asset_category WHERE slug = $1', [e.category])).rows[0];
  if (!cat) throw new Error('kategori asset tidak ada: ' + e.category);
  const r = await db.query(
    `INSERT INTO asset (slug, name, category_id, type, variant, file_path, format, size_bytes, width, height, inline_rig, sha256, tags, status, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'ACTIVE',$14) ON CONFLICT (slug) DO NOTHING RETURNING id`,
    [e.slug, e.name, cat.id, e.type, e.variant || null, e.file, e.format, fileInfo.size, e.width ?? null, e.height ?? null, !!e.inlineRig, fileInfo.sha256, e.tags || [], e.source || 'UPLOAD']);
  if (r.rows[0]) return { id: r.rows[0].id, created: true };
  return { id: (await db.query('SELECT id FROM asset WHERE slug = $1', [e.slug])).rows[0].id, created: false };
}

/** Lokasi file di disk: Volume (unggahan admin) dulu, lalu folder seed di repo. */
export async function resolveFile(asset) {
  for (const root of [UPLOAD_ROOT(), SEED_ROOT()]) {
    const abs = path.resolve(root, asset.filePath);
    if (!abs.startsWith(path.resolve(root) + path.sep)) continue; // cegah path traversal
    try { await fs.access(abs); return abs; } catch { /* coba lokasi berikutnya */ }
  }
  return null;
}

export async function findDuplicates() {
  return query(`SELECT sha256, array_agg(slug ORDER BY slug) AS slugs FROM asset GROUP BY sha256 HAVING count(*) > 1`);
}
export async function unusedAssets() {
  return (await query(`${BASE} WHERE NOT EXISTS (SELECT 1 FROM game_asset_usage u WHERE u.asset_id = a.id)
                       AND NOT EXISTS (SELECT 1 FROM vocabulary_asset v WHERE v.asset_id = a.id) ORDER BY a.name`)).map(mapAsset);
}
