import fs from 'node:fs/promises';
import { isStaff, isAdmin } from '@/lib/auth';
import { getAsset, resolveFile } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg' };
const text = (s, status) => new Response(s, { status, headers: { 'Cache-Control': 'no-store' } });

// Semua asset dilayani lewat sini, setelah cek login (guru atau operator). Tidak ada URL file langsung.
export async function GET(req, { params }) {
  if (!(await isStaff())) return text('Unauthorized', 401);
  let asset;
  try { asset = await getAsset(decodeURIComponent((await params).slug)); } catch { return text('Library unavailable', 503); }
  if (!asset || asset.status === 'DRAFT' || (asset.status === 'ARCHIVED' && !(await isAdmin()))) return text('Not found', 404);
  const file = await resolveFile(asset);
  if (!file) return text('Not found', 404);
  const etag = `"${asset.sha256}-${asset.version}"`;
  const headers = {
    'Content-Type': TYPES[asset.format] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-cache', ETag: etag,
    ...(asset.format === 'svg' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
  };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(await fs.readFile(file), { headers });
}
