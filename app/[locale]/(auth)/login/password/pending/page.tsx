'use client';

import { useState, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { sendPasswordResetEmailJS } from '@/lib/email/emailjs-service';

interface PendingErrors {
  general?: string;
}

export default function LoginPendingPage() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<PendingErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

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

  const handleResend = async () => {
    setErrors({});

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ general: t('verify.errors.invalidEmail') });
      return;
    }

    if (resendCooldown > 0) {
      return; // Still in cooldown
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
        if (response.status === 429) {
          // Rate limited
          const retryAfter = data.retryAfter || 60;
          setResendCooldown(retryAfter);
          setErrors({ general: data.error || t('verify.errors.tooManyRequests') });
        } else if (response.status === 404 && data.error?.toLowerCase().includes('no account')) {
          setErrors({ general: t('verify.errors.emailNotFound') });
        } else {
          setErrors({ general: data.error || t('verify.errors.somethingWentWrong') });
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
          
          // Update resend count and set cooldown
          const newCount = resendCount + 1;
          setResendCount(newCount);
          
          // Set cooldown: 10 seconds for second time, then 1 minute
          if (newCount === 1) {
            setResendCooldown(10); // 10 seconds for second request
          } else {
            setResendCooldown(60); // 1 minute for subsequent requests
          }
          
          setIsLoading(false);
        } catch (emailError: any) {
          console.error('Failed to send email via EmailJS:', emailError);
          setErrors({ 
            general: emailError.message || t('verify.errors.somethingWentWrong')
          });
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Resend email error:', error);
      setErrors({ general: t('verify.errors.somethingWentWrong') });
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
          <p className="text-text dark:text-text-dark whitespace-pre-line">{t('verify.redirecting')}</p>
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
              {t('login.pending.title') || 'Verify Your Email'}
            </h1>
            <p className="text-gray dark:text-gray-dark text-base">
              {t('login.pending.description', { email }) || `You cannot log in until you verify your email address. Click "Resend Link" to send a new verification email to ${email}.`}
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-bg dark:bg-red-bg-dark border border-red-border dark:border-red-border-dark rounded-lg p-3 text-sm text-red dark:text-red-dark animate-fade-in">
              {errors.general}
            </div>
          )}

          {/* Resend Button */}
          <div className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full max-w-[270px]"
              disabled={isLoading || resendCooldown > 0}
              onClick={handleResend}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('verify.sending')}
                </span>
              ) : resendCooldown > 0 ? (
                t('login.pending.resendLinkWithCooldown', { seconds: resendCooldown })
              ) : (
                t('login.pending.resendLink')
              )}
            </Button>
          </div>
          
          {/* Back to Login */}
          <div className="text-center">
            <Link
              href={`/${locale}/login/password?email=${encodeURIComponent(email)}`}
              className="text-sm text-text-secondary dark:text-text-secondary-dark hover:underline transition-colors"
            >
              {t('login.pending.backToLogin') || 'Back to Login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

