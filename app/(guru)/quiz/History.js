'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import './quiz.css';
import { api, fmtDate } from './api';

const LABEL = { finished: 'Finished', abandoned: 'Ended early', playing: 'In progress', paused: 'In progress' };

export default function History() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/quiz/sessions').then((d) => setList(d.sessions)).catch((e) => { setErr(e.message); setList([]); }), []);
  useEffect(() => { load(); }, [load]);
  async function del(x) {
    if (!confirm('Delete this result from the history?')) return;
    try { await api('/api/quiz/sessions/' + x.id, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); }
  }
  const score = (x) => x.teams.map((t) => `${t.name} ${t.score}`).join('  –  ');
  const best = (x) => {
    if (x.mode !== 'two' || x.status !== 'finished') return '';
    const [a, b] = x.teams;
    return a.score === b.score ? ' · Tie' : ` · 🏆 ${(a.score > b.score ? a : b).name}`;
  };
  return (
    <div className="qz-wrap">
      <div className="top" style={{ padding: 0, marginBottom: 6 }}><Link className="back" href="/quiz">← My Games</Link></div>
      <div className="qz-head"><h1 className="rise">Game history</h1></div>
      {err && <div className="qz-err" role="alert">{err}</div>}
      {list === null && <p className="qz-muted">Loading…</p>}
      {list && !list.length && !err && <div className="qz-empty"><div style={{ fontSize: 52 }}>📊</div><p>No games played yet. Results will appear here.</p></div>}
      {list && list.map((x) => {
        const live = x.status === 'playing' || x.status === 'paused';
        return (
          <div className="qz-row" key={x.id}>
            <div className="l">
              <b>{x.game_title}</b>
              <div className="qz-muted" style={{ fontSize: 16 }}>{score(x)}{best(x)}</div>
              <div className="qz-muted" style={{ fontSize: 15 }}>{LABEL[x.status]} · {x.mode === 'two' ? 'Two teams' : 'Single team'} · {x.played}/{x.total} played · {fmtDate(x.started_at)}</div>
            </div>
            <div className="qz-bar">
              <Link className={'btn sm' + (live ? ' good' : ' alt')} href={'/quiz/play/' + x.id}>{live ? '▶ Resume' : 'View result'}</Link>
              {!live && <button className="btn sm alt" onClick={() => del(x)} aria-label="Delete this result">🗑</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}