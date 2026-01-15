'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { Button, Input } from '@/components/ui';
import { sendPasswordResetEmailJS } from '@/lib/email/emailjs-service';

interface ResetErrors {
  email?: string;
  general?: string;
}

export default function ResetPasswordPage() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: ResetErrors = {};

    if (!email.trim()) {
      newErrors.email = t('reset.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('reset.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSuccess(false);

    if (!validate()) {
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
        // Check if it's an email not found error (404)
        if (response.status === 404 && data.error?.toLowerCase().includes('no account')) {
          setErrors({ email: t('reset.errors.emailNotFound') });
        } else {
          setErrors({ general: data.error || t('reset.errors.somethingWentWrong') });
        }
        setIsLoading(false);
        return;
      }

      // If we got a reset URL, send email via EmailJS (client-side)
      if (data.success && data.resetUrl && data.email) {
        try {
          await sendPasswordResetEmailJS({
            toEmail: data.email,
            resetUrl: data.resetUrl,
          });
          
          // Success
          setIsSuccess(true);
          setIsLoading(false);
        } catch (emailError: any) {
          console.error('Failed to send email via EmailJS:', emailError);
          setErrors({ 
            general: emailError.message || t('reset.errors.somethingWentWrong')
          });
          setIsLoading(false);
        }
      } else {
        // Fallback if API doesn't return expected data
        setIsSuccess(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setErrors({ general: t('reset.errors.somethingWentWrong') });
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const isRTL = locale === 'he';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('reset.title')}
            </h1>
            <p className="text-gray dark:text-gray-dark">
              {t('reset.subtitle')}
            </p>
          </div>

          {/* Success Message */}
          {isSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg p-4 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{t('reset.success')}</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                {t('reset.successDescription')}
              </p>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
              {errors.general}
            </div>
          )}

          {!isSuccess && (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Email Field */}
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label={t('reset.email')}
                  value={email}
                  onChange={handleChange}
                  placeholder={t('reset.email')}
                  disabled={isLoading}
                  autoComplete="email"
                  error={errors.email}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full max-w-[270px]"
                  disabled={isLoading}
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
                    t('reset.sendLink')
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {t('reset.rememberPassword')}{' '}
                <Link
                  href={`/${locale}/login`}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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

