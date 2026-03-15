'use client';

import { Icon } from '@/components/icons';
import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/ui';
import { cn } from '@/lib/utils';

type Locale = 'en' | 'he';

interface NotFoundContentProps {
  locale: Locale;
  title: string;
  description: string;
  backHomeLabel: string;
  homeHref: string;
}

export function NotFoundContent({
  locale,
  title,
  description,
  backHomeLabel,
  homeHref,
}: NotFoundContentProps) {
  const isRtl = locale === 'he';
  const dir = isRtl ? 'rtl' : 'ltr';
  const lang = isRtl ? 'he' : 'en';
  const fontClass = isRtl ? 'font-assistant' : 'font-poppins';

  return (
    <div
      className={cn('pt-16 min-h-screen flex items-center justify-center px-4', fontClass)}
      dir={dir}
      lang={lang}
    >
      <Card className="max-w-2xl w-full">
        <CardContent className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <Icon name="searchClose" className="w-20 h-20 text-purple dark:text-orange-dark" />
          </div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {title}
          </h1>
          <p className="text-lg text-text-secondary dark:text-text-secondary-dark">
            {description}
          </p>
          <div className="pt-4">
            <Link href={homeHref}>
              <Button variant="brand" className="px-6 py-3">
                {backHomeLabel}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
