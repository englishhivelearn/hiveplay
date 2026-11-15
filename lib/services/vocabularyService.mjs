import { query } from '../db.mjs';
import { assetUrl } from './assetService.mjs';

const like = (s) => '%' + String(s).replace(/[\\%_]/g, '\\$&') + '%';

export async function listCategories() {
  return (await query(`SELECT c.slug, c.name, p.slug AS parent, (SELECT count(*) FROM vocabulary v WHERE v.category_id = c.id AND v.status = 'ACTIVE')::int AS words
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
