// app/layout.tsx
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { defaultLocale, locales, type Locale } from '@/i18n';
import { DEFAULT_OG_IMAGE, PRIMARY_OG_IMAGE } from '@/lib/seo/utils';
import { GoogleFontsLinks } from '@/components/GoogleFontsLinks';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ENBOSS - Unite & Ride',
  description: 'The home your wheels deserve. Discover, connect, and progress.',
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'ENBOSS',
    title: 'ENBOSS - Unite & Ride',
    description: 'The home your wheels deserve. Discover, connect, and progress.',
    url: siteUrl,
    images: [
      {
        url: PRIMARY_OG_IMAGE,
        secureUrl: PRIMARY_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'ENBOSS - Unite & Ride',
        type: 'image/jpeg',
      },
      {
        url: DEFAULT_OG_IMAGE,
        secureUrl: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'ENBOSS - Unite & Ride',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ENBOSS - Unite & Ride',
    description: 'The home your wheels deserve. Discover, connect, and progress.',
    images: [PRIMARY_OG_IMAGE, DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let locale: Locale = defaultLocale;
  try {
    const headersList = await headers();
    const fromHeader = headersList.get('x-next-intl-locale');
    if (fromHeader && locales.includes(fromHeader as Locale)) {
      locale = fromHeader as Locale;
    }
  } catch (e) {
    // headers() can throw in some runtimes (e.g. edge, build); keep defaultLocale so layout still renders and metadata is sent
  }
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && (
          <meta property="fb:app_id" content={process.env.NEXT_PUBLIC_FACEBOOK_APP_ID} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <GoogleFontsLinks />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
                  
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to light theme if there's an error
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
