'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errText, kb, useDebounced, Modal, Badge, Notice, Empty, Preview } from './ui';

const GROUPS = { VOCABULARY: 'Vocabulary', CHARACTER: 'Characters', ENVIRONMENT: 'Environments', OBJECT: 'Game objects', AUDIO: 'Audio', ANIMATION: 'Animations', UI: 'UI' };
const ACCEPT = '.svg,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg';
const isAudioName = (n) => /\.(mp3|wav|ogg)$/i.test(n || '');
const niceName = (f) => f.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AssetLibrary({ fixedGroup, heading }) {
  const [f, setF] = useState({ q: '', group: fixedGroup || '', category: '', type: '', status: 'ACTIVE' });
  const dq = useDebounced(f.q);
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState('');
  const [cats, setCats] = useState([]);
  const [view, setView] = useState('grid');
  const [open, setOpen] = useState(null);
  const [upload, setUpload] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: '500', status: f.status || 'all' });
      if (dq) qs.set('q', dq);
      if (f.group) qs.set('group', f.group);
      if (f.category) qs.set('category', f.category);
      if (f.type) qs.set('type', f.type);
      setAssets((await api('GET', '/api/assets?' + qs)).assets);
      setError('');
    } catch (e) { setError(e.status === 503 ? 'Database belum tersambung. Isi DATABASE_URL di Railway Variables.' : errText(e)); setAssets([]); }
  }, [dq, f.group, f.category, f.type, f.status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('GET', '/api/admin/asset-categories').then((d) => setCats(d.categories)).catch(() => {}); }, []);

  const catOptions = cats.filter((c) => !f.group || c.group === f.group);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v, ...(k === 'group' ? { category: '' } : {}) }));
  const changed = (text) => { setMsg({ type: 'ok', text }); load(); };

  return (
    <div>
      <div className="adm-head">
        <div><h1>{heading || 'Asset Library'}</h1><p>Gambar, karakter, latar, objek, audio, dan animasi yang dipakai bersama oleh semua game.</p></div>
        <button className="btn" onClick={() => setUpload(true)}>Upload asset</button>
      </div>
      <Notice msg={msg} />
      <div className="adm-toolbar">
        <input type="search" placeholder="Cari nama, kode, atau tag…" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Cari asset" />
        {!fixedGroup && (
          <select value={f.group} onChange={(e) => set('group', e.target.value)} aria-label="Kelompok">
            <option value="">Semua kelompok</option>
            {Object.entries(GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <select value={f.category} onChange={(e) => set('category', e.target.value)} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {catOptions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={f.type} onChange={(e) => set('type', e.target.value)} aria-label="Tipe">
          <option value="">Semua tipe</option><option value="IMAGE">Gambar</option><option value="AUDIO">Audio</option>
          <option value="SPRITESHEET">Sprite sheet</option><option value="ANIMATION">Animasi</option>
        </select>
        <select value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
          <option value="ACTIVE">Aktif</option><option value="ARCHIVED">Diarsipkan</option><option value="DRAFT">Draft</option><option value="all">Semua status</option>
        </select>
        <div className="adm-seg" role="group" aria-label="Tampilan">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>Grid</button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>List</button>
        </div>
      </div>
      {error && <Notice msg={{ type: 'err', text: error }} />}
      {assets === null ? <Empty>Memuat…</Empty> : !assets.length ? <Empty>Tidak ada asset yang cocok.</Empty> : view === 'grid' ? (
        <div className="adm-grid">
          {assets.map((a) => (
            <button key={a.id} className="adm-asset" onClick={() => setOpen(a.id)} aria-label={'Buka ' + a.name}>
              <div className="adm-prev">{a.type === 'AUDIO' ? <span className="adm-audio-ic">audio</span> : <img src={a.url} alt="" loading="lazy" />}</div>
              <div className="adm-asset-t">{a.name}</div>
              <div className="adm-asset-m">{a.category && a.category.name}{a.variant ? ' · ' + a.variant : ''}</div>
              <div className="adm-asset-b">
                {a.status !== 'ACTIVE' && <Badge tone="warn">{a.status === 'ARCHIVED' ? 'Arsip' : 'Draft'}</Badge>}
                {a.source === 'SEED' && <Badge tone="mute">Bawaan</Badge>}
                <Badge tone="mute">{a.format}</Badge>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th></th><th>Nama</th><th>Kode</th><th>Kategori</th><th>Varian</th><th>Format</th><th>Ukuran</th><th>Status</th></tr></thead>
          <tbody>{assets.map((a) => (
            <tr key={a.id} onClick={() => setOpen(a.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(a.id); }}>
              <td className="adm-thumb">{a.type === 'AUDIO' ? 'audio' : <img src={a.url} alt="" loading="lazy" />}</td>
              <td>{a.name}</td><td className="mono">{a.slug}</td><td>{a.category && a.category.name}</td><td>{a.variant || '-'}</td><td>{a.format}</td>
              <td>{kb(a.sizeBytes)}</td><td>{a.status === 'ACTIVE' ? 'Aktif' : a.status === 'ARCHIVED' ? 'Arsip' : 'Draft'}</td>
            </tr>))}</tbody>
        </table></div>
      )}
      {open && <AssetDetail id={open} cats={cats} onClose={() => setOpen(null)} onChanged={changed} />}
      {upload && <UploadModal cats={cats} fixedGroup={fixedGroup} onClose={() => setUpload(false)} onDone={(a) => { setUpload(false); changed('Asset "' + a.name + '" berhasil diunggah.'); }} />}
    </div>
  );
}

function AssetDetail({ id, cats, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const fill = (a) => setForm({ name: a.name, category: a.category.slug, variant: a.variant || '', tags: (a.tags || []).join(', '), status: a.status, inlineRig: a.inlineRig, frames: a.frames || '' });
  const reload = useCallback(async () => { const a = (await api('GET', '/api/admin/assets/' + id)).asset; setD(a); fill(a); }, [id]);
  useEffect(() => { reload().catch((e) => setErr(errText(e))); }, [reload]);
  const run = async (fn, okText) => { setBusy(true); setErr(''); try { await fn(); if (okText) onChanged(okText); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } };

  if (!d || !form) return <Modal title="Detail asset" onClose={onClose} wide>{err ? <Notice msg={{ type: 'err', text: err }} /> : <Empty>Memuat…</Empty>}</Modal>;
  const opts = cats.filter((c) => (d.type === 'AUDIO') === (c.group === 'AUDIO'));
  const up = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  const save = () => run(async () => { await api('PATCH', '/api/admin/assets/' + d.id, { name: form.name, category: form.category, variant: form.variant || null, tags: form.tags, status: form.status, inlineRig: form.inlineRig, frames: form.frames === '' ? null : form.frames }); await reload(); }, 'Perubahan disimpan.');
  const replace = (file) => run(async () => { const fd = new FormData(); fd.append('file', file); await api('POST', `/api/admin/assets/${d.id}/replace`, fd); await reload(); }, 'File diganti. Semua kaitan ke kata dan game tetap utuh.');
  const toggle = () => run(async () => { await api('PATCH', '/api/admin/assets/' + d.id, { status: d.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' }); await reload(); }, d.status === 'ARCHIVED' ? 'Asset diaktifkan kembali.' : 'Asset diarsipkan. Guru tidak lagi melihatnya.');
  const del = () => { if (!confirm('Hapus "' + d.name + '" secara permanen? Ini tidak bisa dibatalkan.')) return; run(async () => { await api('DELETE', '/api/admin/assets/' + d.id); onClose(); }, 'Asset dihapus.'); };

  return (
    <Modal title={d.name} onClose={onClose} wide>
      <div className="adm-split">
        <div>
          <div className="adm-prev big"><Preview a={d} big /></div>
          <div className="adm-facts">
            <div><span>Kode</span><b className="mono">{d.slug}</b></div>
            <div><span>File</span><b className="mono">{d.filePath}</b></div>
            <div><span>Format / ukuran</span><b>{d.format} · {kb(d.sizeBytes)}</b></div>
            {d.width && <div><span>Dimensi</span><b>{d.width} × {d.height}</b></div>}
            {d.durationMs != null && <div><span>Durasi</span><b>{(d.durationMs / 1000).toFixed(1)} dtk</b></div>}
            <div><span>Versi</span><b>{d.version}{d.source === 'SEED' ? ' · bawaan' : ''}</b></div>
            <div><span>SHA-256</span><b className="mono">{d.sha256.slice(0, 16)}…</b></div>
          </div>
        </div>
        <div>
          {err && <Notice msg={{ type: 'err', text: err }} />}
          <div className="adm-form">
            <label>Nama<input value={form.name} onChange={(e) => up('name', e.target.value)} maxLength={80} /></label>
            <label>Kategori<select value={form.category} onChange={(e) => up('category', e.target.value)}>{opts.map((c) => <option key={c.slug} value={c.slug}>{GROUPS[c.group]} › {c.name}</option>)}</select></label>
            <label>Varian<input value={form.variant} onChange={(e) => up('variant', e.target.value)} placeholder="whole, sliced, character, idle…" /></label>
            <label>Tag (pisahkan dengan koma)<input value={form.tags} onChange={(e) => up('tags', e.target.value)} /></label>
            <label>Status<select value={form.status} onChange={(e) => up('status', e.target.value)}><option value="ACTIVE">Aktif</option><option value="ARCHIVED">Diarsipkan</option><option value="DRAFT">Draft</option></select></label>
            {d.type === 'SPRITESHEET' && <label>Jumlah frame<input type="number" min="1" value={form.frames} onChange={(e) => up('frames', e.target.value)} /></label>}
            {d.format === 'svg' && <label className="adm-check"><input type="checkbox" checked={form.inlineRig} onChange={(e) => up('inlineRig', e.target.checked)} /> SVG beranimasi (game menggerakkan bagian di dalamnya)</label>}
          </div>
          <div className="adm-actions">
            <button className="btn" disabled={busy} onClick={save}>Simpan</button>
            <button className="btn alt" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>Ganti file</button>
            <input ref={fileRef} type="file" hidden accept={ACCEPT} onChange={(e) => { const x = e.target.files[0]; e.target.value = ''; if (x) replace(x); }} />
            <button className="btn alt" disabled={busy} onClick={toggle}>{d.status === 'ARCHIVED' ? 'Aktifkan' : 'Arsipkan'}</button>
            <button className="btn danger" disabled={busy || d.source === 'SEED'} onClick={del} title={d.source === 'SEED' ? 'Asset bawaan hanya bisa diarsipkan' : ''}>Hapus</button>
          </div>
          <h3>Dipakai oleh</h3>
          <div className="adm-use">
            <div><b>Game</b>{d.usage.length ? d.usage.map((u, i) => <span key={i} className="chip">{u.game} · {u.role}</span>) : <i>belum ada</i>}</div>
            <div><b>Kosakata</b>{d.vocabulary.length ? d.vocabulary.map((v, i) => <span key={i} className="chip">{v.word} · {v.role}{v.isPrimary ? ' (utama)' : ''}</span>) : <i>belum ada</i>}</div>
            {d.duplicates.length > 0 && <div><b>Isi sama persis dengan</b>{d.duplicates.map((x) => <span key={x.slug} className="chip warn">{x.name}</span>)}</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function UploadModal({ cats, fixedGroup, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [v, setV] = useState({ name: '', category: '', variant: '', tags: '', inlineRig: false, frames: '' });
  const [err, setErr] = useState('');
  const [dup, setDup] = useState(null);
  const [busy, setBusy] = useState(false);
  const audio = isAudioName(file && file.name);
  const opts = cats.filter((c) => (!fixedGroup || c.group === fixedGroup) && (file ? audio === (c.group === 'AUDIO') : true));
  const cat = opts.find((c) => c.slug === v.category) || opts[0];
  const up = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const isSvg = file && /\.svg$/i.test(file.name);
  const submit = async (allowDuplicate) => {
    if (!file) { setErr('Pilih file dulu.'); return; }
    setBusy(true); setErr(''); setDup(null);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('name', v.name || niceName(file.name)); fd.append('category', cat ? cat.slug : '');
      fd.append('variant', v.variant); fd.append('tags', v.tags); fd.append('inlineRig', String(v.inlineRig));
      if (cat && cat.group === 'ANIMATION' && v.frames) fd.append('frames', v.frames);
      if (allowDuplicate) fd.append('allowDuplicate', 'true');
      onDone((await api('POST', '/api/admin/assets', fd)).asset);
    } catch (e) { if (e.status === 409 && e.data && e.data.duplicates) setDup(e.data.duplicates); else setErr(errText(e)); }
    finally { setBusy(false); }
  };
  return (
    <Modal title="Upload asset" onClose={onClose}>
      {err && <Notice msg={{ type: 'err', text: err }} />}
      {dup && (
        <div className="adm-notice warn" role="alert">
          File ini sama persis dengan asset yang sudah ada: <b>{dup.join(', ')}</b>. Sebaiknya pakai yang sudah ada.
          <div className="adm-actions"><button className="btn alt" onClick={() => submit(true)}>Unggah tetap</button><button className="btn alt" onClick={() => setDup(null)}>Batal</button></div>
        </div>
      )}
      <div className="adm-form">
        <label>File (svg, png, jpg, gif, webp, mp3, wav, ogg · gambar maks 2 MB, audio maks 5 MB)
          <input type="file" accept={ACCEPT} onChange={(e) => { const x = e.target.files[0] || null; setFile(x); if (x && !v.name) up('name', niceName(x.name)); }} />
        </label>
        <label>Nama<input value={v.name} onChange={(e) => up('name', e.target.value)} maxLength={80} /></label>
        <label>Kategori<select value={cat ? cat.slug : ''} onChange={(e) => up('category', e.target.value)}>{opts.map((c) => <option key={c.slug} value={c.slug}>{GROUPS[c.group]} › {c.name}</option>)}</select></label>
        <label>Varian (opsional)<input value={v.variant} onChange={(e) => up('variant', e.target.value)} placeholder="whole, sliced, character, idle…" /></label>
        <label>Tag (pisahkan dengan koma)<input value={v.tags} onChange={(e) => up('tags', e.target.value)} /></label>
        {cat && cat.group === 'ANIMATION' && <label>Jumlah frame (sprite sheet)<input type="number" min="1" value={v.frames} onChange={(e) => up('frames', e.target.value)} /></label>}
        {isSvg && <label className="adm-check"><input type="checkbox" checked={v.inlineRig} onChange={(e) => up('inlineRig', e.target.checked)} /> SVG beranimasi (game menggerakkan bagian di dalamnya)</label>}
      </div>
      <div className="adm-actions"><button className="btn" disabled={busy} onClick={() => submit(false)}>{busy ? 'Mengunggah…' : 'Unggah'}</button><button className="btn alt" onClick={onClose}>Batal</button></div>
      <p className="adm-hint">SVG diperiksa otomatis: skrip, tautan luar, dan elemen berbahaya akan ditolak.</p>
    </Modal>
  );
}
