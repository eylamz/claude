'use client';

import { useTranslations as useNextIntlTranslations, useLocale } from 'next-intl';

type TranslationNamespaces = 'common' | 'shop' | 'admin' | 'auth' | 'contact';

/**
 * Enhanced useTranslation hook with type safety and namespace support
 * 
 * @example
 * ```tsx
 * const t = useTranslation('common');
 * return <h1>{t('welcome')}</h1>;
 * ```
 */
export function useTranslation(namespace: TranslationNamespaces) {
  return useNextIntlTranslations(namespace);
}

/**
 * Hook to get current locale
 */
export function useAppLocale() {
  return useLocale();
}

/**
 * Hook to get locale info (RTL, dir, lang)
 */
export function useLocaleInfo() {
  const locale = useLocale();
  const isRTL = locale === 'he';
  
  return {
    locale,
    isRTL,
    dir: isRTL ? 'rtl' : 'ltr',
    lang: isRTL ? 'he' : 'en',
    fontClass: isRTL ? 'font-hebrew' : 'font-sans',
  };
}

