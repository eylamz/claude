import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateMetadata as genMeta } from '@/lib/seo/utils';
import AccessibilityPageClient from './AccessibilityPageClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'accessibility' });

  return genMeta({
    title: t('title'),
    description: t('metaDescription'),
    url: `/${locale}/accessibility`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AccessibilityPageClient locale={locale} />;
}

