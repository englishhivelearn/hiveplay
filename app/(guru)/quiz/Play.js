'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './quiz.css';
import { api, sfx } from './api';
import Result from './Result';

const COLS = ['#8b7bff', '#ff7ab6', '#f59a3c', '#2bb8a0', '#4c9be8', '#e0558f'];

function useCount(v) {
  const [n, setN] = useState(v);
  const shown = useRef(v);
  useEffect(() => {
    const from = shown.current, to = v;
    if (from === to) return;
    const t0 = performance.now(), dur = 700;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      shown.current = Math.round(from + (to - from) * e); setN(shown.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return n;
}

function Team({ t, i, two, turn, onPick }) {
  const n = useCount(t.score);
  const active = two && turn === i;
  const cls = `qz-team ${two ? 't' + i : 'solo'}${active ? ' turn' : ''}${two && !active ? ' dim' : ''}`;
  const inner = <>
    {active && <span className="tn">▶ TURN</span>}
    <div className="nm">{t.name}</div>
    <div className="sc" aria-label={t.score + ' points'}>{n}</div>
    <div className="st">✓ {t.correct} correct · ✗ {t.wrong} wrong</div>
  </>;
  return two
    ? <button className={cls} onClick={onPick} aria-pressed={active} aria-label={`Give the turn to ${t.name}`}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

function Stage({ s, q, busy, onReveal, onJudge, onClose, onTurn }) {
  const two = s.mode === 'two';
  return (
    <div className="qz-stage" role="dialog" aria-modal="true" aria-label={'Question ' + q.n}>
      <div className="qz-card">
        <div className="qz-meta">
          <span className="qz-chip">Question {q.n}</span>
          <span className="qz-chip gold">{q.points} points</span>
        </div>
        {two && (
          <div className="qz-turnrow">Answering:
            {s.teams.map((t, i) => <button key={i} className={s.turn === i ? 'on' : ''} disabled={busy} onClick={() => onTurn(i)}>{t.name}</button>)}
          </div>
        )}
        <div className="qz-text">{q.question}</div>
        {q.image && <img className="qimg" src={q.image} alt="" />}
        {q.answer != null
          ? <div className="qz-answer"><small>Answer</small><b>{q.answer}</b></div>
          : <button className="btn" style={{ fontSize: 'clamp(20px,2.4vw,30px)' }} disabled={busy} onClick={onReveal}>👁 Show answer</button>}
        <div className="qz-judge">
          <button className="btn good" disabled={busy} onClick={() => onJudge(true)}>✓ Correct · +{q.points}</button>
          <button className="btn bad" disabled={busy} onClick={() => onJudge(false)}>✗ Incorrect · 0</button>
        </div>
        <div className="row"><button className="btn sm alt" disabled={busy} onClick={onClose}>← Back to board (not scored)</button></div>
      </div>
    </div>
  );
}

export default function Play({ id }) {
  const router = useRouter();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const busyRef = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    let off = false;
    setS(null); setErr('');
    api('/api/quiz/sessions/' + id).then((d) => { if (!off) setS(d.session); }).catch((e) => { if (!off) setErr(e.message); });
    return () => { off = true; };
  }, [id]);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function act(action, extra) {
    if (busyRef.current) return null;
    busyRef.current = true; setBusy(true); setErr('');
    try {
      const d = await api('/api/quiz/sessions/' + id, { method: 'POST', body: { action, ...extra } });
      if (d.id) { router.push('/quiz/play/' + d.id); return null; }
      setS(d.session); return d.session;
    } catch (e) { setErr(e.message); return null; }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function judge(ok) {
    const idx = s.openQ;
    const ns = await act('judge', { correct: ok });
    if (!ns) return;
    const r = ns.played[String(idx)];
    sfx(ok ? 'ok' : 'no');
    setFlash({ ok, pts: r ? r.points : 0 });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 1400);
  }
  const restart = () => { if (confirm('Restart? This ends the current game and starts a new one from 0 points.')) act('restart'); };
  const finish = () => { if (confirm('Finish the game now and see the results?')) act('finish'); };

  if (!s) return (
    <div className="qz-wrap">
      {err ? <><div className="qz-err" role="alert">{err}</div><Link className="btn" href="/quiz">← My Games</Link></> : <p className="qz-muted">Loading the game…</p>}
    </div>
  );
  if (s.status === 'finished' || s.status === 'abandoned') return <Result s={s} busy={busy} err={err} onAgain={() => act('restart')} />;

  const two = s.mode === 'two', paused = s.status === 'paused';
  const open = s.openQ != null ? s.questions[s.openQ] : null;
  const left = s.questions.length - Object.keys(s.played).length;

  return (
    <div className="qz-play">
      <div className="qz-top">
        <div>
          <Link className="back" href="/quiz">← My Games</Link>
          <h1>{s.title}</h1>
        </div>
        <div className="qz-bar">
          <span className="qz-muted">{left} of {s.questions.length} boxes left</span>
          {paused
            ? <button className="btn" disabled={busy} onClick={() => act('resume')}>▶ Resume</button>
            : <button className="btn alt" disabled={busy} onClick={() => act('pause')}>⏸ Pause</button>}
          <button className="btn alt" disabled={busy} onClick={restart}>↻ Restart</button>
          <button className="btn alt" disabled={busy} onClick={finish}>🏁 Finish game</button>
        </div>
      </div>
      {err && <div className="qz-err" role="alert">{err}</div>}

      <div className="qz-score" aria-live="polite">
        {s.teams.map((t, i) => <Team key={i} t={t} i={i} two={two} turn={s.turn} onPick={() => s.turn !== i && act('setTurn', { team: i })} />)}
      </div>
      {two && <p className="qz-muted" style={{ textAlign: 'center', margin: '-6px 0 14px' }}>Tap a team to give it the turn. The turn switches automatically after each question.</p>}

      <div className="qz-board">
        {s.questions.map((q, i) => {
          const p = s.played[String(i)];
          return (
            <button key={i} className={'qz-tile' + (p ? (p.correct ? ' ok' : ' no') : '')}
              style={{ '--c': COLS[i % COLS.length], '--d': Math.min(i, 30) * 35 + 'ms' }}
              disabled={!!p || busy || paused}
              aria-label={p ? `Question ${q.n}, ${q.points} points, already played` : `Open question ${q.n}, ${q.points} points`}
              onClick={() => { sfx('pop'); act('open', { index: i }); }}>
              <span className="n">{q.n}</span>
              {p
                ? <span className="pt res">{p.correct ? `✓ +${p.points}` : '✗ 0'}</span>
                : <span className="pt">{q.points} pts</span>}
              {p && two && <span className="who">{s.teams[p.team].name}</span>}
            </button>
          );
        })}
      </div>

      {open && !paused && (
        <Stage s={s} q={open} busy={busy} onReveal={() => act('reveal')} onJudge={judge} onClose={() => act('close')} onTurn={(t) => act('setTurn', { team: t })} />
      )}
      {paused && (
        <div className="qz-pause" role="dialog" aria-modal="true" aria-label="Game paused">
          <div>
            <h2>⏸ Paused</h2>
            <div className="row"><button className="btn" disabled={busy} onClick={() => act('resume')}>▶ Resume</button><button className="btn alt" disabled={busy} onClick={finish}>🏁 Finish game</button></div>
          </div>
        </div>
      )}
      {flash && <div className="qz-flash" aria-hidden="true"><div className={flash.ok ? 'ok' : 'no'}>{flash.ok ? `✓ +${flash.pts}` : '✗ 0 points'}</div></div>}
    </div>
  );
}