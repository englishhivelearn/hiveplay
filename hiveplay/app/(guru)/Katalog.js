'use client';
import { useState } from 'react';
import ART from '@/lib/art';

const JENJANG = ['Semua', 'Todler', 'TK', 'SD', 'SMP', 'SMA'];

export default function Katalog({ games }) {
  const [aktif, setAktif] = useState('Semua');
  const tampil = games.filter((g) => aktif === 'Semua' || g.jenjang.includes(aktif));
  const sorot = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', e.clientX - r.left + 'px');
    e.currentTarget.style.setProperty('--my', e.clientY - r.top + 'px');
  };
  return (
    <>
      <div className="chips">
        {JENJANG.map((j) => (
          <button key={j} className={j === aktif ? 'on' : ''} onClick={() => setAktif(j)}>{j}</button>
        ))}
      </div>
      <div className="grid">
        {tampil.map((g, i) => (
          <a key={g.url + aktif} className="card rise" style={{ '--i': i }} href={g.url} onPointerMove={sorot}>
            <div className="ic" dangerouslySetInnerHTML={{ __html: ART[g.art] }} />
            <h3>{g.nama}</h3>
            <span className="tag">{g.jenjang.length > 3 ? 'Semua usia' : g.jenjang.join(' · ')}</span>
            <p>{g.mapel}. {g.info}</p>
          </a>
        ))}
      </div>
    </>
  );
}
