import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SiteHeader } from '@/components/SiteHeader';
import { BackendStatus } from '@/components/BackendStatus';
import { BottomNav } from '@/components/BottomNav';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DPTV — Maximum Effort Streaming',
  description: 'Maximum effort streaming. Discover and stream movies and series on DPTV.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'DPTV — Maximum Effort Streaming',
    description: 'Discover and stream movies and series.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebas.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Providers>
          <SiteHeader />
          <BackendStatus />
          <main className="pb-24 md:pb-20">{children}</main>
          <BottomNav />
          <footer className="border-t border-border-subtle mt-20 py-8 text-center text-text-muted text-sm">
            <p>DPTV · Maximum effort streaming · For demo purposes only</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
