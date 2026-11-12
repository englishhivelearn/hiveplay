import { isGuru } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
const PESAN = { salah: 'Kode salah.', limit: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' };

export default async function Login({ searchParams }) {
  if (await isGuru()) redirect('/');
  const { e } = await searchParams;
  return (
    <div className="center"><div className="box">
      <h1>Hive Play</h1>
      <p>Khusus guru. Masukkan kode akses.</p>
      {PESAN[e] && <p className="err" role="alert">{PESAN[e]}</p>}
      <form method="post" action="/api/login">
        <input type="password" name="code" placeholder="Kode akses" autoComplete="current-password" required autoFocus />
        <button>Masuk</button>
      </form>
    </div></div>
  );
}
