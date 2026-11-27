import { adminHandle } from '@/lib/quizAdminApi.mjs';
import { json } from '@/lib/apiHelpers.mjs';
import * as A from '@/lib/services/quizAdminService.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (req, { params }) => adminHandle(async () => json({ game: await A.gameDetail((await params).id) }));