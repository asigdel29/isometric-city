import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito, Caveat, Kalam } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { getLocale } from "gt-next/server";
import { GTProvider } from "gt-next";

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900']
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800']
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-doodle',
  display: 'swap',
  weight: ['400', '600', '700'],
});

const kalam = Kalam({
  subsets: ['latin'],
  variable: '--font-note',
  display: 'swap',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://iso-city.com'),
  title: {
    default: 'ai native city',
    template: 'ai native city — %s',
  },
  description: 'A richly detailed isometric city builder. Build your metropolis and manage resources with cars, planes, helicopters, boats, trains, citizens, and more.',
  openGraph: {
    title: 'ai native city',
    description: 'A richly detailed isometric city builder. Build your metropolis and manage resources with cars, planes, helicopters, boats, trains, citizens, and more.',
    type: 'website',
    siteName: 'ai native city',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1179,
        height: 1406,
        type: 'image/png',
        alt: 'ai native city — isometric city builder'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ai native city'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f1915'
};

export default async function RootLayout({ children }: {children: React.ReactNode;}) {
  return (
  <html className={`dark ${fraunces.variable} ${nunito.variable} ${caveat.variable} ${kalam.variable}`} lang={await getLocale()}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/assets/buildings/residential.png" />
        {/* Preload critical game assets - WebP for browsers that support it */}
        <link
        rel="preload"
        href="/assets/sprites_red_water_new.webp"
        as="image"
        type="image/webp" />

        <link
        rel="preload"
        href="/assets/water.webp"
        as="image"
        type="image/webp" />

      </head>
      <body className="bg-background text-foreground antialiased font-sans overflow-hidden"><GTProvider>{children}<Analytics /></GTProvider></body>
    </html>
  );
}