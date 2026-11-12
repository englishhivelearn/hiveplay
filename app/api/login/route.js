import { checkCode, guruToken, cookieStr, go, clientIp, limited, failed, succeeded } from '@/lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const ip = clientIp(req);
  if (limited(ip)) return go('/login?e=limit');
  const code = String((await req.formData()).get('code') || '');
  if (code && checkCode(code)) {
    succeeded(ip);
    return go('/', [cookieStr(req, 'guru', guruToken(), 12)]);
  }
  failed(ip);
  return go('/login?e=salah');
}
