'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/hooks';
import { Button, Input } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons/Icon';

interface ResetErrors {
  password?: string;
  confirmPassword?: string;
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


export default function ResetConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslation('auth');

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ResetErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);
  const token = params.token as string;

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setIsValidating(false);
          setIsValid(false);
          return;
        }

        setIsValid(true);
        setEmail(data.email);
        setIsValidating(false);
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidating(false);
        setIsValid(false);
      }
    };

    validateToken();
  }, [token]);

  const validate = (): boolean => {
    const newErrors: ResetErrors = {};

    if (!formData.password) {
      newErrors.password = t('reset.confirm.errors.passwordRequired');
    } else if (formData.password.length < 12) {
      newErrors.password = t('reset.confirm.errors.passwordMin');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('reset.confirm.errors.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('reset.confirm.errors.passwordsDontMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || t('reset.confirm.errors.somethingWentWrong') });
        setIsLoading(false);
        return;
      }

      // Auto-login after password reset
      await signIn('credentials', {
        email,
        password: formData.password,
        redirect: false,
      });

      // Redirect to account page
      router.push(`/${params.locale}/account`);
    } catch (error) {
      console.error('Reset confirmation error:', error);
      setErrors({ general: t('reset.confirm.errors.somethingWentWrong') });
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof ResetErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const isRTL = locale === 'he';

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark">{t('reset.confirm.validating')}</p>
        </div>
      </div>
    );
  }

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
                {t('reset.confirm.invalidToken')}
              </h1>
              <p className="text-gray dark:text-gray-dark">
                {t('reset.confirm.invalidTokenDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('reset.confirm.title')}
            </h1>
            <p className="text-gray dark:text-gray-dark">
              {t('reset.confirm.subtitle')}
            </p>
          </div>

          {/* Error Message */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in text-center">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Password Field */}
            <div className="w-full space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t('reset.confirm.newPassword')}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('reset.confirm.newPassword')}
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
            </div>

            {/* Confirm Password Field */}
            <div className="w-full space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t('reset.confirm.confirmPassword')}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('reset.confirm.confirmPassword')}
                    disabled={isLoading}
                    autoComplete="new-password"
                    error={errors.confirmPassword}
                  />
                </div>
                <Button
                  type="button"
                  variant="none"
                  size="sm"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="h-10 !px-4 mb-0 -ms-[3.759rem] z-[2] hover:text-text dark:hover:text-white hover:!bg-transparent"
                  disabled={isLoading}
                >
                  <Icon
                    name={showConfirmPassword ? "eyeClosed" : "eye"}
                    className="w-4 h-4"
                  />
                </Button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && !errors.confirmPassword && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  ✓ {t('reset.confirm.passwordsMatch')}
                </p>
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
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('reset.confirm.updating')}
                </span>
              ) : (
                t('reset.confirm.updatePassword')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

