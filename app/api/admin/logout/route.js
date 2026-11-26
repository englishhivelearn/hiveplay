import { go } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export async function POST() { return go('/admin', ['adm=; Path=/; HttpOnly; Max-Age=0']); }
