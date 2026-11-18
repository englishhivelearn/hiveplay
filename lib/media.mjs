// Pemeriksaan file unggahan: tipe, ukuran, isi file harus cocok dengan ekstensinya, dan ukuran gambar/durasi.
import path from 'node:path';
import { validateSvg } from './svg.mjs';
export const LIMITS = { image: 2 * 1024 * 1024, audio: 5 * 1024 * 1024 };
const EXT = { svg: 'IMAGE', png: 'IMAGE', jpg: 'IMAGE', jpeg: 'IMAGE', gif: 'IMAGE', webp: 'IMAGE', mp3: 'AUDIO', wav: 'AUDIO', ogg: 'AUDIO' };
export const slugify = (s) => String(s || '').normalize('NFKD').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const FOLDER = { VOCABULARY: 'vocabulary', CHARACTER: 'characters', ENVIRONMENT: 'environments', OBJECT: 'objects', AUDIO: 'audio', ANIMATION: 'animations', UI: 'ui' };
export const PREFIX = { VOCABULARY: 'vocab', CHARACTER: 'char', ENVIRONMENT: 'env', OBJECT: 'obj', AUDIO: 'audio', ANIMATION: 'anim', UI: 'ui' };
export const folderFor = (grp, catSlug) => FOLDER[grp] + '/' + catSlug.replace(/^[a-z]+-/, '');

export function sniff(b, filename = '') {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (!EXT[ext]) return { error: `Tipe file .${ext || '?'} tidak didukung (svg, png, jpg, gif, webp, mp3, wav, ogg).` };
  const type = EXT[ext], limit = type === 'AUDIO' ? LIMITS.audio : LIMITS.image;
  if (!b.length) return { error: 'File kosong.' };
  if (b.length > limit) return { error: `File terlalu besar (maksimal ${limit / 1024 / 1024} MB).` };
  const bad = { error: 'Isi file tidak cocok dengan ekstensinya.' };
  if (ext === 'svg') {
    const t = b.toString('utf8'), v = validateSvg(t);
    if (!v.ok) return { error: 'SVG ditolak: ' + v.reasons.join('; ') };
    const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/.exec(t);
    return { format: 'svg', type, width: vb ? Math.round(+vb[1]) : null, height: vb ? Math.round(+vb[2]) : null };
  }
  if (ext === 'png') { if (b.length < 24 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return bad; return { format: 'png', type, width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; }
  if (ext === 'gif') { if (!/^GIF8[79]a/.test(b.subarray(0, 6).toString('latin1'))) return bad; return { format: 'gif', type, width: b.readUInt16LE(6), height: b.readUInt16LE(8) }; }
  if (ext === 'jpg' || ext === 'jpeg') {
    if (b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return bad;
    let i = 2, w = null, h = null;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return { format: 'jpg', type, width: w, height: h };
  }
  if (ext === 'webp') {
    if (b.length < 30 || b.subarray(0, 4).toString('latin1') !== 'RIFF' || b.subarray(8, 12).toString('latin1') !== 'WEBP') return bad;
    const k = b.subarray(12, 16).toString('latin1');
    if (k === 'VP8 ') return { format: 'webp', type, width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (k === 'VP8L') return { format: 'webp', type, width: 1 + (((b[22] & 0x3f) << 8) | b[21]), height: 1 + (((b[24] & 0xf) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
    if (k === 'VP8X') return { format: 'webp', type, width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    return bad;
  }
  if (ext === 'mp3') { const ok = b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0); return ok ? { format: 'mp3', type } : bad; }
  if (ext === 'ogg') return b.subarray(0, 4).toString('latin1') === 'OggS' ? { format: 'ogg', type } : bad;
  if (ext === 'wav') {
    if (b.length < 44 || b.subarray(0, 4).toString('latin1') !== 'RIFF' || b.subarray(8, 12).toString('latin1') !== 'WAVE') return bad;
    let durationMs = null, byteRate = 0, i = 12;
    while (i + 8 <= b.length) {
      const id = b.subarray(i, i + 4).toString('latin1'), size = b.readUInt32LE(i + 4);
      if (id === 'fmt ') byteRate = b.readUInt32LE(i + 16);
      if (id === 'data' && byteRate) { durationMs = Math.round(size / byteRate * 1000); break; }
      i += 8 + size + (size % 2);
    }
    return { format: 'wav', type, durationMs };
  }
  return bad;
}
