'use client';
import { useState } from 'react';

const JENJANG = ['Semua', 'Todler', 'TK', 'SD', 'SMP', 'SMA'];

export default function Katalog({ games }) {
  const [aktif, setAktif] = useState('Semua');
  const tampil = games.filter((g) => aktif === 'Semua' || g.jenjang.includes(aktif));
  return (
    <>
      <div className="filter">
        {JENJANG.map((j) => (
          <button key={j} className={j === aktif ? 'on' : ''} onClick={() => setAktif(j)}>{j}</button>
        ))}
      </div>
      <div className="grid">
        {tampil.map((g) => (
          <a key={g.url} className="card" href={g.url}>
            <span className="e">{g.emoji}</span>
            <b>{g.nama}</b>
            <small>{g.mapel} · {g.jenjang.join(', ')}</small>
            <small>{g.info}</small>
          </a>
        ))}
      </div>
    </>
  );
}
