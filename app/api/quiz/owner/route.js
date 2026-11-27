import { handle, linksCookie, fingerprint, hash, TOKEN_RE, MAX_LINKS } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { query } from '@/lib/db.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function view(o) {
  const rows = await query('SELECT owner_id, count(*)::int AS n FROM quiz_game WHERE owner_id = ANY($1::text[]) GROUP BY owner_id', [o.ids]);
  const n = Object.fromEntries(rows.map((r) => [r.owner_id, r.n]));
  return {
    key: o.token,
    mine: n[o.id] || 0,
    links: o.links.map((t) => ({ fp: fingerprint(t), games: n[hash(t)] || 0 })),
    max: MAX_LINKS,
  };
}
const withLinks = (req, o, tokens, payload) => {
  const res = json(payload);
  res.headers.append('Set-Cookie', linksCookie(req, tokens));
  return res;
};

// GET: kunci perangkat ini + kunci yang tertaut.
export const GET = (req) => handle(req, async (o) => json(await view(o)));

// POST {key}: TAMBAHKAN kunci dari perangkat lain. Game milik perangkat ini tetap ada.
export const POST = (req) => handle(req, async (o) => {
  const key = String((await body(req)).key || '').trim();
  if (!TOKEN_RE.test(key)) throw new UserError('That key is not valid. Copy it again from the other device.');
  if (key === o.token) throw new UserError('That is this device’s own key. Paste the key from your other device.');
  let tokens = o.links;
  if (!tokens.includes(key)) {
    if (tokens.length >= MAX_LINKS) throw new UserError(`You can link at most ${MAX_LINKS} other keys. Remove one first.`);
    tokens = [...tokens, key];
  }
  return withLinks(req, o, tokens, await view({ ...o, links: tokens, ids: [o.id, ...tokens.map(hash)] }));
});

// DELETE {fp}: lepaskan kunci tertaut dari browser ini (tidak menghapus game apa pun).
export const DELETE = (req) => handle(req, async (o) => {
  const fp = String((await body(req)).fp || '');
  const tokens = o.links.filter((t) => fingerprint(t) !== fp);
  return withLinks(req, o, tokens, await view({ ...o, links: tokens, ids: [o.id, ...tokens.map(hash)] }));
});