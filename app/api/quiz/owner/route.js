import { handle, ownerCookie, TOKEN_RE } from '@/lib/quizApi.mjs';
import { json, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: kunci pemulihan perangkat ini. POST {key}: pakai kunci dari perangkat lain (game-nya jadi terbuka di sini).
export const GET = (req) => handle(req, async (o) => json({ key: o.token }));
export const POST = (req) => handle(req, async () => {
  const key = String((await body(req)).key || '').trim();
  if (!TOKEN_RE.test(key)) throw new UserError('That key is not valid. Copy it again from the other device.');
  const res = json({ ok: true });
  res.headers.append('Set-Cookie', ownerCookie(req, key));
  return res;
});