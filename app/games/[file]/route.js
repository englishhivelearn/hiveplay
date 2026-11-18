import fs from 'node:fs/promises';
import path from 'node:path';
import { isStaff } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  if (!(await isStaff())) return new Response(null, { status: 303, headers: { Location: '/login' } });
  const { file } = await params;
  if (!/^[a-z0-9-]+\.html$/.test(file)) return new Response('Tidak ditemukan', { status: 404 });
  try {
    const html = await fs.readFile(path.join(process.cwd(), 'private', 'games', file));
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('Tidak ditemukan', { status: 404 });
  }
}
