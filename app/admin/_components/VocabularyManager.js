'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errText, useDebounced, Modal, Badge, Notice, Empty } from './ui';

const ROLES = ['whole', 'sliced', 'character', 'pronunciation'];
const POS = ['', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun', 'conjunction', 'interjection', 'phrase'];
const mediaUrl = (l) => `/media/${encodeURIComponent(l.slug)}?v=${l.version}`;

export default function VocabularyManager() {
  const [f, setF] = useState({ q: '', category: '', difficulty: '', status: 'ACTIVE' });
  const dq = useDebounced(f.q);
  const [words, setWords] = useState(null);
  const [cats, setCats] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: '500', status: f.status });
      if (dq) qs.set('q', dq);
      if (f.category) qs.set('category', f.category);
      if (f.difficulty) qs.set('difficulty', f.difficulty);
      setWords((await api('GET', '/api/vocab?' + qs)).words); setError('');
    } catch (e) { setError(e.status === 503 ? 'Database belum tersambung. Isi DATABASE_URL di Railway Variables.' : errText(e)); setWords([]); }
  }, [dq, f.category, f.difficulty, f.status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('GET', '/api/vocab/categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);
  const tops = cats.filter((c) => !c.parent);
  const options = tops.flatMap((t) => [[t.slug, t.name], ...cats.filter((c) => c.parent === t.slug).map((k) => [k.slug, '— ' + k.name])]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div>
      <div className="adm-head">
        <div><h1>Vocabulary</h1><p>Satu daftar kata untuk semua game. Guru memilih kata lewat set; hanya admin yang bisa mengubah.</p></div>
        <button className="btn" onClick={() => setEdit({})}>Tambah kata</button>
      </div>
      <Notice msg={msg} />
      <div className="adm-toolbar">
        <input type="search" placeholder="Cari kata, arti, atau definisi…" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Cari kata" />
        <select value={f.category} onChange={(e) => set('category', e.target.value)} aria-label="Kategori"><option value="">Semua kategori</option>{options.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select>
        <select value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)} aria-label="Tingkat kesulitan"><option value="">Semua tingkat</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Tingkat {n}</option>)}</select>
        <select value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="ACTIVE">Aktif</option><option value="ARCHIVED">Diarsipkan</option><option value="DRAFT">Draft</option><option value="all">Semua status</option></select>
      </div>
      {error && <Notice msg={{ type: 'err', text: error }} />}
      {words === null ? <Empty>Memuat…</Empty> : !words.length ? <Empty>Belum ada kata yang cocok.</Empty> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Kata</th><th>Kategori</th><th>Tingkat</th><th>Gambar</th><th>Audio</th><th>Status</th></tr></thead>
          <tbody>{words.map((w) => {
            const imgs = Object.entries(w.assets).filter(([r]) => r !== 'pronunciation');
            return (
              <tr key={w.id} onClick={() => setEdit(w)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setEdit(w); }}>
                <td><b>{w.word}</b><div className="adm-sub">{w.translation || ''}</div></td>
                <td>{w.category.parent ? w.category.parent + ' › ' : ''}{w.category.name}</td>
                <td>{w.difficulty}</td>
                <td>{imgs.length ? imgs.slice(0, 3).map(([r, a]) => <img key={r} className="adm-mini" src={a.url} alt={r} title={r} />) : <Badge tone="warn">belum ada</Badge>}</td>
                <td>{w.assets.pronunciation ? <Badge tone="ok">ada</Badge> : <Badge tone="mute">suara browser</Badge>}</td>
                <td>{w.status === 'ACTIVE' ? 'Aktif' : w.status === 'ARCHIVED' ? 'Arsip' : 'Draft'}</td>
              </tr>);
          })}</tbody>
        </table></div>
      )}
      {edit && <WordEditor word={edit.id ? edit : null} options={options} onClose={() => setEdit(null)} onSaved={(t) => { setMsg({ type: 'ok', text: t }); load(); }} onGone={(t) => { setEdit(null); setMsg({ type: 'ok', text: t }); load(); }} />}
    </div>
  );
}

