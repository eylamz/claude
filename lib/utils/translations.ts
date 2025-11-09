import { useTranslations as useNextIntlTranslations } from 'next-intl';

export function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace);

  return t;
}

