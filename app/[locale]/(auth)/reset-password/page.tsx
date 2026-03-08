'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ResetErrors {
  general?: string;
}

function ResetPasswordContent() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Validate email parameter and redirect if missing
  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    
    if (!emailFromParams || !/\S+@\S+\.\S+/.test(emailFromParams)) {
      // Redirect to login if no valid email is provided
      startTransition(() => {
        router.push(`/${locale}/login`);
      });
      return;
    }
    
    setEmail(emailFromParams);
    setIsValidating(false);
  }, [searchParams, locale, router]);

  // Handle resend cooldown countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Set initial 20 second cooldown when success is shown
  useEffect(() => {
    if (isSuccess && resendCount === 0) {
      setResendCooldown(30);
    }
  }, [isSuccess, resendCount]);

  const handleContinue = async () => {
    setErrors({});
    setIsSuccess(false);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ general: t('reset.errors.emailInvalid') });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
        },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || t('reset.errors.somethingWentWrong') });
        setIsLoading(false);
        return;
      }

      if (data.success) {
        setIsSuccess(true);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ general: t('reset.errors.somethingWentWrong') });
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrors({});

    if (resendCooldown > 0) {
      return; // Still in cooldown
    }

    if (resendCount >= 3) {
      setErrors({ general: t('reset.resendMaxAttempts') });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
        },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || t('reset.errors.somethingWentWrong') });
        setIsLoading(false);
        return;
      }

      if (data.success) {
        const newCount = resendCount + 1;
        setResendCount(newCount);
        if (newCount === 1) {
          setResendCooldown(20);
        } else {
          setResendCooldown(60);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Resend email error:', error);
      setErrors({ general: t('reset.errors.somethingWentWrong') });
      setIsLoading(false);
    }
  };

  const isRTL = locale === 'he';

  // Show loading state while validating email parameter
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark whitespace-pre-line">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('reset.title')}
            </h1>
            <p className="text-gray dark:text-gray-dark text-base">
              {t('reset.clickContinue', { email }) || `Click "Continue" to reset your password for ${email}`}
            </p>
          </div>

          {/* Success Message */}
          {isSuccess && (
            <div className="bg-green-bg dark:bg-green-bg-dark border border-green-border dark:border-green-border-dark rounded-lg p-4 space-y-4 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green dark:text-green-dark">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{t('reset.success')}</span>
                </div>
                <p className="text-sm text-green dark:text-green-dark">
                  {t('reset.successDescription')}
                </p>
              </div>
              
              {/* Resend Button */}
              {resendCount < 5 && (
                <div className="flex flex-col gap-2 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={isLoading || resendCooldown > 0}
                    onClick={handleResend}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size={16} variant="brandText" />
                        {t('reset.sending')}
                      </span>
                    ) : resendCooldown > 0 ? (
                      t('reset.resendEmailWithCooldown', { seconds: resendCooldown })
                    ) : (
                      t('reset.resendEmail')
                    )}
                  </Button>
                </div>
              )}
              
              {resendCount >= 5 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  {t('reset.resendMaxAttempts')}
                </p>
              )}
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-bg dark:bg-red-bg-dark border border-red-border dark:border-red-border-dark rounded-lg p-3 text-sm text-red dark:text-red-dark animate-fade-in text-center">
              {errors.general}
            </div>
          )}

          {!isSuccess && (
            <>
              {/* Continue Button */}
              <div className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="w-full max-w-[270px]"
                  disabled={isLoading}
                  onClick={handleContinue}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('reset.sending')}
                    </span>
                  ) : (
                    t('reset.continue') || 'Continue'
                  )}
                </Button>
              </div>

              {/* Back to Login */}
              <p className="text-center text-sm text-gray-600 dark:text-gray-500">
                {t('reset.rememberPassword')}{' '}
                <Link
                  href={`/${locale}/login/password?email=${encodeURIComponent(email)}`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue dark:hover:text-blue-dark hover:underline transition-colors"
                >
                  {t('reset.signIn')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
      <div className="text-center">
        <LoadingSpinner className="mb-4" />
        <p className="text-text dark:text-text-dark whitespace-pre-line">Loading...</p>
      </div>
    </div>
  );
}export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
