'use client';

import { Suspense, useState, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { sendPasswordResetEmailJS } from '@/lib/email/emailjs-service';

interface RegisterEmailErrors {
  general?: string;
}

function RegisterEmailPageContent() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const commonT = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<RegisterEmailErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // Validate email parameter and redirect if missing
  useEffect(() => {
    const emailFromParams = searchParams.get('email');
    
    if (!emailFromParams || !/\S+@\S+\.\S+/.test(emailFromParams)) {
      // Redirect to register if no valid email is provided
      startTransition(() => {
        router.push(`/${locale}/register`);
      });
      return;
    }
    
    setEmail(emailFromParams);
    setIsValidating(false);
  }, [searchParams, locale, router]);

  const handleContinue = async () => {
    setErrors({});

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ general: t('reset.errors.emailInvalid') || 'Invalid email address' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': locale,
        },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's an email not found error (404)
        if (response.status === 404 && data.error?.toLowerCase().includes('no account')) {
          setErrors({ general: t('reset.errors.emailNotFound') || 'No account found with this email address.' });
        } else {
          setErrors({ general: data.error || t('reset.errors.somethingWentWrong') || 'Something went wrong' });
        }
        setIsLoading(false);
        return;
      }

      // If we got a verification URL, send email via EmailJS (client-side)
      if (data.success && data.verificationUrl && data.email) {
        try {
          await sendPasswordResetEmailJS({
            toEmail: data.email,
            resetUrl: data.verificationUrl,
            locale: locale,
            type: 'email_verification',
          });
          
          // Success - redirect to verify page
          startTransition(() => {
            router.push(`/${locale}/register/email/verify?email=${encodeURIComponent(email)}`);
          });
        } catch (emailError: any) {
          console.error('Failed to send email via EmailJS:', emailError);
          setErrors({ 
            general: emailError.message || t('reset.errors.somethingWentWrong') || 'Something went wrong'
          });
          setIsLoading(false);
        }
      } else {
        // Fallback if API doesn't return expected data
        startTransition(() => {
          router.push(`/${locale}/register/email/verify?email=${encodeURIComponent(email)}`);
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setErrors({ general: t('reset.errors.somethingWentWrong') || 'Something went wrong' });
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
              {t('register.emailPage.title') || 'Email verification'}
            </h1>
            <p className="text-gray dark:text-gray-dark text-base">
              {t('register.emailPage.description', { email }) || `Click "Continue" to send an email verification to ${email}`}
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-bg dark:bg-red-bg-dark border border-red-border dark:border-red-border-dark rounded-lg p-3 text-sm text-red dark:text-red-dark animate-fade-in text-center">
              {errors.general}
            </div>
          )}

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
                  {t('reset.sending') || 'Sending...'}
                </span>
              ) : (
                t('reset.continue') || 'Continue'
              )}
            </Button>
          </div>

          {/* Back to Home */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-500">
            <Link
              href={`/${locale}`}
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue dark:hover:text-blue-dark hover:underline transition-colors"
            >
              {t('register.emailPage.backToHome') || 'Back to Home'}
            </Link>
          </p>

          {/* Terms and Privacy Policy Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400 pt-2">
            <Link
              href={`/${locale}/terms`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline"
            >
              {commonT('footer.termsOfService')}
            </Link>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <Link
              href={`/${locale}/terms#privacy-policy`}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors underline"
            >
              {commonT('footer.privacyPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center">
            <LoadingSpinner className="mb-4" />
            <p className="text-text dark:text-text-dark">Loading...</p>
          </div>
        </div>
      }
    >
      <RegisterEmailPageContent />
    </Suspense>
  );
}
