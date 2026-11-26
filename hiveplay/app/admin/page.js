import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
const ERR = { salah: 'Password salah.', limit: 'Terlalu banyak percobaan. Coba lagi nanti.' };

// Admin hanya untuk mengganti kode akses guru. Konten (kosakata, gambar, audio, set)
// dikelola lewat kode: lihat README.md dan assets/library/manifest.json.
export default async function Admin({ searchParams }) {
  const { e } = await searchParams;
  if (!(await isAdmin())) {
    return (
      <div className="center"><div className="box rise">
        <h1>Operator</h1>
        <p>Masuk untuk mengganti kode akses guru.</p>
        {ERR[e] && <p className="err" role="alert">{ERR[e]}</p>}
        <form method="post" action="/api/admin/login">
          <input type="password" name="pw" placeholder="Password operator" required autoFocus />
          <button>Masuk</button>
        </form>
      </div></div>
    );
  }
  redirect('/admin/access');
}
