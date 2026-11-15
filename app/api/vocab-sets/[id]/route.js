import { isStaff } from '@/lib/auth';
import { json, fail } from '@/lib/apiHelpers.mjs';
import { getSet } from '@/lib/services/vocabularySetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_req, { params }) {
  if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
  try { const s = await getSet((await params).id); return s ? json(s) : json({ error: 'not_found' }, 404); } catch (e) { return fail(e); }
}
