'use client';

import { NextIntlClientProvider } from 'next-intl';
import { AppProviders } from '@/components/providers';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileNav from '@/components/layout/MobileNav';
import { NotFoundContent } from './NotFoundContent';
import type { Locale } from '@/i18n';
import type { AbstractIntlMessages } from 'next-intl';

interface NotFoundWithNavProps {
  locale: Locale;
  messages: AbstractIntlMessages;
  title: string;
  description: string;
  backHomeLabel: string;
}

export function NotFoundWithNav({
  locale,
  messages,
  title,
  description,
  backHomeLabel,
}: NotFoundWithNavProps) {
  const htmlDir = locale === 'he' ? 'rtl' : 'ltr';
  const htmlLang = locale === 'he' ? 'he' : 'en';
  const fontClass = locale === 'he' ? 'font-assistant' : 'font-poppins';
  const homeHref = `/${locale}`;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AppProviders>
        <div dir={htmlDir} lang={htmlLang} className={fontClass}>
          <HeaderNav />
          <MobileNav />
          <NotFoundContent
            locale={locale}
            title={title}
            description={description}
            backHomeLabel={backHomeLabel}
            homeHref={homeHref}
          />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
