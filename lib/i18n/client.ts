'use client';

import { useTranslations } from 'next-intl';

/**
 * Client-side translation hook
 * @param lng - The locale (currently unused but kept for API compatibility)
 * @param namespace - The translation namespace
 * @returns Object with translation function
 */
export function useTranslation(lng: string, namespace: string) {
  const t = useTranslations(namespace);
  
  return { t };
}







