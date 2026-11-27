import { requireGuru } from '@/lib/auth';
import Editor from '../Editor';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit game · Hive Play' };
export default async function Page({ params }) { await requireGuru(); return <Editor id={(await params).id} />; }