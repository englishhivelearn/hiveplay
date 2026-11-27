import { isAdmin } from '@/lib/auth';
import { json, fail } from './apiHelpers.mjs';
/** Route admin Quiz: hanya untuk operator yang sudah login. */
export async function adminHandle(fn) {
  try {
    if (!(await isAdmin())) return json({ error: 'unauthorized' }, 401);
    return await fn();
  } catch (e) { return fail(e); }
}