import { adminOnly } from '@/lib/adminApi';
import { json, fail, body } from '@/lib/apiHelpers.mjs';
import { UserError } from '@/lib/errors.mjs';
import { listAssetCategories, createAssetCategory } from '@/lib/services/assetService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) { const g = await adminOnly(req); if (g) return g; try { return json({ categories: await listAssetCategories() }); } catch (e) { return fail(e); } }
export async function POST(req) { const g = await adminOnly(req); if (g) return g; try { return json({ category: await createAssetCategory(await body(req)) }, 201); } catch (e) { return fail(e); } }
