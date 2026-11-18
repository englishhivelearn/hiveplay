import { isAdmin, setCode, go } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!(await isAdmin())) return go('/admin');
  const code = String((await req.formData()).get('code') || '').trim();
  if (code.length < 6 || code.length > 64) return go('/admin/access?e=pendek');
  try { setCode(code); } catch (e) { console.error(e); return go('/admin/access?e=gagal'); }
  return go('/admin/access?m=ok');
}
