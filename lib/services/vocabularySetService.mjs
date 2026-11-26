import { query } from '../db.mjs';
import { listVocabulary } from './vocabularyService.mjs';

export async function listSets({ level, published = true } = {}) {
  const w = [], p = [];
  if (published) w.push('s.published = true');
  if (level) { p.push(level); w.push('s.level = $' + p.length); }
  return query(`SELECT s.id, s.name, s.description, s.level, s.published,
                (SELECT count(*) FROM vocabulary_set_item i WHERE i.set_id = s.id)::int AS "wordCount"
                FROM vocabulary_set s ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY CASE s.level WHEN 'Todler' THEN 1 WHEN 'TK' THEN 2 WHEN 'SD' THEN 3 WHEN 'SMP' THEN 4 WHEN 'SMA' THEN 5 ELSE 6 END, s.name`, p);
}
export async function getSet(id) {
  const s = (await query('SELECT id, name, description, level, published FROM vocabulary_set WHERE id = $1', [id]))[0];
  if (!s) return null;
  return { ...s, words: await listVocabulary({ set: id, limit: 500 }) };
}
export async function ensureSet(db, e) {
  const r = await db.query(`INSERT INTO vocabulary_set (name, description, level, published) VALUES ($1,$2,$3,$4)
    ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, level = EXCLUDED.level, published = EXCLUDED.published
    RETURNING id, (xmax = 0) AS created`, [e.name, e.description || null, e.level || null, !!e.published]);
  return { id: r.rows[0].id, created: r.rows[0].created };
}
export async function addToSet(db, setId, vocabularyId, sortOrder = 0) {
  await db.query('INSERT INTO vocabulary_set_item (set_id, vocabulary_id, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [setId, vocabularyId, sortOrder]);
}
