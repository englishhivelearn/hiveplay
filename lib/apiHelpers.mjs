import { DbUnavailable } from './db.mjs';
export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const NET = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '57P01', '3D000']);
export function fail(e) {
  if (e instanceof DbUnavailable || NET.has(e?.code) || /^(08|28)/.test(e?.code || '')) return json({ error: 'database_unavailable' }, 503);
  console.error(e);
  return json({ error: 'server_error' }, 500);
}
