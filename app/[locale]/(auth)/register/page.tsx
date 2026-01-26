'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { useTranslations } from 'next-intl';
import { Button, FloatingInput } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons/Icon';
import { registerUser } from '@/lib/actions/auth';
import { isRegisterEnabled } from '@/lib/utils/ecommerce';

interface RegisterErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  checks: {
    length: boolean;
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 12,
  };

  const score = checks.length ? 1 : 0;
  return { score, checks };
}

function getStrengthColor(score: number) {
  const colors = {
    0: 'bg-red-500',
    1: 'bg-green-500',
  };
  return colors[score as keyof typeof colors] || 'bg-gray-300';
}

export default function RegisterPage() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const commonT = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const registerEnabled = isRegisterEnabled();
  
  // Get email from URL params if available
  const emailFromParams = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: emailFromParams,
    password: '',
  });

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  // Update formData when email from params changes
  useEffect(() => {
    if (emailFromParams) {
      setFormData(prev => ({
        ...prev,
        email: emailFromParams,
      }));
    }
  }, [emailFromParams]);

  // Redirect to home page if registration is disabled
  useEffect(() => {
    if (!registerEnabled) {
      startTransition(() => {
        router.push(`/${locale}`);
      });
    }
  }, [registerEnabled, locale, router]);

  const validate = (): boolean => {
    const newErrors: RegisterErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = t('register.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('register.errors.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('register.errors.passwordRequired');
    } else if (formData.password.length < 12) {
      newErrors.password = t('register.errors.passwordMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // Register the user
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        setErrors({ general: result.error || t('register.errors.somethingWentWrong') });
        setIsLoading(false);
        return;
      }

      // Success - redirect to email verification page
      startTransition(() => {
        router.push(`/${locale}/register/email?email=${encodeURIComponent(formData.email)}`);
      });
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: t('register.errors.somethingWentWrong') });
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof RegisterErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const isRTL = locale === 'he';

  // Show loading state while redirecting if registration is disabled
  if (!registerEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark whitespace-pre-line">{t('register.disabledRedirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl p-8 space-y-6 ">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('register.title')}
            </h1>
            <p className="text-gray dark:text-gray-dark">
              {t('register.subtitle')}
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in text-center">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Email Field - Conditionally Read Only with Edit Button */}
            {emailFromParams ? (
              // Email from params (from login redirect) - read-only with Edit button
              <div className="w-full">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <FloatingInput
                      id="email"
                      name="email"
                      type="email"
                      label={t('register.email')}
                      value={formData.email}
                      disabled={true}
                      readOnly={true}
                      autoComplete="email"
                      error={errors.email}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="none"
                    size="sm"
                    onClick={() => {
                      startTransition(() => {
                        router.push(`/${locale}/login?email=${encodeURIComponent(formData.email)}`);
                      });
                    }}
                    className="h-10 !px-4 mb-0 -ms-[4.25rem] z-[2] hover:text-text dark:hover:text-white hover:!bg-transparent"
                    disabled={isLoading}
                  >
                    {t('login.edit') || 'Edit'}
                  </Button>
                </div>
              </div>
            ) : (
              // No email from params (from Sign Up link) - editable, no Edit button
              <FloatingInput
                id="email"
                name="email"
                type="email"
                label={t('register.email')}
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="email"
                error={errors.email}
              />
            )}

            {/* Password Field */}
            <div className="w-full space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingInput
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t('register.password')}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="new-password"
                    error={errors.password}
                  />
                </div>
                <Button
                  type="button"
                  variant="none"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-10 !px-4 mb-0 -ms-[3.759rem] z-[2] hover:text-text dark:hover:text-white hover:!bg-transparent"
                  disabled={isLoading}
                >
                  <Icon
                    name={showPassword ? "eyeClosed" : "eye"}
                    className="w-4 h-4"
                  />
                </Button>
              </div>

              {/* Password Strength Indicator */}
                  
                  {/* Password Requirements Checklist */}
                  {formData.password && (
                    <div className="space-y-1.5 mt-2">
                      <div className={`flex items-center gap-2 text-sm transition-colors ${
                        passwordStrength.checks.length
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {passwordStrength.checks.length ? (
                          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" strokeWidth="2" />
                          </svg>
                        )}
                        <span>{t('register.passwordRequirements.length')}</span>
                      </div>
                    </div>
                  )}
            </div>

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
                  <LoadingSpinner size={16} variant="brand" />
                </span>
              ) : (
                t('register.createAccount')
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('register.alreadyHaveAccount')}{' '}
            <Link
              href={`/${locale}/login`}
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {t('register.signIn')}
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
              href={`/${locale}/privacy`}
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

