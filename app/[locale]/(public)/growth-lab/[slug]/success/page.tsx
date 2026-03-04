'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent } from '@/components/ui';
import { CheckCircle } from 'lucide-react';
import { isGrowthLabEnabled } from '@/lib/utils/ecommerce';

export default function FormSuccessPage() {
  const locale = useLocale();
  const router = useRouter();
  const growthLabEnabled = isGrowthLabEnabled();

  // Redirect if Growth Lab is disabled
  useEffect(() => {
    if (!growthLabEnabled) {
      router.push(`/${locale}`);
    }
  }, [growthLabEnabled, locale, router]);

  // Show "Page in construction" if Growth Lab is disabled
  if (!growthLabEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'דף בבנייה' : 'Page in Construction'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {locale === 'he' 
              ? 'הדף זמין בקרוב. אנא נסו מאוחר יותר.'
              : 'Page is coming soon. Please check back later.'
            }
          </p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="brand"
            className="px-6 py-3"
          >
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Homepage'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-12 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-20 h-20 text-orange dark:text-orange-dark" />
          </div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {locale === 'en' ? 'Thank You!' : 'תודה רבה!'}
          </h1>
          <p className="text-lg text-text-secondary dark:text-text-secondary-dark">
            {locale === 'en'
              ? 'Thank you for fulfilling the survey and helping the community.'
              : 'תודה שמילאתם את הסקר ועזרתם לקהילה.'}
          </p>
          <div className="pt-4">
            <Button
              variant="orange"
              onClick={() => router.push(`/${locale}/growth-lab`)}
            >
              {locale === 'en' ? 'Back to Growth Lab' : 'חזרה למרחב'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
