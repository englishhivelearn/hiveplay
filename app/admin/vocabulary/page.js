import { requireAdmin } from '@/lib/auth';
import VocabularyManager from '../_components/VocabularyManager';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireAdmin(); return <VocabularyManager />; }
