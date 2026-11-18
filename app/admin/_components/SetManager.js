'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, errText, Modal, Badge, Notice, Empty } from './ui';

const LEVELS = ['', 'Todler', 'TK', 'SD', 'SMP', 'SMA'];

export default function SetManager() {
  const [sets, setSets] = useState(null);
  const [words, setWords] = useState([]);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    try { setSets((await api('GET', '/api/admin/sets')).sets); }
    catch (e) { setSets([]); setMsg({ type: 'err', text: e.status === 503 ? 'Database belum tersambung. Isi DATABASE_URL di Railway Variables.' : errText(e) }); }
  }, []);
  useEffect(() => { load(); api('GET', '/api/vocab?status=ACTIVE&limit=500').then((d) => setWords(d.words)).catch(() => {}); }, [load]);
  return (
    <div>
      <div className="adm-head"><div><h1>Vocabulary Sets</h1><p>Kumpulan kata yang dipilih guru di dalam game. Set yang belum dipublikasikan tidak terlihat oleh guru.</p></div>
        <button className="btn" onClick={() => setEdit({})}>Buat set</button></div>
      <Notice msg={msg} />
      {sets === null ? <Empty>Memuat…</Empty> : !sets.length ? <Empty>Belum ada set.</Empty> : (
        <div className="adm-cards">{sets.map((s) => (
          <button key={s.id} className="adm-card adm-setcard" onClick={() => setEdit(s)}>
            <h3>{s.name}</h3>
            <div>{s.level && <Badge>{s.level}</Badge>} <Badge tone={s.published ? 'ok' : 'warn'}>{s.published ? 'Dipublikasikan' : 'Draft'}</Badge> <Badge tone="mute">{s.words.length} kata</Badge></div>
            <p>{s.description || ''}</p>
            <div className="adm-sub">{s.words.slice(0, 8).map((w) => w.word).join(', ')}{s.words.length > 8 ? '…' : ''}</div>
          </button>))}
        </div>
      )}
      {edit && <SetEditor set={edit.id ? edit : null} words={words} onClose={() => setEdit(null)} onDone={(t) => { setEdit(null); setMsg({ type: 'ok', text: t }); load(); }} />}
    </div>
  );
}

function SetEditor({ set, words, onClose, onDone }) {
  const [f, setF] = useState({ name: set ? set.name : '', description: set ? set.description || '' : '', level: set ? set.level || '' : '', published: set ? set.published : false });
  const [list, setList] = useState(set ? set.words.map((w) => ({ id: w.id, word: w.word + (w.status !== 'ACTIVE' ? ' (diarsipkan)' : '') })) : []);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const up = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const inSet = new Set(list.map((w) => w.id));
  const avail = words.filter((w) => !inSet.has(w.id) && (!q || w.word.toLowerCase().includes(q.toLowerCase())));
  const move = (i, d) => setList((l) => { const n = l.slice(); const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const payload = { ...f, words: list.map((w) => w.id) };
      if (set) await api('PATCH', '/api/admin/sets/' + set.id, payload); else await api('POST', '/api/admin/sets', payload);
      onDone(set ? 'Set disimpan.' : 'Set dibuat.');
    } catch (e) { setErr(errText(e)); setBusy(false); }
  };
  const del = async () => {
    if (!confirm('Hapus set "' + set.name + '"? Kata-katanya tidak ikut terhapus.')) return;
    setBusy(true);
    try { await api('DELETE', '/api/admin/sets/' + set.id); onDone('Set dihapus.'); } catch (e) { setErr(errText(e)); setBusy(false); }
  };
  return (
    <Modal title={set ? set.name : 'Buat set kosakata'} onClose={onClose} wide>
      {err && <Notice msg={{ type: 'err', text: err }} />}
      <div className="adm-form two">
        <label>Nama set<input value={f.name} onChange={(e) => up('name', e.target.value)} maxLength={80} /></label>
        <label>Jenjang<select value={f.level} onChange={(e) => up('level', e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l || '-'}</option>)}</select></label>
        <label className="full">Deskripsi<input value={f.description} onChange={(e) => up('description', e.target.value)} maxLength={300} /></label>
        <label className="adm-check full"><input type="checkbox" checked={f.published} onChange={(e) => up('published', e.target.checked)} /> Dipublikasikan (terlihat oleh guru)</label>
      </div>
      <div className="adm-split">
        <div><h3>Kata di dalam set ({list.length})</h3>
          {!list.length ? <Empty>Belum ada kata.</Empty> : <ol className="adm-order">{list.map((w, i) => (
            <li key={w.id}><span>{w.word}</span><span className="adm-linkbtn">
              <button className="btn sm alt" onClick={() => move(i, -1)} aria-label="Naikkan" disabled={i === 0}>↑</button>
              <button className="btn sm alt" onClick={() => move(i, 1)} aria-label="Turunkan" disabled={i === list.length - 1}>↓</button>
              <button className="btn sm alt" onClick={() => setList((l) => l.filter((x) => x.id !== w.id))}>Keluarkan</button></span></li>))}</ol>}
        </div>
        <div><h3>Tambahkan kata</h3>
          <input type="search" placeholder="Cari kata…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kata" />
          <div className="adm-avail">{avail.length ? avail.slice(0, 60).map((w) => <button key={w.id} className="chip btnchip" onClick={() => setList((l) => [...l, { id: w.id, word: w.word }])}>+ {w.word}</button>) : <i>Tidak ada kata lain.</i>}</div>
        </div>
      </div>
      <div className="adm-actions"><button className="btn" disabled={busy} onClick={save}>{set ? 'Simpan' : 'Buat set'}</button>{set && <button className="btn danger" disabled={busy} onClick={del}>Hapus set</button>}<button className="btn alt" onClick={onClose}>Tutup</button></div>
    </Modal>
  );
}
