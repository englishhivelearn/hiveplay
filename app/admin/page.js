import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { query } from '@/lib/db.mjs';
import { usageReport } from '@/lib/services/gameAssetService.mjs';

export const dynamic = 'force-dynamic';
const ERR = { salah: 'Password salah.', limit: 'Terlalu banyak percobaan. Coba lagi nanti.' };

async function stats() {
  try {
    const s = (await query(`SELECT
      (SELECT count(*) FROM asset WHERE status = 'ACTIVE')::int AS assets,
      (SELECT count(*) FROM asset WHERE status <> 'ACTIVE')::int AS archived,
      (SELECT count(*) FROM asset WHERE status = 'ACTIVE' AND type = 'AUDIO')::int AS audio,
      (SELECT count(*) FROM vocabulary WHERE status = 'ACTIVE')::int AS words,
      (SELECT count(*) FROM vocabulary_set WHERE published)::int AS published,
      (SELECT count(*) FROM vocabulary_set WHERE NOT published)::int AS drafts`))[0];
    const u = await usageReport();
    return { ...s, unused: u.unused.length, duplicates: u.duplicates.length, noImage: u.wordsWithoutImage.length };
  } catch { return null; }
}

export default async function Admin({ searchParams }) {
  const { e } = await searchParams;
  if (!(await isAdmin())) {
    return (
      <div className="center"><div className="box rise">
        <h1>Operator</h1>
        <p>Masuk untuk mengelola konten Hive Play.</p>
        {ERR[e] && <p className="err" role="alert">{ERR[e]}</p>}
        <form method="post" action="/api/admin/login">
          <input type="password" name="pw" placeholder="Password operator" required autoFocus />
          <button>Masuk</button>
        </form>
      </div></div>
    );
  }
  const s = await stats();
  const Card = ({ n, label, href, warn }) => (
    <Link href={href} className={'adm-stat' + (warn && n > 0 ? ' warn' : '')}><b>{n}</b><span>{label}</span></Link>
  );
  return (
    <div>
      <div className="adm-head"><div><h1>Dashboard</h1><p>Ringkasan perpustakaan asset dan kosakata Hive Play.</p></div></div>
      {!s ? (
        <div className="adm-notice err" role="alert">Database belum tersambung, jadi data belum bisa ditampilkan. Isi <b>DATABASE_URL</b> di Railway Variables, lalu deploy ulang.</div>
      ) : (
        <div className="adm-stats">
          <Card n={s.words} label="Kata aktif" href="/admin/vocabulary" />
          <Card n={s.published} label="Set dipublikasikan" href="/admin/sets" />
          <Card n={s.drafts} label="Set draft" href="/admin/sets" />
          <Card n={s.assets} label="Asset aktif" href="/admin/assets" />
          <Card n={s.audio} label="File audio" href="/admin/audio" />
          <Card n={s.archived} label="Asset diarsipkan/draft" href="/admin/assets" />
          <Card n={s.noImage} label="Kata tanpa gambar" href="/admin/usage" warn />
          <Card n={s.unused} label="Asset tak terpakai" href="/admin/usage" warn />
          <Card n={s.duplicates} label="Kelompok asset kembar" href="/admin/usage" warn />
        </div>
      )}
      <h2 className="adm-h2">Mulai dari sini</h2>
      <div className="adm-cards">
        <Link className="adm-card" href="/admin/assets"><h3>Upload asset</h3><p>Tambahkan gambar, karakter, latar, objek, atau audio ke perpustakaan.</p></Link>
        <Link className="adm-card" href="/admin/vocabulary"><h3>Tambah kosakata</h3><p>Buat kata baru, lalu tautkan gambar dan rekaman pengucapan.</p></Link>
        <Link className="adm-card" href="/admin/sets"><h3>Buat set kosakata</h3><p>Kumpulkan kata menjadi set yang bisa dipilih guru di dalam game.</p></Link>
        <Link className="adm-card" href="/admin/access"><h3>Kode akses guru</h3><p>Ganti kode yang dipakai guru untuk masuk.</p></Link>
      </div>
    </div>
  );
}
