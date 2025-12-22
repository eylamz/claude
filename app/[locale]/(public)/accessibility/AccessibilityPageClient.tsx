'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

interface AccessibilityPageClientProps {
  locale: string;
}

export default function AccessibilityPageClient({ locale }: AccessibilityPageClientProps) {
  const t = useTranslations('accessibility');
  const isHebrew = locale === 'he';

  const getMetaDescription = useMemo(() => {
    return isHebrew 
      ? 'הצהרת נגישות של ENBOSS - קרא את הצהרת הנגישות המלאה שלנו המפרטת את המחויבות שלנו לנגישות דיגיטלית.'
      : 'Accessibility Statement for ENBOSS - Read our complete accessibility statement detailing our commitment to digital accessibility.';
  }, [isHebrew]);

  // Generate keywords based on language
  const getMetaKeywords = useMemo(() => {
    return isHebrew
      ? 'הצהרת נגישות, אנבוס, סקייטבורד, סקייטפארקים, ישראל, נגישות דיגיטלית'
      : 'accessibility statement, ENBOSS, skateboarding, skateparks, Israel, digital accessibility';
  }, [isHebrew]);

  return (
    <div className="min-h-screen">
      <div className="page max-w-4xl mx-auto px-4 py-0 text-text-secondary dark:text-text-secondary-dark">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-text dark:text-text-dark">
          {t('title')}
        </h1>
        
        <div className="space-y-4">
          <p>
            {t('intro')}
          </p>
        </div>

        <div className="mt-6">
          <h2 className="h2 text-xl sm:text-2xl font-semibold mb-3 text-text dark:text-text-dark">
            {t('complianceStatus.title')}
          </h2>
          <div className="space-y-2">
            <p>{t('complianceStatus.description')}</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="h2 text-xl sm:text-2xl font-semibold mb-3 text-text dark:text-text-dark">
            {t('measures.title')}
          </h2>
          <div className="space-y-2">
            <p>{t('measures.description')}</p>
            <ul className={isHebrew ? "list-disc pr-6 mr-6" : "list-disc pl-6"}>
              {t.raw('measures.items').map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="h2 text-xl sm:text-2xl font-semibold mb-3 text-text dark:text-text-dark">
            {t('improvement.title')}
          </h2>
          <div className="space-y-2">
            <p>{t('improvement.description')}</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="h2 text-xl sm:text-2xl font-semibold mb-3 text-text dark:text-text-dark">
            {t('contact.title')}
          </h2>
          <div className="space-y-2">
            <p>{t('contact.description')}</p>
            <ul className={isHebrew ? "list-disc pr-6 mr-6" : "list-disc pl-6"}>
              <li>{t('contact.email')}</li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-text dark:text-text-dark">
          {t('lastUpdated')}
        </p>
      </div>
    </div>
  );
}



