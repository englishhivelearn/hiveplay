import { query } from '../db.mjs';
import { assetUrl } from './assetService.mjs';

const like = (s) => '%' + String(s).replace(/[\\%_]/g, '\\$&') + '%';

export async function listCategories() {
  return (await query(`SELECT c.id, c.slug, c.name, p.slug AS parent, (SELECT count(*) FROM vocabulary v WHERE v.category_id = c.id AND v.status = 'ACTIVE')::int AS words
                       FROM vocabulary_category c LEFT JOIN vocabulary_category p ON p.id = c.parent_id ORDER BY c.name`));
}

function mapWord(r) {
  return {
    id: r.id, slug: r.slug, word: r.word, plural: r.plural, soundText: r.sound_text,
    partOfSpeech: r.part_of_speech, definition: r.definition, example: r.example, translation: r.translation,
    difficulty: r.difficulty, tags: r.tags, syllables: r.syllables, wordLength: r.word_length, firstLetter: r.first_letter,
    status: r.status, category: { slug: r.cat_slug, name: r.cat_name, parent: r.parent_slug || null }, assets: {},
  };
}

/** Menempelkan asset ke tiap kata: assets[role] = asset utama untuk peran itu (whole, sliced, character, pronunciation...). */
export async function attachAssets(words) {
  if (!words.length) return words;
  const rows = await query(
    `SELECT va.vocabulary_id, va.role, va.is_primary, a.slug, a.version, a.format, a.inline_rig, a.width, a.height, a.type
     FROM vocabulary_asset va JOIN asset a ON a.id = va.asset_id
     WHERE va.vocabulary_id = ANY($1) AND a.status = 'ACTIVE' ORDER BY va.is_primary DESC, va.sort_order, a.slug`, [words.map(w => w.id)]);
  const byId = new Map(words.map(w => [w.id, w]));
  for (const r of rows) {
    const w = byId.get(r.vocabulary_id);
    if (!w.assets[r.role]) w.assets[r.role] = { slug: r.slug, url: assetUrl(r), format: r.format, type: r.type, inlineRig: r.inline_rig, width: r.width, height: r.height };
  }
  return words;
}

const SELECT = `SELECT v.*, c.slug AS cat_slug, c.name AS cat_name, pc.slug AS parent_slug
                FROM vocabulary v JOIN vocabulary_category c ON c.id = v.category_id
                LEFT JOIN vocabulary_category pc ON pc.id = c.parent_id`;

export async function listVocabulary({ q, category, difficulty, tag, set, letter, status = 'ACTIVE', limit = 200 } = {}) {
  const w = [], p = [];
  const add = (sql, v) => { p.push(v); w.push(sql.replaceAll('?', '$' + p.length)); };
  if (status !== 'all') add('v.status = ?', status);
  if (category) add('(c.slug = ? OR pc.slug = ?)', category);
  if (difficulty) add('v.difficulty = ?', difficulty);
  if (tag) add('? = ANY(v.tags)', tag);
  if (letter) add('v.first_letter = ?', String(letter)[0].toUpperCase());
  if (q) add('(v.word ILIKE ? OR v.translation ILIKE ? OR v.definition ILIKE ?)', like(q));
  let join = '', order = 'ORDER BY v.word';
  if (set) { p.push(set); join = `JOIN vocabulary_set_item si ON si.vocabulary_id = v.id AND si.set_id = $${p.length}`; order = 'ORDER BY si.sort_order, v.word'; }
  p.push(Math.min(+limit || 200, 500));
  const rows = await query(`${SELECT} ${join} ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ${order} LIMIT $${p.length}`, p);
  return attachAssets(rows.map(mapWord));
}

export async function getVocabulary(idOrSlug) {
  const rows = await query(`${SELECT} WHERE v.slug = $1 OR v.id = $1`, [idOrSlug]);
  return rows[0] ? (await attachAssets([mapWord(rows[0])]))[0] : null;
}

