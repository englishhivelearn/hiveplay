import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { assetDetails, updateAsset, deleteAsset } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { const a = await assetDetails((await params).id); return a ? json({ asset: a }) : json({ error: 'Asset tidak ditemukan.' }, 404); } catch (e) { return fail(e); }
}
export async function PATCH(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { return json({ asset: await updateAsset((await params).id, await body(req)) }); } catch (e) { return fail(e); }
}
export async function DELETE(req, { params }) {
  const g = await adminOnly(req); if (g) return g;
  try { return json(await deleteAsset((await params).id)); } catch (e) { return fail(e); }
}
