import { requireGuru } from '@/lib/auth';
import History from '../History';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Game history · Hive Play' };
export default async function Page() { await requireGuru(); return <History />; }