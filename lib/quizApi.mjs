// Pemilik data Quiz = ID perangkat acak di cookie `hp_owner` (HttpOnly, 5 tahun).
// Kunci dari perangkat lain DITAMBAHKAN lewat cookie `hp_links` (maks. 5), jadi game milik perangkat ini tidak hilang.
// Di database hanya hash-nya yang disimpan. Game baru selalu milik kunci utama (hp_owner).
import crypto from 'node:crypto';
import { isStaff } from '@/lib/auth';
import { json, fail } from './apiHelpers.mjs';

const OWNER = 'hp_owner', LINKS = 'hp_links';
export const MAX_LINKS = 5;
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
export const fingerprint = (t) => hash(t).slice(0, 8);
const newToken = () => crypto.randomBytes(32).toString('base64url');
const YEARS5 = 5 * 365 * 24 * 3600;

function cookieOf(req, name, value, maxAge = YEARS5) {
  const secure = req.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export const ownerCookie = (req, token) => cookieOf(req, OWNER, token);
export const linksCookie = (req, tokens) => tokens.length ? cookieOf(req, LINKS, tokens.join(',')) : cookieOf(req, LINKS, '', 0);

function readCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : '';
}
function readToken(req) { const v = readCookie(req, OWNER); return TOKEN_RE.test(v) ? v : null; }
function readLinks(req, primary) {
  const seen = new Set([primary]);
  return readCookie(req, LINKS).split(',').filter((t) => TOKEN_RE.test(t) && !seen.has(t) && seen.add(t)).slice(0, MAX_LINKS);
}

/** Membungkus route: wajib login guru/admin, menentukan pemilik, memasang cookie perangkat bila baru.
 *  fn menerima { id (utama), ids ([utama, ...tertaut]), token, links (token tertaut) }. */
export async function handle(req, fn) {
  try {
    if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
    let token = readToken(req), fresh = false;
    if (!token) { token = newToken(); fresh = true; }
    const links = readLinks(req, token);
    const res = await fn({ id: hash(token), ids: [hash(token), ...links.map(hash)], token, links });
    // jangan menimpa cookie utama yang sudah dipasang route itu sendiri
    const own = res.headers.getSetCookie().some((c) => c.startsWith(OWNER + '='));
    if (fresh && !own) res.headers.append('Set-Cookie', ownerCookie(req, token));
    return res;
  } catch (e) { return fail(e); }
}