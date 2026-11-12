import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const ERR = { salah: 'Password salah.', limit: 'Terlalu banyak percobaan. Coba lagi nanti.', pendek: 'Kode harus 6 sampai 64 karakter.', gagal: 'Gagal menyimpan kode.' };

export default async function Admin({ searchParams }) {
  const { e, m } = await searchParams;
  const masuk = await isAdmin();
  return (
    <div className="center"><div className="box">
      {masuk ? (
        <>
          <h1>Ganti kode akses</h1>
          <p>Setelah diganti, semua guru yang sedang masuk akan keluar dan harus memakai kode baru.</p>
          {m === 'ok' && <p className="ok" role="alert">Kode akses sudah diganti. Beritahu para guru kode barunya.</p>}
          {ERR[e] && <p className="err" role="alert">{ERR[e]}</p>}
          <form method="post" action="/api/admin/code">
            <input type="text" name="code" placeholder="Kode baru (min. 6 karakter)" minLength={6} maxLength={64} autoComplete="off" required />
            <button>Simpan kode baru</button>
          </form>
          <form method="post" action="/api/admin/logout"><button className="link">Keluar operator</button></form>
        </>
      ) : (
        <>
          <h1>Operator</h1>
          <p>Masuk untuk mengganti kode akses.</p>
          {ERR[e] && <p className="err" role="alert">{ERR[e]}</p>}
          <form method="post" action="/api/admin/login">
            <input type="password" name="pw" placeholder="Password operator" required autoFocus />
            <button>Masuk</button>
          </form>
        </>
      )}
    </div></div>
  );
}
