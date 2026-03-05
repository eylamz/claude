import { headers } from 'next/headers';
import { getMessages, getTranslations } from 'next-intl/server';
import { NotFoundWithNav } from '@/components/not-found/NotFoundWithNav';
import { locales, type Locale } from '@/i18n';

export default async function NotFound() {
  let locale: Locale = 'en';
  try {
    const headersList = await headers();
    const fromHeader = headersList.get('x-next-intl-locale');
    if (fromHeader && locales.includes(fromHeader as Locale)) {
      locale = fromHeader as Locale;
    }
  } catch {
    // headers() can throw in edge/build
  }

  const [messages, t] = await Promise.all([
    getMessages({ locale }),
    getTranslations({ locale, namespace: 'common.notFound' }),
  ]);

  return (
    <NotFoundWithNav
      locale={locale}
      messages={messages}
      title={t('title')}
      description={t('description')}
      backHomeLabel={t('backHome')}
    />
  );
}
