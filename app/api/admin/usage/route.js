import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { usageReport } from '@/lib/services/gameAssetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) { const g = await adminOnly(req); if (g) return g; try { return json(await usageReport()); } catch (e) { return fail(e); } }
