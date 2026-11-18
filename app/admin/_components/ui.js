'use client';
import { useEffect, useState } from 'react';

export async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.headers['content-type'] = 'application/json'; opt.body = JSON.stringify(body); }
  const r = await fetch(url, opt);
  let j = {};
  try { j = await r.json(); } catch { /* respons kosong */ }
  if (!r.ok) { const e = new Error(j.error || 'Terjadi kesalahan (HTTP ' + r.status + ').'); e.status = r.status; e.data = j; throw e; }
  return j;
}
export function errText(e) {
  const d = e.data || {};
  let t = e.message;
  if (d.duplicates) t += ' (' + d.duplicates.join(', ') + ')';
  if (d.vocabulary && d.vocabulary.length) t += ' Kata: ' + [...new Set(d.vocabulary.map((v) => v.word))].join(', ') + '.';
  if (d.games && d.games.length) t += ' Game: ' + [...new Set(d.games.map((g) => g.game))].join(', ') + '.';
  if (d.sets && d.sets.length) t += ' Set: ' + d.sets.join(', ') + '.';
  return t;
}
export const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="adm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'adm-modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="adm-modal-h"><h2>{title}</h2><button className="adm-x" onClick={onClose} aria-label="Tutup">×</button></div>
        <div className="adm-modal-b">{children}</div>
      </div>
    </div>
  );
}
export const Badge = ({ tone = '', children }) => <span className={'badge ' + tone}>{children}</span>;
export function Notice({ msg }) {
  if (!msg) return null;
  return <div className={'adm-notice ' + (msg.type || 'ok')} role="status">{msg.text}</div>;
}
export const Empty = ({ children }) => <div className="adm-empty">{children}</div>;
export function Preview({ a, big }) {
  if (a.type === 'AUDIO') return <audio controls preload="none" src={a.url} className="adm-audio" />;
  return <img src={a.url} alt={a.name} loading="lazy" className={big ? 'adm-img big' : 'adm-img'} />;
}
