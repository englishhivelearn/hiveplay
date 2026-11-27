'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './quiz.css';
import { api, fmtDate } from './api';

function Modal({ onClose, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return <div className="qz-modal" role="dialog" aria-modal="true" onClick={onClose}><div className="qz-sheet" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
}

function StartModal({ game, onClose }) {
  const router = useRouter();
  const [mode, setMode] = useState('single');
  const [names, setNames] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (i, v) => setNames((n) => n.map((x, j) => (j === i ? v : x)));
  async function go() {
    setBusy(true); setErr('');
    try {
      const teams = mode === 'two' ? [names[0], names[1]] : [names[0]];
      const d = await api('/api/quiz/sessions', { method: 'POST', body: { gameId: game.id, mode, teams } });
      router.push('/quiz/play/' + d.id);
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal onClose={onClose}>
      <h2>Start “{game.title}”</h2>
      <p className="qz-muted" style={{ margin: 0 }}>{game.questions} questions · {game.total_points} points in total</p>
      <div className="qz-seg" role="group" aria-label="Game mode">
        <button type="button" className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>👤 Single Team</button>
        <button type="button" className={mode === 'two' ? 'on' : ''} onClick={() => setMode('two')}>👥 Two Teams</button>
      </div>
      <label className="qz-lbl" htmlFor="t0">{mode === 'two' ? 'Team 1 name' : 'Team name'}</label>
      <input id="t0" className="qz-in" maxLength={40} placeholder={mode === 'two' ? 'Team 1' : 'Our Team'} value={names[0]} onChange={(e) => set(0, e.target.value)} />
      {mode === 'two' && <>
        <label className="qz-lbl" htmlFor="t1">Team 2 name</label>
        <input id="t1" className="qz-in" maxLength={40} placeholder="Team 2" value={names[1]} onChange={(e) => set(1, e.target.value)} />
      </>}
      {err && <div className="qz-err" role="alert">{err}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn alt" onClick={onClose}>Cancel</button>
        <button className="btn" disabled={busy} onClick={go}>{busy ? 'Starting…' : 'Start game'}</button>
      </div>
    </Modal>
  );
}

function KeyModal({ onClose, onLinked }) {
  const [key, setKey] = useState('');
  const [other, setOther] = useState('');
  const [msg, setMsg] = useState({ t: '', ok: false });
  const [copied, setCopied] = useState(false);
  useEffect(() => { api('/api/quiz/owner').then((d) => setKey(d.key)).catch((e) => setMsg({ t: e.message })); }, []);
  async function link() {
    try {
      await api('/api/quiz/owner', { method: 'POST', body: { key: other } });
      setMsg({ t: 'Linked! This device now shows the games from that key.', ok: true });
      onLinked();
    } catch (e) { setMsg({ t: e.message, ok: false }); }
  }
  async function copy() { try { await navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} }
  return (
    <Modal onClose={onClose}>
      <h2>Use your games on another device</h2>
      <p className="qz-muted" style={{ marginTop: 0 }}>Your games belong to this browser. To open them on a phone or another computer, copy this key and paste it there. Keep it private: anyone with the key can edit your games.</p>
      <label className="qz-lbl">Your key</label>
      <div className="qz-key">{key || '…'}</div>
      <div className="row" style={{ justifyContent: 'flex-start', marginTop: 8 }}><button className="btn sm alt" onClick={copy} disabled={!key}>{copied ? 'Copied ✓' : 'Copy key'}</button></div>
      <label className="qz-lbl" htmlFor="ok">Have a key from another device?</label>
      <input id="ok" className="qz-in" placeholder="Paste the key here" value={other} onChange={(e) => setOther(e.target.value)} autoComplete="off" />
      <p className="qz-muted" style={{ fontSize: 15, margin: '6px 0 0' }}>This replaces the games shown on this device with the ones from that key. Save your own key above first if you want to come back.</p>
      {msg.t && <div className={msg.ok ? 'qz-ok' : 'qz-err'} role="alert">{msg.t}</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn alt" onClick={onClose}>Close</button>
        <button className="btn" onClick={link} disabled={!other.trim()}>Use this key</button>
      </div>
    </Modal>
  );
}

export default function MyGames() {
  const router = useRouter();
  const [games, setGames] = useState(null);
  const [err, setErr] = useState('');
  const [start, setStart] = useState(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api('/api/quiz/games').then((d) => setGames(d.games)).catch((e) => { setErr(e.message); setGames([]); }), []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setErr('');
    try { const d = await api('/api/quiz/games', { method: 'POST', body: { title: 'Untitled game' } }); router.push('/quiz/' + d.id); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  async function del(g) {
    if (!confirm(`Delete “${g.title}” and its questions? Past results stay in the history.`)) return;
    try { await api('/api/quiz/games/' + g.id, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <div className="qz-wrap">
      <div className="top" style={{ padding: 0, marginBottom: 6 }}><Link className="back" href="/">← Back to games</Link></div>
      <div className="qz-head">
        <h1 className="rise">My Quiz Games</h1>
        <div className="qz-bar">
          <Link className="btn alt" href="/quiz/history">📊 History</Link>
          <button className="btn alt" onClick={() => setKeyOpen(true)}>🔑 Device key</button>
          <button className="btn" onClick={create} disabled={busy}>＋ New game</button>
        </div>
      </div>
      <p className="sub rise" style={{ '--i': 1, marginBottom: 18 }}>Build a board of questions, give each one its own points, then play with one or two teams on the big screen.</p>
      {err && <div className="qz-err" role="alert">{err}</div>}
      {games === null && <p className="qz-muted">Loading your games…</p>}
      {games && !games.length && !err && <div className="qz-empty"><div style={{ fontSize: 56 }}>🧩</div><h3 style={{ margin: '6px 0' }}>No games yet</h3><p style={{ margin: '0 0 14px' }}>Create your first quiz board. You decide every question, answer and point value.</p><button className="btn" onClick={create} disabled={busy}>＋ Create a game</button></div>}
      {games && games.length > 0 && (
        <div className="qz-games">
          {games.map((g, i) => (
            <div className="qz-game" key={g.id} style={{ '--i': i }}>
              <span className={'qz-pill' + (g.status === 'draft' ? ' draft' : '')}>{g.status === 'draft' ? 'Draft' : 'Ready'}</span>
              <h3>{g.title}</h3>
              <div className="qz-muted">{g.questions} question{g.questions === 1 ? '' : 's'} · {g.total_points} points</div>
              <div className="qz-muted" style={{ fontSize: 15 }}>Played {g.plays}× · edited {fmtDate(g.updated_at)}</div>
              <div className="acts">
                {g.active_session && <Link className="btn sm good" href={'/quiz/play/' + g.active_session}>▶ Resume game</Link>}
                {g.status === 'ready' && g.questions > 0
                  ? <button className="btn sm" onClick={() => setStart(g)}>{g.active_session ? 'New game' : '▶ Play'}</button>
                  : <span className="qz-muted" style={{ fontSize: 15, alignSelf: 'center' }}>Mark Ready to play</span>}
                <Link className="btn sm alt" href={'/quiz/' + g.id}>✏️ Edit</Link>
                <button className="btn sm alt" onClick={() => del(g)} aria-label={'Delete ' + g.title}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {start && <StartModal game={start} onClose={() => setStart(null)} />}
      {keyOpen && <KeyModal onClose={() => setKeyOpen(false)} onLinked={load} />}
    </div>
  );
}