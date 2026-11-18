import { requireAdmin } from '@/lib/auth';
import CategoryManager from '../_components/CategoryManager';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireAdmin(); return <CategoryManager kind="vocab" />; }
