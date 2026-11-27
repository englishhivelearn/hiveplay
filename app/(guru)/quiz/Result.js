'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import './quiz.css';
import { sfx, fmtDate, winnerOf } from './api';

export default function Result({ s, onAgain, busy, err }) {
  const w = winnerOf(s);
  const early = s.status === 'abandoned';
  useEffect(() => {
    if (s.status === 'finished' && s.finishedAt && Date.now() - new Date(s.finishedAt).getTime() < 30000) sfx('win');
  }, [s.id, s.status, s.finishedAt]);
  const played = Object.keys(s.played).length;

  return (
    <div className="qz-wrap">
      <div className="top" style={{ padding: 0 }}><Link className="back" href="/quiz">← My Games</Link></div>
      <div className="qz-win">
        {s.mode === 'two' && w !== 'tie' && !early && <div className="trophy" aria-hidden="true">🏆</div>}
        {s.mode !== 'two' && !early && <div className="trophy" aria-hidden="true">🎉</div>}
        <div className="big">
          {early ? 'Game ended early'
            : s.mode === 'two'
              ? (w === 'tie' ? 'It’s a tie!' : `${s.teams[w].name} wins!`)
              : `${s.teams[0].name} scored ${s.teams[0].score} points!`}
        </div>
        <p className="qz-muted" style={{ margin: '6px 0 0' }}>{s.title} · {played} of {s.questions.length} questions played · {fmtDate(s.finishedAt)}</p>
      </div>

      <div className="qz-score">
        {s.teams.map((t, i) => {
          const tot = t.correct + t.wrong;
          return (
            <div key={i} className={`qz-team ${s.mode === 'two' ? 't' + i : 'solo'}${w === i ? ' turn' : ''}`}>
              {w === i && <span className="tn">🏆 WINNER</span>}
              <div className="nm">{t.name}</div>
              <div className="sc">{t.score}</div>
              <div className="st">✓ {t.correct} correct · ✗ {t.wrong} wrong{tot ? ` · ${Math.round((t.correct / tot) * 100)}%` : ''}</div>
            </div>
          );
        })}
      </div>

      {err && <div className="qz-err" role="alert">{err}</div>}
      <div className="row" style={{ marginBottom: 22 }}>
        <button className="btn" disabled={busy} onClick={onAgain}>↻ Play again</button>
        <Link className="btn alt" href="/quiz">My Games</Link>
        <Link className="btn alt" href="/quiz/history">History</Link>
      </div>

      <h2 style={{ margin: '8px 0 0' }}>Question review</h2>
      <div className="qz-scroll">
        <table className="qz-table">
          <thead><tr><th>#</th><th>Question</th><th>Answer</th><th>Points</th><th>Result</th></tr></thead>
          <tbody>
            {s.questions.map((q, i) => {
              const p = s.played[String(i)];
              return (
                <tr key={i}>
                  <td>{q.n}</td><td>{q.question}</td><td>{q.answer}</td><td>{q.points}</td>
                  <td>{p ? `${p.correct ? '✓ +' + p.points : '✗ 0'}${s.mode === 'two' ? ' · ' + s.teams[p.team].name : ''}` : <span className="qz-muted">Not played</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}