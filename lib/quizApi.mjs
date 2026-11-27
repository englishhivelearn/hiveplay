// Pemilik data Quiz = ID perangkat acak yang disimpan di cookie (HttpOnly, 5 tahun).
// Di database hanya hash-nya yang disimpan. Kunci yang sama bisa ditautkan ke perangkat lain.
import crypto from 'node:crypto';
import { isStaff } from '@/lib/auth';
import { json, fail } from './apiHelpers.mjs';

const COOKIE = 'hp_owner';
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

export function ownerCookie(req, token) {
  const secure = req.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${5 * 365 * 24 * 3600}${secure}`;
}
function readToken(req) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)hp_owner=([^;]+)/);
  return m && TOKEN_RE.test(m[1]) ? m[1] : null;
}

/** Membungkus route: wajib login guru, menentukan pemilik, memasang cookie perangkat bila baru. */
export async function handle(req, fn) {
  try {
    if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
    let token = readToken(req), fresh = false;
    if (!token) { token = newToken(); fresh = true; }
    const res = await fn({ id: hash(token), token });
    // jangan menimpa cookie yang sudah dipasang route itu sendiri (mis. saat menautkan kunci)
    const own = res.headers.getSetCookie().some((c) => c.startsWith(COOKIE + '='));
    if (fresh && !own) res.headers.append('Set-Cookie', ownerCookie(req, token));
    return res;
  } catch (e) { return fail(e); }
}