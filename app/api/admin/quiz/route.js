import { adminHandle } from '@/lib/quizAdminApi.mjs';
import { json } from '@/lib/apiHelpers.mjs';
import * as A from '@/lib/services/quizAdminService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = () => adminHandle(async () => json(await A.overview()));