'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errText, Notice, Empty } from './ui';

const GROUPS = { VOCABULARY: 'Vocabulary', CHARACTER: 'Characters', ENVIRONMENT: 'Environments', OBJECT: 'Game objects', AUDIO: 'Audio', ANIMATION: 'Animations', UI: 'UI' };

export default function CategoryManager({ kind }) {
  const asset = kind === 'asset';
  const listUrl = asset ? '/api/admin/asset-categories' : '/api/vocab/categories';
  const base = asset ? '/api/admin/asset-categories' : '/api/admin/vocab-categories';
  const [cats, setCats] = useState(null);
  const [msg, setMsg] = useState(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('VOCABULARY');
  const [parent, setParent] = useState('');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const load = useCallback(async () => {
    try { setCats((await api('GET', listUrl)).categories); }
    catch (e) { setCats([]); setMsg({ type: 'err', text: e.status === 503 ? 'Database belum tersambung.' : errText(e) }); }
  }, [listUrl]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, text) => { setMsg(null); try { await fn(); setMsg({ type: 'ok', text }); await load(); } catch (e) { setMsg({ type: 'err', text: errText(e) }); } };
  const add = (e) => { e.preventDefault(); run(async () => { await api('POST', base, asset ? { name, group } : { name, parent: parent || undefined }); setName(''); }, 'Kategori ditambahkan.'); };
  const rename = (c) => run(async () => { await api('PATCH', base + '/' + c.id, { name: draft }); setEditing(null); }, 'Nama kategori diubah.');

  // Fungsi biasa (bukan komponen): komponen yang didefinisikan di dalam render akan dibongkar-pasang
  // setiap ketikan sehingga kolom isian kehilangan fokus.
  const row = (c, child) => (
    <tr key={c.id}>
      <td style={{ paddingLeft: child ? 32 : 12 }}>
        {editing === c.id ? (
          <span className="adm-inline"><input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Nama baru" maxLength={60} /><button className="btn sm" onClick={() => rename(c)}>Simpan</button><button className="btn sm alt" onClick={() => setEditing(null)}>Batal</button></span>
        ) : <>{child ? '— ' : ''}{c.name}</>}
      </td>
      <td className="mono">{c.slug}</td>
      <td>{asset ? c.assets : c.words}</td>
      <td>{editing !== c.id && <button className="btn sm alt" onClick={() => { setEditing(c.id); setDraft(c.name); }}>Ubah nama</button>}</td>
    </tr>
  );
  const tops = (cats || []).filter((c) => !c.parent);
  return (
    <div>
      <div className="adm-head"><div><h1>{asset ? 'Asset Categories' : 'Vocabulary Categories'}</h1>
        <p>{asset ? 'Kelompok asset: kosakata, karakter, latar, objek, audio, animasi, dan UI. Kode kategori tidak bisa diubah supaya referensi tetap aman.' : 'Kategori dan subkategori kosakata. Kode kategori tidak bisa diubah supaya referensi tetap aman.'}</p></div></div>
      <Notice msg={msg} />
      <form className="adm-card adm-inline" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={asset ? 'Nama kategori baru' : 'Nama kategori atau subkategori baru'} maxLength={60} required aria-label="Nama kategori baru" />
        {asset ? (
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Kelompok">{Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        ) : (
          <select value={parent} onChange={(e) => setParent(e.target.value)} aria-label="Kategori induk"><option value="">Kategori utama</option>{tops.map((t) => <option key={t.slug} value={t.slug}>Subkategori dari {t.name}</option>)}</select>
        )}
        <button className="btn">Tambah</button>
      </form>
      {cats === null ? <Empty>Memuat…</Empty> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Nama</th><th>Kode</th><th>{asset ? 'Asset' : 'Kata'}</th><th></th></tr></thead>
          <tbody>
            {asset
              ? Object.keys(GROUPS).map((g) => [<tr key={g} className="adm-grouprow"><td colSpan={4}>{GROUPS[g]}</td></tr>, ...cats.filter((c) => c.group === g).map((c) => row(c))])
              : tops.flatMap((t) => [row(t), ...cats.filter((c) => c.parent === t.slug).map((c) => row(c, true))])}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
