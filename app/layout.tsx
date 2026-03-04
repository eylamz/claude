import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { defaultLocale } from '@/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'ENBOSS - Unite & Ride',
  description: 'Find the best skateparks near you',
  openGraph: {
    images: [
      {
        url: 'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772474412/huuauefsaumesy5fsitc.jpg',
        secureUrl: 'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772474412/huuauefsaumesy5fsitc.jpg',
        width: 1424,
        height: 752,
        alt: 'ENBOSS - Unite & Ride',
        type: 'image/jpeg',
      },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const locale = headersList.get('x-next-intl-locale') || defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
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
