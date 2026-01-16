'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons/Icon';

export default function VerifyEmailTokenPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslation('auth');

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const token = params.token as string;

  // Validate and verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setIsValidating(false);
          setIsValid(false);
          return;
        }

        setIsValid(true);
        setIsVerified(true);
        setIsValidating(false);
      } catch (error) {
        console.error('Token verification error:', error);
        setIsValidating(false);
        setIsValid(false);
      }
    };

    verifyToken();
  }, [token]);

  // Countdown and redirect
  useEffect(() => {
    if (isVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isVerified && countdown === 0) {
      router.push(`/${locale}`);
    }
  }, [isVerified, countdown, locale, router]);

  const isRTL = locale === 'he';

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark">{t('verify.verifying')}</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="rounded-2xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('verify.welcome.invalidLink')}
              </h1>
              <p className="text-gray dark:text-gray-dark">
                {t('verify.welcome.invalidLinkDescription')}
              </p>
              <Link
                href={`/${locale}/register`}
                className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t('verify.welcome.backToRegister')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success message
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="rounded-2xl p-8 space-y-6 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Icon
              name="logo"
              className="w-[120px] h-auto text-text dark:text-text-dark"
            />
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('verify.welcome.title')}
            </h1>
            
            <p className="text-gray dark:text-gray-dark text-lg">
              {t('verify.welcome.thankYou')}
            </p>
            
            <p className="text-text-secondary dark:text-text-secondary-dark">
              {t('verify.welcome.redirecting')}
            </p>

            {/* Countdown */}
            {countdown > 0 && (
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                {t('verify.welcome.redirectingIn')} {countdown} {countdown === 1 ? t('verify.welcome.seconds') : t('verify.welcome.secondsPlural')}...
              </p>
            )}

            {/* Manual redirect link */}
            <Link
              href={`/${locale}`}
              className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline transition-colors"
            >
              {t('verify.welcome.clickHere')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

