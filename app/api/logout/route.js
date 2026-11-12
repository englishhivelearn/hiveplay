import { go } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST() { return go('/login', ['guru=; Path=/; HttpOnly; Max-Age=0']); }