/** Menambah kata bila belum ada (dipakai seed). Tidak menimpa perubahan admin. */
export async function ensureVocabulary(db, e) {
  const cat = (await db.query('SELECT id FROM vocabulary_category WHERE slug = $1', [e.category])).rows[0];
  if (!cat) throw new Error('kategori kosakata tidak ada: ' + e.category);
  const r = await db.query(
    `INSERT INTO vocabulary (word, slug, category_id, part_of_speech, definition, example, translation, plural, sound_text, difficulty, tags, syllables, word_length, first_letter)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (slug) DO NOTHING RETURNING id`,
    [e.word, e.slug, cat.id, e.partOfSpeech || null, e.definition || null, e.example || null, e.translation || null, e.plural || null, e.soundText || null,
     e.difficulty || 1, e.tags || [], e.syllables || null, e.word.length, e.word[0].toUpperCase()]);
  const id = r.rows[0]?.id || (await db.query('SELECT id FROM vocabulary WHERE slug = $1', [e.slug])).rows[0].id;
  return { id, created: !!r.rows[0] };
}
export async function linkAsset(db, vocabularyId, assetId, role, isPrimary = false, sortOrder = 0) {
  await db.query(`INSERT INTO vocabulary_asset (vocabulary_id, asset_id, role, is_primary, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [vocabularyId, assetId, role, isPrimary, sortOrder]);
}

/* ---------------- Kelola (hanya dipanggil dari endpoint admin) ---------------- */
import { UserError } from '../errors.mjs';
import { slugify } from '../media.mjs';
const normTags = (t) => [...new Set((Array.isArray(t) ? t : String(t || '').split(',')).map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
const intOrNull = (v, min, max) => { if (v === '' || v === null || v === undefined) return null; const n = parseInt(v, 10); if (!Number.isFinite(n) || n < min || n > max) throw new UserError(`Angka harus antara ${min} dan ${max}.`); return n; };
const txt = (v, max) => { if (v === undefined || v === null) return null; const s = String(v).trim(); if (s.length > max) throw new UserError(`Teks terlalu panjang (maksimal ${max} karakter).`); return s || null; };

async function vocabCategory(slug) {
  const c = (await query('SELECT id FROM vocabulary_category WHERE slug = $1', [slug]))[0];
  if (!c) throw new UserError('Kategori kosakata tidak ditemukan.');
  return c;
}
export async function createVocabulary(e) {
  const word = String(e.word || '').trim();
  if (!word || word.length > 60) throw new UserError('Kata wajib diisi (maksimal 60 karakter).');
  const base = slugify(word);
  if (!base) throw new UserError('Kata harus mengandung huruf atau angka.');
  const cat = await vocabCategory(e.category);
  let slug = base, n = 1;
  while ((await query('SELECT 1 FROM vocabulary WHERE slug = $1', [slug])).length) slug = `${base}-${++n}`;
  const diff = intOrNull(e.difficulty ?? 1, 1, 5) ?? 1;
  const r = await query(
    `INSERT INTO vocabulary (word, slug, category_id, part_of_speech, definition, example, translation, plural, sound_text, difficulty, tags, syllables, word_length, first_letter, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
    [word, slug, cat.id, txt(e.partOfSpeech, 30), txt(e.definition, 400), txt(e.example, 300), txt(e.translation, 100), txt(e.plural, 60), txt(e.soundText, 60), diff,
     normTags(e.tags), intOrNull(e.syllables, 1, 12), word.length, word[0].toUpperCase(), ['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(e.status) ? e.status : 'ACTIVE']);
  return getVocabulary(r[0].id);
}
export async function updateVocabulary(id, p) {
  const cur = await getVocabulary(id);
  if (!cur) throw new UserError('Kata tidak ditemukan.', 404);
  const sets = [], vals = [];
  const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (p.word !== undefined) { const w = String(p.word).trim(); if (!w || w.length > 60) throw new UserError('Kata wajib diisi (maksimal 60 karakter).'); set('word', w); set('word_length', w.length); set('first_letter', w[0].toUpperCase()); }
  if (p.category !== undefined) set('category_id', (await vocabCategory(p.category)).id);
  if (p.partOfSpeech !== undefined) set('part_of_speech', txt(p.partOfSpeech, 30));
  if (p.definition !== undefined) set('definition', txt(p.definition, 400));
  if (p.example !== undefined) set('example', txt(p.example, 300));
  if (p.translation !== undefined) set('translation', txt(p.translation, 100));
  if (p.plural !== undefined) set('plural', txt(p.plural, 60));
  if (p.soundText !== undefined) set('sound_text', txt(p.soundText, 60));
  if (p.difficulty !== undefined) set('difficulty', intOrNull(p.difficulty, 1, 5) ?? 1);
  if (p.tags !== undefined) set('tags', normTags(p.tags));
  if (p.syllables !== undefined) set('syllables', intOrNull(p.syllables, 1, 12));
  if (p.status !== undefined) { if (!['ACTIVE', 'ARCHIVED', 'DRAFT'].includes(p.status)) throw new UserError('Status tidak valid.'); set('status', p.status); }
  if (!sets.length) return cur;
  vals.push(cur.id);
  await query(`UPDATE vocabulary SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length}`, vals);
  return getVocabulary(cur.id);
}
export async function deleteVocabulary(id) {
  const v = await getVocabulary(id);
  if (!v) throw new UserError('Kata tidak ditemukan.', 404);
  const sets = await query('SELECT s.name FROM vocabulary_set_item i JOIN vocabulary_set s ON s.id = i.set_id WHERE i.vocabulary_id = $1', [v.id]);
  if (sets.length) throw new UserError('Kata ini ada di set kosakata. Keluarkan dulu dari set, atau arsipkan saja.', 409, { sets: sets.map((s) => s.name) });
  await query('DELETE FROM vocabulary WHERE id = $1', [v.id]);
  return { deleted: v.slug };
}
export async function vocabularyLinks(vocabularyId) {
  return query(`SELECT a.id AS "assetId", a.slug, a.name, a.type, a.format, a.status, a.version, va.role, va.is_primary AS "isPrimary"
                FROM vocabulary_asset va JOIN asset a ON a.id = va.asset_id WHERE va.vocabulary_id = $1 ORDER BY va.role, va.is_primary DESC, a.name`, [vocabularyId]);
}
export async function setVocabularyLink(vocabularyId, assetId, role, isPrimary) {
  role = slugify(role);
  if (!role || role.length > 30) throw new UserError('Peran gambar/audio wajib diisi, misalnya whole, sliced, character, atau pronunciation.');
  const a = (await query('SELECT id, type FROM asset WHERE id = $1 OR slug = $1', [assetId]))[0];
  if (!a) throw new UserError('Asset tidak ditemukan.', 404);
  if (!(await query('SELECT 1 FROM vocabulary WHERE id = $1', [vocabularyId])).length) throw new UserError('Kata tidak ditemukan.', 404);
  if (role === 'pronunciation' && a.type !== 'AUDIO') throw new UserError('Peran "pronunciation" harus memakai file audio.');
  if (role !== 'pronunciation' && a.type === 'AUDIO') throw new UserError('File audio hanya bisa dipakai untuk peran "pronunciation".');
  if (isPrimary) await query('UPDATE vocabulary_asset SET is_primary = false WHERE vocabulary_id = $1 AND role = $2', [vocabularyId, role]);
  const first = !(await query('SELECT 1 FROM vocabulary_asset WHERE vocabulary_id = $1 AND role = $2', [vocabularyId, role])).length;
  await query(`INSERT INTO vocabulary_asset (vocabulary_id, asset_id, role, is_primary) VALUES ($1,$2,$3,$4)
               ON CONFLICT (vocabulary_id, asset_id, role) DO UPDATE SET is_primary = EXCLUDED.is_primary`, [vocabularyId, a.id, role, !!isPrimary || first]);
  return vocabularyLinks(vocabularyId);
}
export async function removeVocabularyLink(vocabularyId, assetId, role) {
  const a = (await query('SELECT id FROM asset WHERE id = $1 OR slug = $1', [assetId]))[0];
  if (a) await query('DELETE FROM vocabulary_asset WHERE vocabulary_id = $1 AND asset_id = $2 AND role = $3', [vocabularyId, a.id, role]);
  return vocabularyLinks(vocabularyId);
}
export async function createVocabCategory({ name, parent }) {
  name = String(name || '').trim();
  if (!name || name.length > 60) throw new UserError('Nama kategori wajib diisi (maksimal 60 karakter).');
  const s = slugify(name);
  if (!s) throw new UserError('Nama harus mengandung huruf atau angka.');
  let parentId = null;
  if (parent) { const p = (await query('SELECT id, parent_id FROM vocabulary_category WHERE slug = $1', [parent]))[0]; if (!p) throw new UserError('Kategori induk tidak ditemukan.'); if (p.parent_id) throw new UserError('Subkategori tidak bisa punya subkategori lagi.'); parentId = p.id; }
  return (await query('INSERT INTO vocabulary_category (name, slug, parent_id) VALUES ($1,$2,$3) RETURNING id, slug, name', [name, s, parentId]))[0];
}
export async function updateVocabCategory(id, { name }) {
  name = String(name || '').trim();
  if (!name || name.length > 60) throw new UserError('Nama kategori wajib diisi (maksimal 60 karakter).');
  const r = await query('UPDATE vocabulary_category SET name = $1 WHERE id = $2 RETURNING id, slug, name', [name, id]);
  if (!r[0]) throw new UserError('Kategori tidak ditemukan.', 404);
  return r[0];
}
