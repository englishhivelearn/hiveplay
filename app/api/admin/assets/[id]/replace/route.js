import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { replaceAssetFile } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try {
    const f = (await req.formData()).get('file');
    if (!f || typeof f === 'string' || !f.size) throw new UserError('Pilih file pengganti.');
    return json({ asset: await replaceAssetFile((await params).id, { buffer: Buffer.from(await f.arrayBuffer()), filename: f.name }) });
  } catch (e) { return fail(e); }
}
