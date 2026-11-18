import { requireAdmin } from '@/lib/auth';
import SetManager from '../_components/SetManager';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireAdmin(); return <SetManager />; }
