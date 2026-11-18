import { isAdmin } from './auth';
import { json } from './apiHelpers.mjs';
// Semua endpoint tulis memakai ini: hanya admin (operator), dan asal permintaan harus sama dengan situs ini.
export async function adminOnly(req) {
  if (!(await isAdmin())) return json({ error: 'forbidden' }, 403);
  const origin = req.headers.get('origin');
  if (origin) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    try { if (new URL(origin).host !== host) return json({ error: 'bad_origin' }, 403); } catch { return json({ error: 'bad_origin' }, 403); }
  }
  return null;
}