function WordEditor({ word, options, onClose, onSaved, onGone }) {
  const blank = { word: '', category: options[0] ? options[0][0] : '', partOfSpeech: '', definition: '', example: '', translation: '', plural: '', soundText: '', difficulty: 1, tags: '', syllables: '', status: 'ACTIVE' };
  const from = (w) => ({ word: w.word, category: w.category.slug, partOfSpeech: w.partOfSpeech || '', definition: w.definition || '', example: w.example || '', translation: w.translation || '', plural: w.plural || '', soundText: w.soundText || '', difficulty: w.difficulty, tags: (w.tags || []).join(', '), syllables: w.syllables || '', status: w.status });
  const [cur, setCur] = useState(word);
  const [form, setForm] = useState(word ? from(word) : blank);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const r = cur ? await api('PATCH', '/api/admin/vocab/' + cur.id, form) : await api('POST', '/api/admin/vocab', form);
      setCur(r.word); setForm(from(r.word)); onSaved(cur ? 'Kata disimpan.' : 'Kata ditambahkan. Sekarang kamu bisa menautkan gambar dan audio.');
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const del = async () => {
    if (!confirm('Hapus kata "' + cur.word + '" permanen? Lebih aman diarsipkan.')) return;
    setBusy(true); setErr('');
    try { await api('DELETE', '/api/admin/vocab/' + cur.id); onGone('Kata dihapus.'); } catch (e) { setErr(errText(e)); setBusy(false); }
  };
  return (
    <Modal title={cur ? cur.word : 'Tambah kata'} onClose={onClose} wide>
      {err && <Notice msg={{ type: 'err', text: err }} />}
      <div className="adm-form two">
        <label>Kata (bahasa Inggris)<input value={form.word} onChange={(e) => up('word', e.target.value)} maxLength={60} /></label>
        <label>Kategori<select value={form.category} onChange={(e) => up('category', e.target.value)}>{options.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></label>
        <label>Jenis kata<select value={form.partOfSpeech} onChange={(e) => up('partOfSpeech', e.target.value)}>{POS.map((p) => <option key={p} value={p}>{p || '-'}</option>)}</select></label>
        <label>Tingkat kesulitan<select value={form.difficulty} onChange={(e) => up('difficulty', e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label className="full">Definisi<input value={form.definition} onChange={(e) => up('definition', e.target.value)} maxLength={400} /></label>
        <label className="full">Contoh kalimat<input value={form.example} onChange={(e) => up('example', e.target.value)} maxLength={300} /></label>
        <label>Terjemahan (opsional)<input value={form.translation} onChange={(e) => up('translation', e.target.value)} maxLength={100} /></label>
        <label>Bentuk jamak<input value={form.plural} onChange={(e) => up('plural', e.target.value)} maxLength={60} /></label>
        <label>Bunyi (mis. Woof woof!)<input value={form.soundText} onChange={(e) => up('soundText', e.target.value)} maxLength={60} /></label>
        <label>Jumlah suku kata<input type="number" min="1" max="12" value={form.syllables} onChange={(e) => up('syllables', e.target.value)} /></label>
        <label>Tag (pisahkan dengan koma)<input value={form.tags} onChange={(e) => up('tags', e.target.value)} /></label>
        <label>Status<select value={form.status} onChange={(e) => up('status', e.target.value)}><option value="ACTIVE">Aktif</option><option value="ARCHIVED">Diarsipkan</option><option value="DRAFT">Draft</option></select></label>
      </div>
      <p className="adm-hint">Panjang kata dan huruf pertama diisi otomatis.</p>
      <div className="adm-actions"><button className="btn" disabled={busy} onClick={save}>{cur ? 'Simpan' : 'Tambah kata'}</button>{cur && <button className="btn danger" disabled={busy} onClick={del}>Hapus</button>}<button className="btn alt" onClick={onClose}>Tutup</button></div>
      {cur && <Links word={cur} onChanged={() => onSaved('Gambar/audio diperbarui.')} />}
    </Modal>
  );
}

function Links({ word, onChanged }) {
  const [links, setLinks] = useState(null);
  const [role, setRole] = useState('whole');
  const [custom, setCustom] = useState('');
  const [pick, setPick] = useState(null);
  const [err, setErr] = useState('');
  const realRole = role === 'custom' ? custom : role;
  const kind = realRole === 'pronunciation' ? 'AUDIO' : 'IMAGE';
  useEffect(() => { api('GET', '/api/admin/vocab/' + word.id).then((d) => setLinks(d.links)).catch((e) => setErr(errText(e))); }, [word.id]);
  const run = async (fn) => { setErr(''); try { setLinks((await fn()).links); onChanged(); } catch (e) { setErr(errText(e)); } };
  const add = () => { if (!pick) { setErr('Pilih asset dulu.'); return; } run(() => api('POST', `/api/admin/vocab/${word.id}/assets`, { assetId: pick.id, role: realRole })).then(() => setPick(null)); };
  return (
    <div className="adm-links">
      <h3>Gambar dan audio</h3>
      {err && <Notice msg={{ type: 'err', text: err }} />}
      {links === null ? <Empty>Memuat…</Empty> : !links.length ? <Empty>Belum ada gambar atau audio untuk kata ini.</Empty> : (
        <div className="adm-linklist">{links.map((l) => (
          <div key={l.assetId + l.role} className="adm-link">
            {l.type === 'AUDIO' ? <audio controls preload="none" src={mediaUrl(l)} /> : <img src={mediaUrl(l)} alt={l.name} />}
            <div><b>{l.name}</b><div><Badge>{l.role}</Badge> {l.isPrimary && <Badge tone="ok">utama</Badge>} {l.status !== 'ACTIVE' && <Badge tone="warn">diarsipkan</Badge>}</div></div>
            <div className="adm-linkbtn">
              {!l.isPrimary && <button className="btn sm alt" onClick={() => run(() => api('POST', `/api/admin/vocab/${word.id}/assets`, { assetId: l.assetId, role: l.role, isPrimary: true }))}>Jadikan utama</button>}
              <button className="btn sm alt" onClick={() => run(() => api('DELETE', `/api/admin/vocab/${word.id}/assets`, { assetId: l.assetId, role: l.role }))}>Lepas</button>
            </div>
          </div>))}
        </div>
      )}
      <h3>Tautkan asset</h3>
      <div className="adm-inline">
        <select value={role} onChange={(e) => { setRole(e.target.value); setPick(null); }} aria-label="Peran">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}<option value="custom">lainnya…</option></select>
        {role === 'custom' && <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="nama peran" aria-label="Nama peran" maxLength={30} />}
        <button className="btn sm" onClick={add} disabled={!pick}>Tautkan{pick ? ': ' + pick.name : ''}</button>
      </div>
      <AssetPicker kind={kind} value={pick && pick.id} onPick={setPick} />
    </div>
  );
}

function AssetPicker({ kind, value, onPick }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [list, setList] = useState([]);
  useEffect(() => { api('GET', '/api/assets?' + new URLSearchParams({ q: dq, type: kind, limit: '24', status: 'ACTIVE' })).then((d) => setList(d.assets)).catch(() => setList([])); }, [dq, kind]);
  return (
    <div>
      <input type="search" placeholder={kind === 'AUDIO' ? 'Cari audio…' : 'Cari gambar…'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari asset" />
      <div className="adm-picker">{list.length ? list.map((a) => (
        <button type="button" key={a.id} className={'adm-pick' + (value === a.id ? ' on' : '')} onClick={() => onPick(a)}>
          {a.type === 'AUDIO' ? <span className="adm-audio-ic">audio</span> : <img src={a.url} alt="" loading="lazy" />}<span>{a.name}</span>
        </button>)) : <i>Tidak ada asset.</i>}</div>
    </div>
  );
}
