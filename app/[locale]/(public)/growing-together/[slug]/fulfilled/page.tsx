'use client';

import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent } from '@/components/ui';
import { Info } from 'lucide-react';

export default function FormFulfilledPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full bg-card dark:bg-card-dark">
        <CardContent className="p-12 text-center space-y-6">
          <div className="flex justify-center">
            <Info className="w-20 h-20 text-blue-500 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {locale === 'en' ? 'Already Submitted' : 'כבר נשלח'}
          </h1>
          <p className="text-lg text-text-secondary dark:text-text-secondary-dark">
            {locale === 'en'
              ? 'Thank you but we want others to fill the data too and not you because then the data will be mislead.'
              : 'תודה אבל אנחנו רוצים שאחרים ימלאו את הנתונים גם כן ולא אתם כי אז הנתונים יהיו מטעים.'}
          </p>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            {locale === 'en'
              ? 'To ensure data accuracy, each form can only be submitted once per user.'
              : 'כדי להבטיח דיוק נתונים, כל טופס יכול להישלח רק פעם אחת לכל משתמש.'}
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
