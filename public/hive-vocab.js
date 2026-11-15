/* Hive Play: klien kecil untuk game statis. Mengambil kosakata dan asset dari perpustakaan pusat.
   Bila perpustakaan tidak tersedia atau asset hilang, game memakai data bawaannya sendiri: tidak pernah error. */
(() => {
  if (window.HiveVocab) return;
  const cache = new Map();
  const esc = (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c);
  async function api(path) {
    const r = await fetch(path, { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  async function fetchSvg(url) {
    if (!cache.has(url)) cache.set(url, fetch(url, { credentials: 'same-origin' }).then(async (r) => {
      const t = r.ok ? await r.text() : '';
      if (!/^\s*<svg/i.test(t)) throw new Error('not svg');
      return t;
    }));
    try { return await cache.get(url); } catch (e) { cache.delete(url); return null; }
  }
  /** Gambar (teks SVG) sebuah kata. roles = urutan varian yang dicoba. Null jika tidak ada. */
  async function svg(word, roles) {
    for (const role of roles) { const a = word.assets && word.assets[role]; if (a && a.format === 'svg') { const t = await fetchSvg(a.url); if (t) return t; } }
    return null;
  }
  const assetSvg = (slug) => fetchSvg('/media/' + encodeURIComponent(slug));
  const placeholder = (word) => '<svg viewBox="0 0 120 120" class="pet"><rect x="14" y="14" width="92" height="92" rx="26" fill="#c9c3ff"/><text x="60" y="80" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="56" fill="#1a1b4b">' + esc(((word || '?')[0] || '?').toUpperCase()) + '</text></svg>';

  async function load({ game, category, set, fallback, limit }) {
    try {
      const qs = new URLSearchParams();
      if (game) qs.set('game', game); if (category) qs.set('category', category); if (set) qs.set('set', set); if (limit) qs.set('limit', limit);
      const d = await api('/api/vocab?' + qs);
      if (!d.words || !d.words.length) throw new Error('no words');
      return { words: d.words, warnings: d.check ? d.check.warnings : [], source: 'library' };
    } catch (e) { return { words: fallback, warnings: [], source: 'builtin', error: String((e && e.message) || e) }; }
  }
  async function sets({ game, category }) {
    try { return (await api('/api/vocab-sets?game=' + encodeURIComponent(game || '') + (category ? '&category=' + encodeURIComponent(category) : ''))).sets || []; }
    catch (e) { return []; }
  }
  function notice(el, res) {
    const m = [];
    if (res.source === 'builtin') m.push('The vocabulary library is not available, so built-in words are being used.');
    if (res.warnings && res.warnings.length) {
      const n = res.warnings.length;
      m.push(n + (n === 1 ? ' word has' : ' words have') + ' no picture (' + res.warnings.map((w) => w.word).slice(0, 6).join(', ') + (n > 6 ? ', …' : '') + '). A placeholder picture will be shown.');
    }
    el.hidden = !m.length;
    el.textContent = m.length ? '⚠ ' + m.join(' ') : '';
    if (m.length) el.setAttribute('role', 'status');
  }
  /** Pilihan set kosakata untuk guru. Hanya membaca. Mengembalikan id set terpilih ('' = semua kata). */
  async function picker(el, { game, category, onChange }) {
    const list = await sets({ game, category });
    el.textContent = '';
    if (!list.length) return '';
    const key = 'hp_set_' + game; let saved = null;
    try { saved = localStorage.getItem(key); } catch (e) {}
    // Bawaan = set pertama yang kompatibel, supaya tampilan game sama seperti sebelumnya. '__all' = guru memilih "All words".
    let val;
    if (saved === '__all') val = '';
    else if (saved && list.some((s) => s.id === saved)) val = saved;
    else { const first = list.find((s) => s.compatible) || list[0]; val = first ? first.id : ''; }
    const lab = document.createElement('label'); lab.className = 'hv-label'; lab.textContent = 'Vocabulary set: ';
    const sel = document.createElement('select'); sel.setAttribute('aria-label', 'Vocabulary set');
    sel.add(new Option('All words', ''));
    list.forEach((s) => sel.add(new Option(s.name + ' (' + s.wordCount + ')' + (s.compatible ? '' : ' ⚠ missing pictures'), s.id)));
    sel.value = val;
    sel.onchange = () => { try { localStorage.setItem(key, sel.value || '__all'); } catch (e) {} onChange && onChange(sel.value); };
    lab.appendChild(sel); el.appendChild(lab);
    return sel.value;
  }
  window.HiveVocab = { load, sets, svg, assetSvg, placeholder, notice, picker };
})();
