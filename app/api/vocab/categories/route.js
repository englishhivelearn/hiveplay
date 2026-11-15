import { isStaff } from '@/lib/auth';
import { json, fail } from '@/lib/apiHelpers.mjs';
import { listCategories } from '@/lib/services/vocabularyService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await isStaff())) return json({ error: 'unauthorized' }, 401);
  try { return json({ categories: await listCategories() }); } catch (e) { return fail(e); }
}
