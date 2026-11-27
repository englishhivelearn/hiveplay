import { query, tx } from '../db.mjs';
import { UserError } from '../errors.mjs';

export const MAX_Q = 60, MAX_IMG = 400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const notFound = (what = 'Game') => new UserError(`${what} not found.`, 404);
const uuid = (v, what) => { if (!UUID.test(String(v))) throw notFound(what); return String(v); };
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/* ------------------------------ template game ------------------------------ */
export const listGames = (owner) => query(
  `SELECT g.id, g.title, g.status, g.updated_at,
     (SELECT count(*) FROM quiz_question q WHERE q.game_id = g.id)::int AS questions,
     (SELECT COALESCE(sum(points), 0) FROM quiz_question q WHERE q.game_id = g.id)::int AS total_points,
     (SELECT count(*) FROM quiz_session s WHERE s.game_id = g.id AND s.status = 'finished')::int AS plays,
     (SELECT s.id FROM quiz_session s WHERE s.game_id = g.id AND s.owner_id = g.owner_id AND s.status IN ('playing','paused')
        ORDER BY s.updated_at DESC LIMIT 1) AS active_session
   FROM quiz_game g WHERE g.owner_id = $1 ORDER BY g.updated_at DESC`, [owner]);

export async function createGame(owner, b) {
  const title = str(b.title, 120) || 'Untitled game';
  return (await query('INSERT INTO quiz_game (owner_id, title) VALUES ($1,$2) RETURNING id', [owner, title]))[0].id;
}

export async function getGame(owner, id) {
  const g = (await query('SELECT id, title, status, updated_at FROM quiz_game WHERE id = $1 AND owner_id = $2', [uuid(id), owner]))[0];
  if (!g) throw notFound();
  g.questions = await query('SELECT id, question, answer, points, image FROM quiz_question WHERE game_id = $1 ORDER BY position', [g.id]);
  return g;
}

function cleanQuestions(raw) {
  if (!Array.isArray(raw)) raw = [];
  if (raw.length > MAX_Q) throw new UserError(`A game can have at most ${MAX_Q} questions.`);
  const out = [];
  raw.forEach((q, i) => {
    q = q || {};
    const question = str(q.question, 1000), answer = str(q.answer, 500);
    const noPoints = q.points === '' || q.points == null;
    if (!question && !answer && noPoints && !q.image) return; // baris kosong dilewati
    if (!question || !answer) throw new UserError(`Question ${i + 1}: fill in both the question and the answer.`);
    const points = Number(q.points);
    if (noPoints || !Number.isInteger(points) || points < 0 || points > 100000) throw new UserError(`Question ${i + 1}: enter the points (a whole number, 0 to 100000).`);
    let image = null;
    if (q.image) {
      if (typeof q.image !== 'string' || q.image.length > MAX_IMG || !IMG.test(q.image)) throw new UserError(`Question ${i + 1}: the image is invalid or too large.`);
      image = q.image;
    }
    out.push({ question, answer, points, image });
  });
  return out;
}

export async function saveGame(owner, id, b) {
  uuid(id);
  const title = str(b.title, 120);
  if (!title) throw new UserError('Give the game a title.');
  const status = b.status === 'ready' ? 'ready' : 'draft';
  const qs = cleanQuestions(b.questions);
  if (status === 'ready' && !qs.length) throw new UserError('Add at least one question before marking the game Ready.');
  return tx(async (c) => {
    const g = (await c.query('SELECT id FROM quiz_game WHERE id = $1 AND owner_id = $2 FOR UPDATE', [id, owner])).rows[0];
    if (!g) throw notFound();
    await c.query('UPDATE quiz_game SET title = $2, status = $3, updated_at = now() WHERE id = $1', [id, title, status]);
    await c.query('DELETE FROM quiz_question WHERE game_id = $1', [id]);
    if (qs.length) await c.query(
      `INSERT INTO quiz_question (game_id, position, question, answer, points, image)
       SELECT $1, * FROM unnest($2::int[], $3::text[], $4::text[], $5::int[], $6::text[])`,
      [id, qs.map((_, i) => i), qs.map(q => q.question), qs.map(q => q.answer), qs.map(q => q.points), qs.map(q => q.image)]);
    return { id, status, count: qs.length };
  });
}

