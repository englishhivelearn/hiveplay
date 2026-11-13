import Script from 'next/script';

export default function GuruLayout({ children }) {
  return (
    <>
      {children}
      <Script src="/hive.js" strategy="afterInteractive" />
    </>
  );
}
