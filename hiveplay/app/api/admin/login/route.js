import { checkAdminPw, adminToken, cookieStr, go, clientIp, limited, failed, succeeded } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const ip = clientIp(req);
  if (limited(ip)) return go('/admin?e=limit');
  const pw = String((await req.formData()).get('pw') || '');
  if (pw && checkAdminPw(pw)) {
    succeeded(ip);
    return go('/admin', [cookieStr(req, 'adm', adminToken(), 2)]);
  }
  failed(ip);
  return go('/admin?e=salah');
}
