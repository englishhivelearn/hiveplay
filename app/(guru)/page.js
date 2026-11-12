import { requireGuru } from '@/lib/auth';
import { GAMES } from '@/lib/games';
import Katalog from './Katalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await requireGuru(); // belum login -> dialihkan ke /login
  return (
    <div className="wrap">
      <form method="post" action="/api/logout" className="out"><button>Keluar</button></form>
      <h1>Hive Play</h1>
      <Katalog games={GAMES} />
    </div>
  );
}
