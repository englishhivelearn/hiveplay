import './globals.css';
export const metadata = { title: 'Hive Play', robots: { index: false, follow: false } };
export default function RootLayout({ children }) {
  return (<html lang="id"><body>{children}</body></html>);
}
