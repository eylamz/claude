'use client';

import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent } from '@/components/ui';
import { CheckCircle } from 'lucide-react';

export default function FormSuccessPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full bg-card dark:bg-card-dark">
        <CardContent className="p-12 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-20 h-20 text-green-500 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {locale === 'en' ? 'Thank You!' : 'תודה רבה!'}
          </h1>
          <p className="text-lg text-text-secondary dark:text-text-secondary-dark">
            {locale === 'en'
              ? 'Thank you for fulfilling the form and helping the community.'
              : 'תודה שמילאתם את הטופס ועזרתם לקהילה.'}
          </p>
          <div className="pt-4">
            <Button
              variant="blue"
              onClick={() => router.push(`/${locale}/growth-lab`)}
            >
              {locale === 'en' ? 'Back to Forms' : 'חזרה לטפסים'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
