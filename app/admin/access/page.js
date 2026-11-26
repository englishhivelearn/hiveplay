import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const ERR = { pendek: 'Kode harus 6 sampai 64 karakter.', gagal: 'Gagal menyimpan kode.' };

export default async function Access({ searchParams }) {
  await requireAdmin();
  const { e, m } = await searchParams;
  return (
    <div>
      <div className="adm-head"><div><h1>Kode akses guru</h1><p>Setelah diganti, semua guru yang sedang masuk akan keluar dan harus memakai kode baru. Kode disimpan terenkripsi, jadi tidak bisa dilihat kembali.</p></div></div>
      {m === 'ok' && <div className="adm-notice ok" role="status">Kode akses sudah diganti. Beritahu para guru kode barunya.</div>}
      {ERR[e] && <div className="adm-notice err" role="alert">{ERR[e]}</div>}
      <form method="post" action="/api/admin/code" className="adm-card adm-inline">
        <input type="text" name="code" placeholder="Kode baru (6 sampai 64 karakter)" minLength={6} maxLength={64} autoComplete="off" required aria-label="Kode baru" />
        <button className="btn">Simpan kode baru</button>
      </form>
    </div>
  );
}
