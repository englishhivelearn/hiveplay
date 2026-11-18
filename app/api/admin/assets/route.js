import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { createAssetFromUpload } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Unggah asset baru (multipart). Hanya admin.
export async function POST(req) {
  const g = await adminOnly(req); if (g) return g;
  try {
    const fd = await req.formData(), f = fd.get('file');
    if (!f || typeof f === 'string' || !f.size) throw new UserError('Pilih file yang akan diunggah.');
    const asset = await createAssetFromUpload({
      buffer: Buffer.from(await f.arrayBuffer()), filename: f.name,
      name: fd.get('name') || String(f.name).replace(/\.[^.]+$/, ''), category: fd.get('category'),
      variant: fd.get('variant') || null, tags: fd.get('tags') || '', inlineRig: fd.get('inlineRig') === 'true',
      frames: fd.get('frames') || null, allowDuplicate: fd.get('allowDuplicate') === 'true',
    });
    return json({ asset }, 201);
  } catch (e) { return fail(e); }
}
