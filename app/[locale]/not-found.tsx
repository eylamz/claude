'use client';

import { useLocale, useTranslations } from 'next-intl';
import { NotFoundContent } from '@/components/not-found/NotFoundContent';
import type { Locale } from '@/i18n';

export default function LocaleNotFound() {
  const locale = useLocale() as Locale;
  const t = useTranslations('common.notFound');

  return (
    <NotFoundContent
      locale={locale}
      title={t('title')}
      description={t('description')}
      backHomeLabel={t('backHome')}
      homeHref={`/${locale}`}
    />
  );
}
