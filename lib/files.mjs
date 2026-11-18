import fs from 'node:fs/promises';
import path from 'node:path';
export const uploadRoot = () => path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'assets', 'library');
const safe = (rel) => {
  const root = path.resolve(uploadRoot()), abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) throw new Error('path tidak valid');
  return abs;
};
export async function saveFile(rel, buf) { const abs = safe(rel); await fs.mkdir(path.dirname(abs), { recursive: true }); await fs.writeFile(abs, buf); }
export async function removeFile(rel) { try { await fs.unlink(safe(rel)); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
