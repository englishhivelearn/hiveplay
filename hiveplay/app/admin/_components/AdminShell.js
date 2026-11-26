'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { h: 'SYSTEM', items: [['/admin/access', 'Teacher access code']] },
];
export default function AdminShell({ children }) {
  const path = usePathname() || '';
  const on = (href) => path === href || path.startsWith(href + '/');
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className={'adm-brand' + (path === '/admin' ? ' on' : '')}>Hive Play <small>Admin</small></Link>
        <nav aria-label="Admin">
          {NAV.map((g) => (
            <div key={g.h} className="adm-group">
              <div className="adm-gh">{g.h}</div>
              {g.items.map(([href, label]) => <Link key={href} href={href} className={on(href) ? 'on' : ''}>{label}</Link>)}
            </div>
          ))}
        </nav>
        <div className="adm-foot">
          <a href="/">Open teacher catalog</a>
          <form method="post" action="/api/admin/logout"><button>Sign out</button></form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
    </div>
  );
}
