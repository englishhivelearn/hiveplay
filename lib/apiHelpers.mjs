import { DbUnavailable } from './db.mjs';
import { UserError } from './errors.mjs';
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const NET = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '57P01', '3D000']);
export function fail(e) {
  if (e instanceof UserError) return json({ error: e.message, ...e.extra }, e.status);
  if (e instanceof DbUnavailable || NET.has(e?.code) || /^(08|28)/.test(e?.code || '')) return json({ error: 'database_unavailable' }, 503);
  if (e?.code === '23505') return json({ error: 'Nama atau kode itu sudah dipakai.' }, 409);
  if (e?.code === '23503') return json({ error: 'Data ini masih dipakai oleh data lain.' }, 409);
  if (e?.code === '23514' || e?.code === '22P02') return json({ error: 'Isian tidak valid.' }, 400);
  console.error(e);
  return json({ error: 'server_error' }, 500);
}
export const body = async (req) => { try { const b = await req.json(); return b && typeof b === 'object' ? b : {}; } catch { return {}; } };
