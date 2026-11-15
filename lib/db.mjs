// Koneksi PostgreSQL. Jika DATABASE_URL belum diisi, website tetap jalan (game memakai data bawaan).
import pg from 'pg';

export class DbUnavailable extends Error {
  constructor(msg) { super(msg || 'Database is not configured'); this.code = 'DB_UNAVAILABLE'; }
}
export function pool() {
  if (!process.env.DATABASE_URL) throw new DbUnavailable('DATABASE_URL is not set');
  return (globalThis.__hpPool ||= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  }));
}
export const query = async (text, params) => (await pool().query(text, params)).rows;
export async function tx(fn) {
  const c = await pool().connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
export async function closePool() {
  if (globalThis.__hpPool) { await globalThis.__hpPool.end(); globalThis.__hpPool = null; }
}
