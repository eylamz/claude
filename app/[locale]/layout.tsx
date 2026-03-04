// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { AppProviders } from '@/components/providers';
import { ReactNode } from 'react';
import HeaderNav from '@/components/layout/HeaderNav';
import MobileNav from '@/components/layout/MobileNav';
import type { Metadata } from 'next';

const defaultOgImage = 'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772636312/bd6cugckdsmod2abmxhw.png';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';

const localeMetadata: Record<string, { title: string; description: string }> = {
  en: {
    title: 'ENBOSS - Unite & Ride',
    description: 'The home your wheels deserve. Discover, connect, and progress.',
  },
  he: {
    title: 'אנבוס - לאחד ולגלוש',
    description: 'המרכז לספורט גלגלים בישראל. המקום לגלות, להתחבר, ולהשתפר.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = localeMetadata[locale] ?? localeMetadata.en;
  return {
    metadataBase: new URL(siteUrl),
    title: meta.title,
    description: meta.description,
    icons: {
      icon: '/favicon.ico',
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    openGraph: {
      type: 'website',
      siteName: meta.title.split(' - ')[0],
      title: meta.title,
      description: meta.description,
      images: [
        {
          url: defaultOgImage,
          secureUrl: defaultOgImage,
          width: 1200,
          height: 630,
          alt: meta.title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [defaultOgImage],
    },
  };
}

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