export async function deleteGame(owner, id) {
  const r = await query('DELETE FROM quiz_game WHERE id = $1 AND owner_id = $2 RETURNING id', [uuid(id), owner]);
  if (!r.length) throw notFound();
}

/* ------------------------------ sesi permainan ------------------------------ */
function teamsFrom(mode, input) {
  const t = Array.isArray(input) ? input : [];
  const names = mode === 'two' ? [str(t[0], 40) || 'Team 1', str(t[1], 40) || 'Team 2'] : [str(t[0], 40) || 'Our Team'];
  if (mode === 'two' && names[0].toLowerCase() === names[1].toLowerCase()) throw new UserError('The two teams need different names.');
  return names.map(name => ({ name, score: 0, correct: 0, wrong: 0 }));
}

export async function startSession(owner, b) {
  const gid = uuid(b.gameId);
  const g = (await query('SELECT id, title, status FROM quiz_game WHERE id = $1 AND owner_id = $2', [gid, owner]))[0];
  if (!g) throw notFound();
  if (g.status !== 'ready') throw new UserError('Mark the game as Ready before playing it.');
  const questions = await query('SELECT id, question, answer, points, image FROM quiz_question WHERE game_id = $1 ORDER BY position', [gid]);
  if (!questions.length) throw new UserError('This game has no questions yet.');
  const mode = b.mode === 'two' ? 'two' : 'single';
  const teams = teamsFrom(mode, b.teams);
  const r = await query(
    `INSERT INTO quiz_session (game_id, owner_id, game_title, mode, teams, questions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [gid, owner, g.title, mode, JSON.stringify(teams), JSON.stringify(questions)]);
  return r[0].id;
}

/** Yang dikirim ke layar: soal & gambar hanya untuk soal yang sedang dibuka, jawaban hanya setelah ditampilkan. */
export function view(s) {
  const over = s.status === 'finished' || s.status === 'abandoned';
  return {
    id: s.id, gameId: s.game_id, title: s.game_title, mode: s.mode, status: s.status, turn: s.turn,
    teams: s.teams, played: s.played, openQ: s.open_q, revealed: s.revealed, startedAt: s.started_at, finishedAt: s.finished_at,
    questions: s.questions.map((q, i) => {
      const o = { n: i + 1, points: q.points };
      if (i === s.open_q) { o.question = q.question; o.image = q.image || null; if (s.revealed) o.answer = q.answer; }
      if (over) { o.question = q.question; o.answer = q.answer; }
      return o;
    }),
  };
}

export async function getSession(owner, id) {
  const s = (await query('SELECT * FROM quiz_session WHERE id = $1 AND owner_id = $2', [uuid(id, 'Session'), owner]))[0];
  if (!s) throw notFound('Session');
  return view(s);
}

export async function listSessions(owner, { gameId, done } = {}) {
  const p = [owner]; let w = 'owner_id = $1';
  if (gameId) { p.push(uuid(gameId)); w += ` AND game_id = $${p.length}`; }
  if (done) w += ` AND status IN ('finished','abandoned')`;
  return query(
    `SELECT id, game_id, game_title, mode, teams, status, started_at, finished_at,
       jsonb_array_length(questions)::int AS total, (SELECT count(*) FROM jsonb_object_keys(played))::int AS played
     FROM quiz_session WHERE ${w} ORDER BY started_at DESC LIMIT 200`, p);
}

export async function deleteSession(owner, id) {
  const s = (await query('SELECT status FROM quiz_session WHERE id = $1 AND owner_id = $2', [uuid(id, 'Session'), owner]))[0];
  if (!s) throw notFound('Session');
  if (s.status === 'playing' || s.status === 'paused') throw new UserError('Finish the game before deleting it from the history.', 409);
  await query('DELETE FROM quiz_session WHERE id = $1 AND owner_id = $2', [id, owner]);
}

const conflict = (m) => new UserError(m, 409);

/** Semua aturan permainan dijalankan di sini (server), bukan di browser. */
export async function act(owner, id, b) {
  uuid(id, 'Session');
  const action = String(b.action || '');
  return tx(async (c) => {
    const s = (await c.query('SELECT * FROM quiz_session WHERE id = $1 AND owner_id = $2 FOR UPDATE', [id, owner])).rows[0];
    if (!s) throw notFound('Session');
    const over = s.status === 'finished' || s.status === 'abandoned';

    if (action === 'restart') { // sesi lama diakhiri, sesi baru dimulai dari 0 dengan soal yang sama
      if (!over) await c.query(`UPDATE quiz_session SET status = 'abandoned', open_q = NULL, revealed = false, finished_at = now(), updated_at = now() WHERE id = $1`, [id]);
      const teams = s.teams.map(t => ({ name: t.name, score: 0, correct: 0, wrong: 0 }));
      const r = await c.query(
        `INSERT INTO quiz_session (game_id, owner_id, game_title, mode, teams, questions) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [s.game_id, owner, s.game_title, s.mode, JSON.stringify(teams), JSON.stringify(s.questions)]);
      return { id: r.rows[0].id };
    }
    if (over) throw conflict('This game is already finished.');

    let { status, open_q: open, revealed, turn, teams, played } = s;
    let finishedAt = s.finished_at;
    const total = s.questions.length;

    if (action === 'resume') { if (status !== 'paused') throw conflict('The game is not paused.'); status = 'playing'; }
    else if (action === 'pause') { if (status !== 'playing') throw conflict('The game is already paused.'); status = 'paused'; }
    else if (action === 'finish') { status = 'finished'; open = null; revealed = false; finishedAt = new Date(); }
    else {
      if (status === 'paused') throw conflict('The game is paused. Resume to continue.');
      if (action === 'open') {
        const i = Number(b.index);
        if (!Number.isInteger(i) || i < 0 || i >= total) throw new UserError('That question does not exist.');
        if (open != null) throw conflict('Finish the open question first.');
        if (played[String(i)]) throw conflict('That question has already been played.');
        open = i; revealed = false;
      } else if (action === 'close') { open = null; revealed = false; }
      else if (action === 'reveal') { if (open == null) throw conflict('No question is open.'); revealed = true; }
      else if (action === 'setTurn') {
        const t = Number(b.team);
        if (s.mode !== 'two' || (t !== 0 && t !== 1)) throw new UserError('Invalid team.');
        turn = t;
      } else if (action === 'judge') {
        if (open == null) throw conflict('No question is open.');
        const ok = b.correct === true, team = s.mode === 'two' ? turn : 0, pts = ok ? s.questions[open].points : 0;
        teams = teams.map((t, i) => i !== team ? t : { ...t, score: t.score + pts, correct: t.correct + (ok ? 1 : 0), wrong: t.wrong + (ok ? 0 : 1) });
        played = { ...played, [String(open)]: { team, correct: ok, points: pts } };
        open = null; revealed = false;
        if (s.mode === 'two' && b.advance !== false) turn = 1 - turn;
        if (Object.keys(played).length >= total) { status = 'finished'; finishedAt = new Date(); }
      } else throw new UserError('Unknown action.');
    }
    const r = await c.query(
      `UPDATE quiz_session SET status=$2, open_q=$3, revealed=$4, turn=$5, teams=$6, played=$7, finished_at=$8, updated_at=now()
       WHERE id=$1 RETURNING *`, [id, status, open, revealed, turn, JSON.stringify(teams), JSON.stringify(played), finishedAt]);
    return { session: view(r.rows[0]) };
  });
}