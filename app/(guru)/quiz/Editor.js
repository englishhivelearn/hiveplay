'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './quiz.css';
import { api } from './api';

const MAX_Q = 60, MAX_IMG = 380000;

/* perkecil gambar di browser supaya ringan disimpan di database */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not an image.')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      for (const [max, q] of [[900, 0.8], [720, 0.7], [560, 0.6], [420, 0.5]]) {
        const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL('image/jpeg', q);
        if (out.length <= MAX_IMG) return resolve(out);
      }
      reject(new Error('That image is too large. Try a smaller one.'));
    };
    img.src = url;
  });
}

export default function Editor({ id }) {
  const router = useRouter();
  const nextKey = useRef(1);
  const mk = (q = {}) => ({ key: nextKey.current++, question: q.question || '', answer: q.answer || '', points: q.points == null ? '' : String(q.points), image: q.image || null });
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('draft');
  const [qs, setQs] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api('/api/quiz/games/' + id).then(({ game }) => {
      setTitle(game.title); setStatus(game.status);
      setQs(game.questions.length ? game.questions.map(mk) : [mk()]);
    }).catch((e) => { setErr(e.message); setQs([]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const touch = () => { setDirty(true); setMsg(''); };
  const upd = (i, p) => { setQs((a) => a.map((q, j) => (j === i ? { ...q, ...p } : q))); touch(); };
  const add = () => { if (qs.length >= MAX_Q) return setErr(`A game can have at most ${MAX_Q} questions.`); setQs((a) => [...a, mk()]); touch(); };
  const remove = (i) => { setQs((a) => a.filter((_, j) => j !== i)); touch(); };
  const move = (i, d) => { setQs((a) => { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; }); touch(); };
  async function pickImage(i, file) {
    if (!file) return;
    try { upd(i, { image: await shrink(file) }); setErr(''); } catch (e) { setErr(e.message); }
  }

  const save = useCallback(async (next) => {
    setBusy(true); setErr(''); setMsg('');
    try {
      await api('/api/quiz/games/' + id, { method: 'PUT', body: { title, status: next, questions: qs.map(({ question, answer, points, image }) => ({ question, answer, points, image })) } });
      setStatus(next); setDirty(false);
      if (next === 'ready') { router.push('/quiz'); return; }
      setMsg('Draft saved ✓');
      // baris kosong dibuang oleh server; muat ulang agar tampilan sama dengan yang tersimpan
      const { game } = await api('/api/quiz/games/' + id);
      setQs(game.questions.length ? game.questions.map(mk) : [mk()]);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, title, qs, router]);

  if (qs === null) return <div className="qz-wrap"><p className="qz-muted">Loading…</p></div>;
  const filled = qs.filter((q) => q.question.trim() || q.answer.trim());
  const total = qs.reduce((n, q) => n + (parseInt(q.points, 10) || 0), 0);

  return (
    <div className="qz-wrap">
      <div className="top" style={{ padding: 0, marginBottom: 6 }}>
        <Link className="back" href="/quiz" onClick={(e) => { if (dirty && !confirm('You have unsaved changes. Leave without saving?')) e.preventDefault(); }}>← My Games</Link>
      </div>
      <div className="qz-head">
        <h1 className="rise">Edit game</h1>
        <span className={'qz-pill' + (status === 'draft' ? ' draft' : '')}>{status === 'draft' ? 'Draft' : 'Ready'}</span>
      </div>
      {err && <div className="qz-err" role="alert">{err}</div>}
      {msg && <div className="qz-ok" role="status">{msg}</div>}

      <label className="qz-lbl" htmlFor="title">Game title</label>
      <input id="title" className="qz-in" maxLength={120} value={title} placeholder="e.g. Animals — Grade 3" onChange={(e) => { setTitle(e.target.value); touch(); }} />
      <p className="qz-muted" style={{ margin: '8px 0 0' }}>{filled.length} question{filled.length === 1 ? '' : 's'} · {total} points in total. Each question becomes one box on the board.</p>

      {qs.map((q, i) => (
        <section className="qz-q" key={q.key} aria-label={'Question ' + (i + 1)}>
          <header>
            <span className="no">{i + 1}</span>
            <div className="tools">
              <button className="btn sm alt" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
              <button className="btn sm alt" onClick={() => move(i, 1)} disabled={i === qs.length - 1} aria-label="Move down">▼</button>
              <button className="btn sm alt" onClick={() => remove(i)} aria-label={'Delete question ' + (i + 1)}>🗑</button>
            </div>
          </header>
          <label className="qz-lbl" htmlFor={'q' + q.key}>Question</label>
          <textarea id={'q' + q.key} className="qz-in" maxLength={1000} value={q.question} placeholder="Type the question students will see" onChange={(e) => upd(i, { question: e.target.value })} />
          <div className="qz-cols">
            <div>
              <label className="qz-lbl" htmlFor={'a' + q.key}>Correct answer</label>
              <input id={'a' + q.key} className="qz-in" maxLength={500} value={q.answer} placeholder="The answer you will reveal" onChange={(e) => upd(i, { answer: e.target.value })} />
            </div>
            <div>
              <label className="qz-lbl" htmlFor={'p' + q.key}>Points</label>
              <input id={'p' + q.key} className="qz-in" type="number" inputMode="numeric" min="0" max="100000" step="1" value={q.points} placeholder="e.g. 20" onChange={(e) => upd(i, { points: e.target.value })} />
            </div>
          </div>
          <div className="qz-img">
            {q.image && <img src={q.image} alt={'Image for question ' + (i + 1)} />}
            <label className="btn sm alt" style={{ cursor: 'pointer' }}>
              {q.image ? 'Change image' : '🖼 Add image (optional)'}
              <input type="file" accept="image/*" hidden onChange={(e) => { pickImage(i, e.target.files[0]); e.target.value = ''; }} />
            </label>
            {q.image && <button className="btn sm alt" onClick={() => upd(i, { image: null })}>Remove image</button>}
          </div>
        </section>
      ))}

      <div className="row"><button className="btn alt" onClick={add}>＋ Add question</button></div>

      <div className="qz-sticky">
        <button className="btn alt" disabled={busy} onClick={() => save('draft')}>💾 Save as draft</button>
        <button className="btn" disabled={busy} onClick={() => save('ready')}>✅ Save &amp; mark Ready</button>
      </div>
    </div>
  );
}