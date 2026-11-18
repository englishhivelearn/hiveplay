import { isAdmin } from '@/lib/auth';
import AdminShell from './_components/AdminShell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hive Play Admin', robots: { index: false, follow: false } };

// Halaman admin memakai kerangka (menu samping) hanya setelah login. Sebelum login: hanya kotak masuk.
export default async function AdminLayout({ children }) {
  return (await isAdmin()) ? <AdminShell>{children}</AdminShell> : children;
}
