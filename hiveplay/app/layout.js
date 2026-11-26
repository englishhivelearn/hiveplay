export const metadata = { title: 'Hive Play', robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Nunito:wght@500;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/hive.css" />
      </head>
      <body>
        <div className="mesh" aria-hidden="true"><i className="a" /><i className="b" /><i className="c" /><i className="d" /><i className="band" /></div>
        {children}
      </body>
    </html>
  );
}
