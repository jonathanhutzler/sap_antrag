import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { origin, site } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(origin()),
  title: {
    default: `${site.name} — ${site.claim}`,
    template: `%s · ${site.name}`,
  },
  description: site.promise,
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: site.name,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
