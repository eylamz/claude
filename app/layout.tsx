import type { Metadata } from 'next';
import { Poppins, Assistant } from 'next/font/google';
import { headers } from 'next/headers';
import { defaultLocale } from '@/i18n';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const assistant = Assistant({
  subsets: ['latin', 'hebrew'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-assistant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ENBOSS - No Rider Left Behind',
  description: 'Find the best skateparks near you',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const locale = headersList.get('x-next-intl-locale') || defaultLocale;
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${poppins.variable} ${assistant.variable}`}>
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

