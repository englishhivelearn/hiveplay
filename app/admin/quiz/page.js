import { requireAdmin } from '@/lib/auth';
import QuizAdmin from './QuizAdmin';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireAdmin(); return <QuizAdmin />; }