import { requireGuru } from '@/lib/auth';
import Play from '../../Play';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quiz Board · Hive Play' };
export default async function Page({ params }) { await requireGuru(); return <Play id={(await params).id} />; }