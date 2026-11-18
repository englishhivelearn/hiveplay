import { requireAdmin } from '@/lib/auth';
import AssetLibrary from '../_components/AssetLibrary';
export const dynamic = 'force-dynamic';
export default async function Page() { await requireAdmin(); return <AssetLibrary />; }
