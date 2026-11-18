import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { query } from '../db.mjs';
import { UserError } from '../errors.mjs';
import { sniff, slugify, folderFor, PREFIX } from '../media.mjs';
import { saveFile, removeFile, uploadRoot } from '../files.mjs';

const SEED_ROOT = () => path.join(process.cwd(), 'assets', 'library');
const like = (s) => '%' + String(s).replace(/[\\%_]/g, '\\$&') + '%';
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const GROUPS = ['VOCABULARY', 'CHARACTER', 'ENVIRONMENT', 'OBJECT', 'AUDIO', 'ANIMATION', 'UI'];
const normTags = (t) => [...new Set((Array.isArray(t) ? t : String(t || '').split(',')).map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 20);

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

/** Menambah asset bila slug belum ada (dipakai seed). Tidak pernah menimpa data yang sudah diubah admin. */
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

/** Lokasi file di disk: Volume (unggahan/penggantian admin) dulu, lalu folder seed di repo. */
export async function resolveFile(asset) {
  for (const root of [uploadRoot(), SEED_ROOT()]) {
    const abs = path.resolve(root, asset.filePath);
    if (!abs.startsWith(path.resolve(root) + path.sep)) continue;
    try { await fs.access(abs); return abs; } catch { /* lokasi berikutnya */ }
  }
  return null;
}

export const findDuplicates = () => query(`SELECT sha256, array_agg(slug ORDER BY slug) AS slugs FROM asset GROUP BY sha256 HAVING count(*) > 1`);
export async function unusedAssets() {
  return (await query(`${BASE} WHERE NOT EXISTS (SELECT 1 FROM game_asset_usage u WHERE u.asset_id = a.id)
                       AND NOT EXISTS (SELECT 1 FROM vocabulary_asset v WHERE v.asset_id = a.id) ORDER BY a.name`)).map(mapAsset);
}

/* ---------------- Kelola (hanya dipanggil dari endpoint admin) ---------------- */
export async function assetDetails(idOrSlug) {
  const a = await getAsset(idOrSlug);
  if (!a) return null;
  const [usage, vocabulary, duplicates] = await Promise.all([
    query('SELECT game_key AS game, role FROM game_asset_usage WHERE asset_id = $1 ORDER BY 1, 2', [a.id]),
    query(`SELECT v.id, v.word, v.slug, va.role, va.is_primary AS "isPrimary" FROM vocabulary_asset va JOIN vocabulary v ON v.id = va.vocabulary_id WHERE va.asset_id = $1 ORDER BY v.word`, [a.id]),
    query('SELECT slug, name FROM asset WHERE sha256 = $1 AND id <> $2 ORDER BY name', [a.sha256, a.id]),
  ]);
  return { ...a, usage, vocabulary, duplicates };
}

async function categoryBySlug(slug) {
  const c = (await query('SELECT id, slug, grp FROM asset_category WHERE slug = $1', [slug]))[0];
  if (!c) throw new UserError('Kategori tidak ditemukan.');
  return c;
}
const checkKind = (type, grp) => {
  if ((type === 'AUDIO') !== (grp === 'AUDIO')) throw new UserError(type === 'AUDIO' ? 'File audio harus masuk kategori audio.' : 'Kategori audio hanya untuk file audio.');
};

export async function createAssetFromUpload({ buffer, filename, name, category, variant, tags, inlineRig, frames, allowDuplicate }) {
  name = String(name || '').trim();
  if (!name) throw new UserError('Nama asset wajib diisi.');
  if (name.length > 80) throw new UserError('Nama asset maksimal 80 karakter.');
  const nameSlug = slugify(name);
  if (!nameSlug) throw new UserError('Nama harus mengandung huruf atau angka.');
  const info = sniff(buffer, filename);
  if (info.error) throw new UserError(info.error);
  const cat = await categoryBySlug(category);
  checkKind(info.type, cat.grp);
  const hash = sha(buffer);
  if (!allowDuplicate) {
    const dup = await query('SELECT slug FROM asset WHERE sha256 = $1', [hash]);
    if (dup.length) throw new UserError('File yang sama persis sudah ada di perpustakaan.', 409, { duplicates: dup.map((d) => d.slug) });
  }
  const v = variant ? slugify(variant) : null;
  const baseSlug = `${cat.slug}.${nameSlug}${v ? '.' + v : ''}`;
  let slug = baseSlug, n = 1;
  while ((await query('SELECT 1 FROM asset WHERE slug = $1', [slug])).length) slug = `${baseSlug}-${++n}`;
  const baseFile = `${folderFor(cat.grp, cat.slug)}/${nameSlug}${v ? '_' + v : ''}`;
  let file = `${baseFile}.${info.format}`; n = 1;
  while ((await query('SELECT 1 FROM asset WHERE file_path = $1', [file])).length) file = `${baseFile}-${++n}.${info.format}`;
  const type = info.type === 'IMAGE' && cat.grp === 'ANIMATION' ? 'SPRITESHEET' : info.type;
  await saveFile(file, buffer);
  try {
    const r = await query(
      `INSERT INTO asset (slug, name, category_id, type, variant, file_path, format, size_bytes, width, height, duration_ms, frames, inline_rig, sha256, tags, status, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'ACTIVE','UPLOAD') RETURNING id`,
      [slug, name, cat.id, type, v, file, info.format, buffer.length, info.width ?? null, info.height ?? null, info.durationMs ?? null,
       frames ? Math.max(1, parseInt(frames, 10) || 1) : null, !!inlineRig && info.format === 'svg', hash, normTags(tags)]);
    return getAsset(r[0].id);
  } catch (e) { await removeFile(file); throw e; }
}

export async function updateAsset(idOrSlug, patch) {
  const a = await getAsset(idOrSlug);
  if (!a) throw new UserError('Asset tidak ditemukan.', 404);
  const sets = [], p = [];
  const set = (col, val) => { p.push(val); sets.push(`${col} = $${p.length}`); };
  if (patch.name !== undefined) { const n = String(patch.name).trim(); if (!n || n.length > 80) throw new UserError('Nama asset wajib diisi (maksimal 80 karakter).'); set('name', n); }
  if (patch.category !== undefined) { const c = await categoryBySlug(patch.category); checkKind(a.type, c.grp); set('category_id', c.id); }
  if (patch.variant !== undefined) set('variant', patch.variant ? slugify(patch.variant) : null);
  if (patch.tags !== undefined) set('tags', normTags(patch.tags));
  if (patch.status !== undefined) { if (!['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(patch.status)) throw new UserError('Status tidak valid.'); set('status', patch.status); }
  if (patch.inlineRig !== undefined) set('inline_rig', !!patch.inlineRig && a.format === 'svg');
  if (patch.frames !== undefined) set('frames', patch.frames === null || patch.frames === '' ? null : Math.max(1, parseInt(patch.frames, 10) || 1));
  if (!sets.length) return a;
  p.push(a.id);
  await query(`UPDATE asset SET ${sets.join(', ')}, updated_at = now() WHERE id = $${p.length}`, p);
  return getAsset(a.id);
}

/** Mengganti file tanpa mengubah id/slug, sehingga semua kaitan ke kata dan game tetap utuh. */
export async function replaceAssetFile(idOrSlug, { buffer, filename }) {
  const a = await getAsset(idOrSlug);
  if (!a) throw new UserError('Asset tidak ditemukan.', 404);
  const info = sniff(buffer, filename);
  if (info.error) throw new UserError(info.error);
  if ((info.type === 'AUDIO') !== (a.type === 'AUDIO')) throw new UserError('Jenis file pengganti harus sama (gambar diganti gambar, audio diganti audio).');
  const oldPath = a.filePath;
  let file = oldPath;
  if (path.extname(oldPath).slice(1) !== info.format) file = oldPath.replace(/\.[^.]+$/, '') + '.' + info.format;
  await saveFile(file, buffer);
  await query(`UPDATE asset SET file_path=$1, format=$2, size_bytes=$3, width=$4, height=$5, duration_ms=$6, sha256=$7,
               inline_rig = CASE WHEN $2 = 'svg' THEN inline_rig ELSE false END, version = version + 1, updated_at = now() WHERE id = $8`,
    [file, info.format, buffer.length, info.width ?? null, info.height ?? null, info.durationMs ?? null, sha(buffer), a.id]);
  if (file !== oldPath) await removeFile(oldPath);
  return getAsset(a.id);
}

export async function deleteAsset(idOrSlug) {
  const a = await getAsset(idOrSlug);
  if (!a) throw new UserError('Asset tidak ditemukan.', 404);
  if (a.source === 'SEED') throw new UserError('Asset bawaan tidak bisa dihapus permanen (akan muncul lagi saat server dinyalakan). Arsipkan saja.', 409);
  const [vocabulary, games] = await Promise.all([
    query('SELECT v.word, va.role FROM vocabulary_asset va JOIN vocabulary v ON v.id = va.vocabulary_id WHERE va.asset_id = $1', [a.id]),
    query('SELECT game_key AS game, role FROM game_asset_usage WHERE asset_id = $1', [a.id]),
  ]);
  if (vocabulary.length || games.length) throw new UserError('Asset masih dipakai. Lepaskan dulu dari kata dan game, atau arsipkan saja.', 409, { vocabulary, games });
  await query('DELETE FROM asset WHERE id = $1', [a.id]);
  await removeFile(a.filePath);
  return { deleted: a.slug };
}

export async function listAssetCategories() {
  return query(`SELECT c.id, c.slug, c.name, c.grp AS "group", (SELECT count(*) FROM asset a WHERE a.category_id = c.id)::int AS assets FROM asset_category c ORDER BY c.grp, c.name`);
}
export async function createAssetCategory({ name, group }) {
  name = String(name || '').trim();
  if (!name || name.length > 60) throw new UserError('Nama kategori wajib diisi (maksimal 60 karakter).');
  if (!GROUPS.includes(group)) throw new UserError('Kelompok kategori tidak valid.');
  const s = slugify(name);
  if (!s) throw new UserError('Nama harus mengandung huruf atau angka.');
  const r = await query('INSERT INTO asset_category (name, slug, grp) VALUES ($1, $2, $3) RETURNING id, slug, name, grp AS "group"', [name, `${PREFIX[group]}-${s}`, group]);
  return r[0];
}
export async function updateAssetCategory(id, { name }) {
  name = String(name || '').trim();
  if (!name || name.length > 60) throw new UserError('Nama kategori wajib diisi (maksimal 60 karakter).');
  const r = await query('UPDATE asset_category SET name = $1 WHERE id = $2 RETURNING id, slug, name, grp AS "group"', [name, id]);
  if (!r[0]) throw new UserError('Kategori tidak ditemukan.', 404);
  return r[0];
}
