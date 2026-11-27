export async function api(url, { method = 'GET', body } = {}) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  let d = {};
  try { d = await r.json(); } catch {}
  if (r.status === 401) { location.href = '/login'; throw new Error('Please log in again.'); }
  if (!r.ok) throw new Error(d.error === 'database_unavailable' ? 'The database is not available right now. Try again in a moment.' : d.error || 'Something went wrong.');
  return d;
}
export const sfx = (name) => { try { window.HP && window.HP[name] && window.HP[name](); } catch {} };
export const fmtDate = (d) => d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const winnerOf = (s) => {
  if (s.mode !== 'two') return null;
  const [a, b] = s.teams;
  return a.score === b.score ? 'tie' : a.score > b.score ? 0 : 1;
};