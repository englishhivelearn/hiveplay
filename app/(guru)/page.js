import { requireGuru, isAdmin } from '@/lib/auth';
import { GAMES } from '@/lib/games';
import { LOGO } from '@/lib/art';
import Katalog from './Katalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await requireGuru(); // belum login -> dialihkan ke /login
  const admin = await isAdmin();
  return (
    <>
      <header>
        <div className="brand rise">
          <span dangerouslySetInnerHTML={{ __html: LOGO }} />
          <h1>Hive Play</h1>
        </div>
        <p className="sub rise" style={{ '--i': 1 }}>Game kelas untuk guru. Pilih satu, tampilkan di layar, lalu mulai.</p>
      </header>
      <main>
        <Katalog games={GAMES} />
        <form method="post" action="/api/logout" className="out">{admin && <a className="back" href="/admin" style={{ marginRight: 12 }}>Admin dashboard</a>}<button className="btn alt">Keluar</button></form>
      </main>
    </>
  );
}
