import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { usageReport } from '@/lib/services/gameAssetService.mjs';

export const dynamic = 'force-dynamic';
const GAME = { 'tap-animals': 'Tap the Animals', 'count-fruits': 'Count the Fruits', 'times-table': 'Times Table Quiz', catalog: 'Teacher catalog' };

export default async function Usage() {
  await requireAdmin();
  let r = null;
  try { r = await usageReport(); } catch { /* database belum tersambung */ }
  if (!r) return <div><div className="adm-head"><div><h1>Asset Usage</h1></div></div><div className="adm-notice err" role="alert">Database belum tersambung. Isi <b>DATABASE_URL</b> di Railway Variables.</div></div>;
  return (
    <div>
      <div className="adm-head"><div><h1>Asset Usage</h1><p>Game mana memakai asset apa, serta asset yang kembar, tak terpakai, dan kata yang belum punya gambar.</p></div></div>

      <h2 className="adm-h2">Game dan asset-nya</h2>
      <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>Game</th><th>Asset yang dipakai</th></tr></thead><tbody>
        {r.games.map((g) => <tr key={g.game}><td><b>{GAME[g.game] || g.game}</b><div className="adm-sub mono">{g.game}</div></td>
          <td>{g.assets.map((a) => <span key={a.slug + a.role} className="chip" title={a.slug}>{a.name} · {a.role}</span>)}</td></tr>)}
      </tbody></table></div>

      <h2 className="adm-h2">Setiap asset dipakai di mana</h2>
      <div className="adm-tablewrap"><table className="adm-table"><thead><tr><th>Asset</th><th>Game</th><th>Kata</th><th>Status</th></tr></thead><tbody>
        {r.assets.map((a) => <tr key={a.slug}><td>{a.name}<div className="adm-sub mono">{a.slug}</div></td>
          <td>{a.games.length ? a.games.map((g) => <span key={g} className="chip">{GAME[g] || g}</span>) : <i>-</i>}</td><td>{a.words || '-'}</td><td>{a.status === 'ACTIVE' ? 'Aktif' : a.status === 'ARCHIVED' ? 'Arsip' : 'Draft'}</td></tr>)}
      </tbody></table></div>

      <h2 className="adm-h2">Perlu perhatian</h2>
      <div className="adm-cards">
        <div className="adm-card"><h3>Asset tak terpakai ({r.unused.length})</h3>
          {r.unused.length ? <p>{r.unused.map((a) => <span key={a.slug} className="chip">{a.name}</span>)}</p> : <p>Semua asset dipakai.</p>}
          <p className="adm-sub">Aman diarsipkan atau dihapus lewat <Link href="/admin/assets">Asset Library</Link>.</p></div>
        <div className="adm-card"><h3>Asset kembar ({r.duplicates.length})</h3>
          {r.duplicates.length ? r.duplicates.map((d) => <p key={d.sha256}>{d.slugs.map((s) => <span key={s} className="chip warn">{s}</span>)}</p>) : <p>Tidak ada file kembar.</p>}
          <p className="adm-sub">Isi file sama persis. Pakai satu saja supaya perpustakaan tetap rapi.</p></div>
        <div className="adm-card"><h3>Kata tanpa gambar ({r.wordsWithoutImage.length})</h3>
          {r.wordsWithoutImage.length ? <p>{r.wordsWithoutImage.map((w) => <span key={w.slug} className="chip warn">{w.word}</span>)}</p> : <p>Semua kata aktif punya gambar.</p>}
          <p className="adm-sub">Game akan memperingatkan guru dan memakai gambar pengganti. Tautkan gambar lewat <Link href="/admin/vocabulary">Vocabulary</Link>.</p></div>
      </div>
    </div>
  );
}
