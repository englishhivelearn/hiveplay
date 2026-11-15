// Validasi SVG sebelum masuk perpustakaan. Pendekatan "tolak": SVG yang berisi apa pun di luar
// daftar aman ditolak (bukan diperbaiki diam-diam). Dipakai oleh seed dan nanti oleh unggahan admin.
const TAGS = new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','defs','lineargradient','radialgradient','stop','pattern','clippath','mask','text','tspan','title','desc','symbol','use']);
export function validateSvg(text) {
  const why = [];
  if (typeof text !== 'string' || !/^\s*<svg[\s>]/i.test(text)) return { ok: false, reasons: ['bukan SVG'] };
  if (text.length > 500_000) why.push('terlalu besar (maks 500 KB)');
  if (/<!\s*(DOCTYPE|ENTITY)|<\?xml-stylesheet|<!\[CDATA\[/i.test(text)) why.push('berisi DOCTYPE/ENTITY/CDATA');
  const tagRe = /<\/?\s*([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = tagRe.exec(text))) {
    const name = m[1].toLowerCase();
    if (!TAGS.has(name)) { why.push('elemen tidak diizinkan: <' + m[1] + '>'); continue; }
    const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g; let a;
    while ((a = attrRe.exec(m[2]))) {
      const an = a[1].toLowerCase(), av = (a[3] ?? a[4] ?? '').trim();
      if (an.startsWith('on')) why.push('atribut event: ' + a[1]);
      if ((an === 'href' || an === 'xlink:href') && !av.startsWith('#')) why.push('tautan eksternal: ' + a[1]);
      if (/javascript:|data:text\/html|expression\(/i.test(av)) why.push('nilai berbahaya di ' + a[1]);
      if (an === 'style' && /url\((?!\s*['"]?#)/i.test(av)) why.push('url() eksternal di style');
      if (/url\((?!\s*['"]?#)/i.test(av) && an !== 'style') why.push('url() eksternal di ' + a[1]);
    }
  }
  return { ok: why.length === 0, reasons: [...new Set(why)] };
}
