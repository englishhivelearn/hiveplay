import { isStaff, isAdmin } from '@/lib/auth';
import { json, fail } from '@/lib/apiHelpers.mjs';
import { listAssets } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url).searchParams, admin = await isAdmin();
  try {
    const assets = await listAssets({
      q: u.get('q') || undefined, group: u.get('group') || undefined, category: u.get('category') || undefined,
      type: u.get('type') || undefined, limit: u.get('limit') || 100, offset: u.get('offset') || 0,
      status: admin ? (u.get('status') || 'ACTIVE') : 'ACTIVE',
    });
    return json({ assets: admin ? assets : assets.map(({ filePath, sha256, ...a }) => a), count: assets.length });
  } catch (e) { return fail(e); }
}
