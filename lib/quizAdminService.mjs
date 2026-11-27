// Pengelolaan Quiz oleh admin (operator): melihat semua game dari semua guru, ukuran penyimpanan, dan menghapus.
import { query, tx } from '../db.mjs';
import { UserError } from '../errors.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v) => Number(v || 0);
const SESSION_BYTES = 'pg_column_size(questions) + pg_column_size(teams) + pg_column_size(played)';

export async function overview() {
  const rows = await query(
    `SELECT g.id, g.title, g.status, left(g.owner_id, 8) AS owner, g.created_at, g.updated_at,
       COALESCE(q.n, 0) AS questions, COALESCE(q.imgs, 0) AS images, COALESCE(q.bytes, 0) AS bytes,
       COALESCE(s.n, 0) AS sessions, COALESCE(s.bytes, 0) AS session_bytes, s.last_played
     FROM quiz_game g
     LEFT JOIN (SELECT game_id, count(*) AS n, count(image) AS imgs,
                  sum(octet_length(question) + octet_length(answer) + COALESCE(octet_length(image), 0)) AS bytes
                FROM quiz_question GROUP BY game_id) q ON q.game_id = g.id
     LEFT JOIN (SELECT game_id, count(*) AS n, sum(${SESSION_BYTES}) AS bytes, max(started_at) AS last_played
                FROM quiz_session WHERE game_id IS NOT NULL GROUP BY game_id) s ON s.game_id = g.id
     ORDER BY g.updated_at DESC`);
  const games = rows.map((r) => ({ ...r, questions: num(r.questions), images: num(r.images), bytes: num(r.bytes), sessions: num(r.sessions), session_bytes: num(r.session_bytes) }));
  const [orph] = await query(`SELECT count(*) AS n, COALESCE(sum(${SESSION_BYTES}), 0) AS bytes FROM quiz_session WHERE game_id IS NULL`);
  const [t] = await query(
    `SELECT (SELECT count(*) FROM quiz_game) AS games, (SELECT count(DISTINCT owner_id) FROM quiz_game) AS owners,
       (SELECT count(*) FROM quiz_question) AS questions, (SELECT count(*) FROM quiz_session) AS sessions,
       (pg_total_relation_size('quiz_game') + pg_total_relation_size('quiz_question') + pg_total_relation_size('quiz_session')) AS db_bytes`);
  return {
    stats: { games: num(t.games), owners: num(t.owners), questions: num(t.questions), sessions: num(t.sessions), db_bytes: num(t.db_bytes),
             orphan_sessions: num(orph.n), orphan_bytes: num(orph.bytes) },
    games,
  };
}

export async function gameDetail(id) {
  if (!UUID.test(String(id))) throw new UserError('Game not found.', 404);
  const g = (await query('SELECT id, title, status FROM quiz_game WHERE id = $1', [id]))[0];
  if (!g) throw new UserError('Game not found.', 404);
  g.questions = (await query(
    `SELECT position + 1 AS n, question, answer, points, (image IS NOT NULL) AS has_image, COALESCE(octet_length(image), 0) AS image_bytes
     FROM quiz_question WHERE game_id = $1 ORDER BY position`, [id])).map((q) => ({ ...q, n: num(q.n), image_bytes: num(q.image_bytes) }));
  return g;
}

export async function deleteGames(ids, withSessions) {
  if (!Array.isArray(ids) || !ids.length) throw new UserError('Select at least one game.');
  if (ids.length > 500) throw new UserError('Select at most 500 games at a time.');
  if (!ids.every((i) => UUID.test(String(i)))) throw new UserError('Invalid selection.');
  return tx(async (c) => {
    const sess = withSessions ? (await c.query('DELETE FROM quiz_session WHERE game_id = ANY($1::uuid[])', [ids])).rowCount : 0;
    const games = (await c.query('DELETE FROM quiz_game WHERE id = ANY($1::uuid[])', [ids])).rowCount;
    return { games, sessions: sess };
  });
}

/** Riwayat permainan yang sudah selesai dan lebih tua dari N hari. scope: 'all' atau 'orphans' (game aslinya sudah dihapus). */
export async function cleanupSessions({ days, scope, dryRun }) {
  const d = Number(days);
  if (!Number.isInteger(d) || d < 0 || d > 3650) throw new UserError('Enter a number of days between 0 and 3650.');
  const where = `status IN ('finished','abandoned') AND COALESCE(finished_at, started_at) < now() - ($1::int * interval '1 day')` + (scope === 'orphans' ? ' AND game_id IS NULL' : '');
  if (dryRun) {
    const [r] = await query(`SELECT count(*) AS n, COALESCE(sum(${SESSION_BYTES}), 0) AS bytes FROM quiz_session WHERE ${where}`, [d]);
    return { sessions: num(r.n), bytes: num(r.bytes) };
  }
  const r = await query(`DELETE FROM quiz_session WHERE ${where} RETURNING 1`, [d]);
  return { sessions: r.length };
}