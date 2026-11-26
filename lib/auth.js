import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CFG_FILE = path.join(DATA_DIR, 'config.json');

function secrets() {
  const { SESSION_SECRET, ADMIN_PASSWORD, ACCESS_CODE } = process.env;
  if (!SESSION_SECRET || !ADMIN_PASSWORD || !ACCESS_CODE)
    throw new Error('Isi dulu variabel: SESSION_SECRET, ADMIN_PASSWORD, ACCESS_CODE');
  return { SESSION_SECRET, ADMIN_PASSWORD, ACCESS_CODE };
}

/* ---- kode akses (dibaca dari file setiap kali, supaya selalu terbaru) ---- */
export function readCfg() {
  try { return JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); } catch { return { version: 1 }; }
}
const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();
export const safeEq = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));
export function checkCode(input) {
  const cfg = readCfg();
  if (cfg.hash) {
    const h = crypto.scryptSync(String(input), cfg.salt, 32);
    return crypto.timingSafeEqual(h, Buffer.from(cfg.hash, 'hex'));
  }
  return safeEq(input, secrets().ACCESS_CODE); // kode awal dari variabel Railway
}
export function setCode(newCode) {
  const cfg = readCfg();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(newCode, salt, 32).toString('hex');
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // versi naik = semua sesi guru yang lama otomatis tidak berlaku
  fs.writeFileSync(CFG_FILE, JSON.stringify({ salt, hash, version: (cfg.version || 1) + 1 }));
}
export const checkAdminPw = (pw) => safeEq(pw, secrets().ADMIN_PASSWORD);

/* ---- sesi: cookie bertanda tangan ---- */
export function sign(obj) {
  const p = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return p + '.' + crypto.createHmac('sha256', secrets().SESSION_SECRET).update(p).digest('base64url');
}
function verify(t) {
  if (!t) return null;
  const [p, s] = t.split('.');
  if (!p || !s) return null;
  const good = crypto.createHmac('sha256', secrets().SESSION_SECRET).update(p).digest('base64url');
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
}
export async function isGuru() {
  const s = verify((await cookies()).get('guru')?.value);
  return !!s && s.v === readCfg().version;
}
export async function isAdmin() {
  const s = verify((await cookies()).get('adm')?.value);
  return !!s && s.role === 'admin';
}
export async function isStaff() { return (await isGuru()) || (await isAdmin()); } // guru atau operator (admin)
export async function requireGuru() { if (!(await isStaff())) redirect('/login'); }

/* ---- bantuan untuk route handler ---- */
export const guruToken = () => sign({ v: readCfg().version, exp: Date.now() + 12 * 3600e3 });
export const adminToken = () => sign({ role: 'admin', exp: Date.now() + 2 * 3600e3 });
export function cookieStr(req, name, value, hours) {
  const secure = req.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : '';
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.round(hours * 3600)}${secure}`;
}
export function go(to, setCookies = []) {
  const h = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  setCookies.forEach((c) => h.append('Set-Cookie', c));
  return new Response(null, { status: 303, headers: h });
}

/* ---- batas percobaan: 8 kali per 15 menit per IP ---- */
const tries = (globalThis.__rmgTries ||= new Map());
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || 'lokal').split(',')[0].trim();
export function limited(ip) {
  const now = Date.now(), t = tries.get(ip) || { n: 0, at: now };
  if (now - t.at > 15 * 60e3) { t.n = 0; t.at = now; }
  tries.set(ip, t);
  return t.n >= 8;
}
export const failed = (ip) => { const t = tries.get(ip); if (t) t.n++; };
export const succeeded = (ip) => tries.delete(ip);

export async function requireAdmin() { if (!(await isAdmin())) redirect('/admin'); }
