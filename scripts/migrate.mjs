import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { pool, closePool } from '../lib/db.mjs';

export async function migrate(log = console.log) {
  const c = await pool().connect();
  try {
    await c.query('CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await c.query('SELECT name FROM _migrations')).rows.map(r => r.name));
    const dir = path.join(process.cwd(), 'db', 'migrations');
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      if (done.has(f)) continue;
      await c.query('BEGIN');
      try { await c.query(fs.readFileSync(path.join(dir, f), 'utf8')); await c.query('INSERT INTO _migrations (name) VALUES ($1)', [f]); await c.query('COMMIT'); log('migrasi diterapkan: ' + f); }
      catch (e) { await c.query('ROLLBACK'); throw e; }
    }
  } finally { c.release(); }
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  migrate().then(() => closePool()).catch(e => { console.error('Migrasi gagal:', e.message); process.exit(1); });
}
