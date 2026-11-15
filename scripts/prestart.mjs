// Dijalankan sebelum `next start`. Jika database belum ada/gagal, website TETAP menyala:
// game otomatis memakai data bawaan dan API mengembalikan 503 yang jelas.
import { migrate } from './migrate.mjs'; import { seed } from './seed.mjs'; import { closePool } from '../lib/db.mjs';
if (!process.env.DATABASE_URL) { console.log('[prestart] DATABASE_URL belum diisi: perpustakaan asset tidak aktif, game memakai data bawaan.'); }
else {
  try { await migrate((m) => console.log('[prestart]', m)); await seed((m) => console.log('[prestart]', m)); }
  catch (e) { console.error('[prestart] database bermasalah, website tetap jalan tanpa perpustakaan asset:', e.message); }
  finally { await closePool().catch(() => {}); }
}
