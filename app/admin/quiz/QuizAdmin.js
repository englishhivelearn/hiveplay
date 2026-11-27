'use client';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import './quiz-admin.css';

async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  let d = {};
  try { d = await r.json(); } catch {}
  if (r.status === 401) { location.href = '/admin'; throw new Error('Please sign in again.'); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}
const bytes = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const when = (d) => d ? new Date(d).toLocaleDateString([], { dateStyle: 'medium' }) : '—';
const DAY = 86400000;
const FILTERS = [
  ['all', 'All games'], ['drafts', 'Drafts only'], ['empty', 'Empty (no questions)'], ['never', 'Never played'],
  ['stale', 'Not edited for 90+ days'], ['images', 'With images'],
];
const SORTS = [['size', 'Largest first'], ['oldest', 'Least recently edited'], ['newest', 'Newest edited'], ['title', 'Title A–Z']];

export default function QuizAdmin() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('size');
  const [sel, setSel] = useState(new Set());
  const [withSessions, setWithSessions] = useState(true);
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState({});
  const [days, setDays] = useState(90);
  const [scope, setScope] = useState('all');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/api/admin/quiz').then(setData).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!data) return [];
    const now = Date.now(), s = q.trim().toLowerCase();
    const f = {
      all: () => true, drafts: (g) => g.status === 'draft', empty: (g) => g.questions === 0, never: (g) => g.sessions === 0,
      stale: (g) => now - new Date(g.updated_at).getTime() > 90 * DAY, images: (g) => g.images > 0,
    }[filter];
    const list = data.games.filter((g) => f(g) && (!s || g.title.toLowerCase().includes(s) || g.owner.includes(s)));
    const by = {
      size: (a, b) => (b.bytes + b.session_bytes) - (a.bytes + a.session_bytes),
      oldest: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
      newest: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
      title: (a, b) => a.title.localeCompare(b.title),
    }[sort];
    return list.sort(by);
  }, [data, q, filter, sort]);

  const chosen = rows.filter((g) => sel.has(g.id));
  const chosenBytes = chosen.reduce((n, g) => n + g.bytes + (withSessions ? g.session_bytes : 0), 0);
  const allOn = rows.length > 0 && rows.every((g) => sel.has(g.id));
  const toggle = (id) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((g) => g.id)));

  async function remove(ids, label) {
    if (!confirm(`Delete ${label}?${withSessions ? ' Their play history will be deleted too.' : ' Their play history stays.'}\n\nThis cannot be undone.`)) return;
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await api('/api/admin/quiz/delete', { ids, withSessions });
      setOk(`Deleted ${r.games} game${r.games === 1 ? '' : 's'}${withSessions ? ` and ${r.sessions} played session${r.sessions === 1 ? '' : 's'}` : ''}.`);
      setSel(new Set()); setOpen(null); await load();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function view(id) {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!detail[id]) { try { const d = await api('/api/admin/quiz/games/' + id); setDetail((p) => ({ ...p, [id]: d.game })); } catch (e) { setErr(e.message); } }
  }
  async function cleanup(dryRun) {
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await api('/api/admin/quiz/cleanup', { days, scope, dryRun });
      if (dryRun) setPreview(r);
      else { setOk(`Deleted ${r.sessions} finished session${r.sessions === 1 ? '' : 's'}.`); setPreview(null); await load(); }
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (!data) return <div><div className="adm-head"><div><h1>Quiz games</h1></div></div>{err ? <div className="adm-notice err" role="alert">{err}</div> : <p>Loading…</p>}</div>;
  const s = data.stats;
  return (
    <div>
      <div className="adm-head"><div><h1>Quiz games</h1><p>Every game created by teachers. Check what uses the most storage and delete what is no longer needed. Teachers are identified only by a short device code.</p></div></div>
      {ok && <div className="adm-notice ok" role="status">{ok}</div>}
      {err && <div className="adm-notice err" role="alert">{err}</div>}

      <div className="qa-stats">
        <div className="qa-stat"><b>{s.games}</b><span>Games</span></div>
        <div className="qa-stat"><b>{s.owners}</b><span>Teacher devices</span></div>
        <div className="qa-stat"><b>{s.questions}</b><span>Questions</span></div>
        <div className="qa-stat"><b>{s.sessions}</b><span>Played sessions</span></div>
        <div className="qa-stat"><b>{bytes(s.db_bytes)}</b><span>Quiz storage in the database</span></div>
        <div className="qa-stat"><b>{s.orphan_sessions}</b><span>History of deleted games ({bytes(s.orphan_bytes)})</span></div>
      </div>

      <div className="qa-tools">
        <input type="search" placeholder="Search by title or device code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search games" />
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setSel(new Set()); }} aria-label="Filter">{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <span className="qa-mono">{rows.length} shown</span>
      </div>

      {chosen.length > 0 && (
        <div className="qa-bulk" role="region" aria-label="Bulk delete">
          <b>{chosen.length} selected · frees about {bytes(chosenBytes)}</b>
          <label><input type="checkbox" checked={withSessions} onChange={(e) => setWithSessions(e.target.checked)} /> Also delete their play history</label>
          <button className="btn" disabled={busy} onClick={() => remove(chosen.map((g) => g.id), `${chosen.length} selected game${chosen.length === 1 ? '' : 's'}`)}>🗑 Delete selected</button>
        </div>
      )}

      <div className="qa-wrap">
        <table className="qa-table">
          <thead><tr>
            <th><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all shown" /></th>
            <th>Game</th><th>Device</th><th className="n">Questions</th><th className="n">Size</th><th className="n">Played</th><th>Last played</th><th>Edited</th><th></th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }}>No games match.</td></tr>}
            {rows.map((g) => {
              const size = g.bytes + g.session_bytes, big = size > 1048576;
              return (
                <Fragment key={g.id}>
                  <tr>
                    <td><input type="checkbox" checked={sel.has(g.id)} onChange={() => toggle(g.id)} aria-label={'Select ' + g.title} /></td>
                    <td className="t">{g.title}<span className={'qa-pill' + (g.status === 'ready' ? ' ready' : '')}>{g.status}</span></td>
                    <td className="qa-mono">{g.owner}</td>
                    <td className="n">{g.questions}{g.images ? ` (${g.images} 🖼)` : ''}</td>
                    <td className={'n' + (big ? ' qa-big' : '')} title={`Game ${bytes(g.bytes)} · history ${bytes(g.session_bytes)}`}>{bytes(size)}</td>
                    <td className="n">{g.sessions}</td>
                    <td>{when(g.last_played)}</td>
                    <td>{when(g.updated_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn sm alt" onClick={() => view(g.id)}>{open === g.id ? 'Hide' : 'View'}</button>{' '}
                      <button className="btn sm alt" disabled={busy} onClick={() => remove([g.id], `“${g.title}”`)} aria-label={'Delete ' + g.title}>🗑</button>
                    </td>
                  </tr>
                  {open === g.id && (
                    <tr className="qa-detail"><td></td><td colSpan={8}>
                      {!detail[g.id] ? 'Loading…' : detail[g.id].questions.length === 0 ? <i>No questions.</i> : (
                        <ol>{detail[g.id].questions.map((x) => <li key={x.n}>{x.question} <b>→ {x.answer}</b> · {x.points} pts{x.has_image ? ` · 🖼 ${bytes(x.image_bytes)}` : ''}</li>)}</ol>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-card" style={{ marginTop: 20 }}>
        <h3 style={{ margin: '0 0 6px' }}>Clean up old play history</h3>
        <p style={{ margin: '0 0 10px' }} className="qa-mono">Removes finished or ended-early sessions only. Games in progress are never touched.</p>
        <div className="qa-days">
          <span>Older than</span>
          <input type="number" min="0" max="3650" value={days} onChange={(e) => { setDays(e.target.value); setPreview(null); }} aria-label="Days" />
          <span>days</span>
          <select value={scope} onChange={(e) => { setScope(e.target.value); setPreview(null); }} aria-label="Scope">
            <option value="all">All games</option><option value="orphans">Only from games that were deleted</option>
          </select>
          <button className="btn alt" disabled={busy} onClick={() => cleanup(true)}>Preview</button>
          {preview && <>
            <b>{preview.sessions} session{preview.sessions === 1 ? '' : 's'} · about {bytes(preview.bytes)}</b>
            {preview.sessions > 0 && <button className="btn" disabled={busy} onClick={() => confirm(`Delete ${preview.sessions} finished sessions? This cannot be undone.`) && cleanup(false)}>🗑 Delete them</button>}
          </>}
        </div>
      </div>
    </div>
  );
}