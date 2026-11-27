import { requireGuru } from '@/lib/auth';
import MyGames from './MyGames';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quiz Board · Hive Play' };
export default async function Page() { await requireGuru(); return <MyGames />; }