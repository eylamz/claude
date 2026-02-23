import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { AppProviders } from '@/components/providers';
import { ReactNode } from 'react';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileNav from '@/components/layout/MobileNav';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages({ locale });
  
  // Determine HTML attributes based on locale
  const htmlDir = locale === 'he' ? 'rtl' : 'ltr';
  const htmlLang = locale === 'he' ? 'he' : 'en';
  const fontClass = locale === 'he' ? 'font-assistant' : 'font-poppins';

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProviders>
        <div dir={htmlDir} lang={htmlLang} className={`${fontClass} `}>
          {/* Nav loads first on every page; HeaderNav shows at 820px+, MobileNav below */}
          <HeaderNav />
          <MobileNav />
          {children}
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
