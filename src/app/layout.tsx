import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import './theme.css';
import './responsive.css';
import { SessionProvider } from '@/components/session';
import { Shell } from '@/components/shell';
import { config } from '@/lib/config';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0B1010' };
export const metadata: Metadata = {
  icons: {
    icon: { url: `${config.basePath}/brand/logo.png`, type: 'image/png' },
    apple: { url: `${config.basePath}/brand/logo.png`, type: 'image/png' }
  },
  title: {
    default: 'SerbisyoGo — Your home. In good hands.',
    template: '%s | SerbisyoGo'
  },
  description: 'Find local home service professionals in the Philippines. Compare services, book appointments and keep your home care in one place.'
};
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <html lang="en"><body><SessionProvider><Suspense fallback={<div className="boot-loading">Loading SerbisyoGo…</div>}><Shell>{children}</Shell></Suspense></SessionProvider></body></html>;
}
