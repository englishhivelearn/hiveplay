import { query } from '../db.mjs';
import { listVocabulary } from './vocabularyService.mjs';

export async function listSets({ level, published = true } = {}) {
  const w = [], p = [];
  if (published) w.push('s.published = true');
  if (level) { p.push(level); w.push('s.level = $' + p.length); }
  return query(`SELECT s.id, s.name, s.description, s.level, s.published,
                (SELECT count(*) FROM vocabulary_set_item i WHERE i.set_id = s.id)::int AS "wordCount"
                FROM vocabulary_set s ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY s.level NULLS LAST, s.name`, p);
}
export async function getSet(id) {
  const s = (await query('SELECT id, name, description, level, published FROM vocabulary_set WHERE id = $1', [id]))[0];
  if (!s) return null;
  return { ...s, words: await listVocabulary({ set: id, limit: 500 }) };
}
export async function ensureSet(db, e) {
  const r = await db.query(`INSERT INTO vocabulary_set (name, description, level, published) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING RETURNING id`,
    [e.name, e.description || null, e.level || null, !!e.published]);
  return { id: r.rows[0]?.id || (await db.query('SELECT id FROM vocabulary_set WHERE name = $1', [e.name])).rows[0].id, created: !!r.rows[0] };
}
export async function addToSet(db, setId, vocabularyId, sortOrder = 0) {
  await db.query('INSERT INTO vocabulary_set_item (set_id, vocabulary_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [setId, vocabularyId, sortOrder]);
}

/* ---------------- Kelola (hanya dipanggil dari endpoint admin) ---------------- */
import { tx } from '../db.mjs';
import { UserError } from '../errors.mjs';
const LEVELS = ['Todler', 'TK', 'SD', 'SMP', 'SMA'];

export async function listSetsAdmin() {
  return query(`SELECT s.id, s.name, s.description, s.level, s.published,
      coalesce(json_agg(json_build_object('id', v.id, 'word', v.word, 'slug', v.slug, 'status', v.status) ORDER BY i.sort_order) FILTER (WHERE v.id IS NOT NULL), '[]') AS words
    FROM vocabulary_set s LEFT JOIN vocabulary_set_item i ON i.set_id = s.id LEFT JOIN vocabulary v ON v.id = i.vocabulary_id
    GROUP BY s.id ORDER BY s.level NULLS LAST, s.name`);
}
function clean({ name, description, level, published }, partial) {
  const o = {};
  if (!partial || name !== undefined) { const n = String(name || '').trim(); if (!n || n.length > 80) throw new UserError('Nama set wajib diisi (maksimal 80 karakter).'); o.name = n; }
  if (description !== undefined) { const d = String(description || '').trim(); if (d.length > 300) throw new UserError('Deskripsi maksimal 300 karakter.'); o.description = d || null; }
  if (level !== undefined) { if (level && !LEVELS.includes(level)) throw new UserError('Jenjang tidak valid.'); o.level = level || null; }
  if (published !== undefined) o.published = !!published;
  return o;
}
async function writeItems(db, setId, words) {
  const ids = [...new Set(words)];
  if (ids.length > 200) throw new UserError('Satu set maksimal 200 kata.');
  if (ids.length) {
    const found = (await db.query('SELECT id FROM vocabulary WHERE id = ANY($1)', [ids])).rows.length;
    if (found !== ids.length) throw new UserError('Ada kata yang tidak ditemukan.');
  }
  await db.query('DELETE FROM vocabulary_set_item WHERE set_id = $1', [setId]);
  for (const [i, id] of ids.entries()) await db.query('INSERT INTO vocabulary_set_item (set_id, vocabulary_id, sort_order) VALUES ($1,$2,$3)', [setId, id, i]);
}
export async function createSet(data) {
  const o = clean(data, false);
  return tx(async (db) => {
    const r = await db.query('INSERT INTO vocabulary_set (name, description, level, published) VALUES ($1,$2,$3,$4) RETURNING id', [o.name, o.description ?? null, o.level ?? null, !!o.published]);
    if (Array.isArray(data.words)) await writeItems(db, r.rows[0].id, data.words);
    return r.rows[0].id;
  }).then((id) => getSet(id));
}
export async function updateSet(id, data) {
  const o = clean(data, true);
  await tx(async (db) => {
    if (!(await db.query('SELECT 1 FROM vocabulary_set WHERE id = $1', [id])).rows.length) throw new UserError('Set tidak ditemukan.', 404);
    const sets = [], p = [];
    for (const [k, v] of Object.entries(o)) { p.push(v); sets.push(`${k} = $${p.length}`); }
    if (sets.length) { p.push(id); await db.query(`UPDATE vocabulary_set SET ${sets.join(', ')} WHERE id = $${p.length}`, p); }
    if (Array.isArray(data.words)) await writeItems(db, id, data.words);
  });
  return getSetAdmin(id);
}
export async function deleteSet(id) {
  const r = await query('DELETE FROM vocabulary_set WHERE id = $1 RETURNING name', [id]);
  if (!r[0]) throw new UserError('Set tidak ditemukan.', 404);
  return { deleted: r[0].name };
}
export async function getSetAdmin(id) {
  const s = (await query('SELECT id, name, description, level, published FROM vocabulary_set WHERE id = $1', [id]))[0];
  return s ? { ...s, words: await listVocabulary({ set: id, status: 'all', limit: 500 }) } : null;
}
