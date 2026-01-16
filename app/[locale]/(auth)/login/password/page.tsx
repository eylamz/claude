'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { Button, FloatingInput, Checkbox } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Icon } from '@/components/icons/Icon';
import { isRegisterEnabled, isLoginEnabled } from '@/lib/utils/ecommerce';

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPasswordPage() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();
  const registerEnabled = isRegisterEnabled();
  const loginEnabled = isLoginEnabled();
  
  // Get email from URL params
  const emailFromParams = searchParams.get('email') || '';
  
  const [formData, setFormData] = useState({
    email: emailFromParams,
    password: '',
    rememberMe: false,
  });
  
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const preferencesAppliedRef = useRef(false);

  // Redirect to login if no email is provided
  useEffect(() => {
    if (!emailFromParams || !loginEnabled) {
      if (!loginEnabled) {
        startTransition(() => {
          router.push(`/${locale}`);
        });
      } else {
        startTransition(() => {
          router.push(`/${locale}/login`);
        });
      }
    } else {
      // Update formData when email from params changes
      setFormData(prev => ({
        ...prev,
        email: emailFromParams,
      }));
    }
  }, [emailFromParams, loginEnabled, locale, router]);

  // Reset preferences flag when session is cleared
  useEffect(() => {
    if (!session) {
      preferencesAppliedRef.current = false;
    }
  }, [session]);

  // Apply user preferences after successful login
  useEffect(() => {
    if (session?.user?.preferences && !preferencesAppliedRef.current) {
      const { language, colorMode } = session.user.preferences;
      let shouldRedirect = false;
      let targetLocale = locale;
      
      // Apply theme immediately based on user's MongoDB preference
      if (colorMode) {
        let themeToApply: 'light' | 'dark';
        
        if (colorMode === 'system') {
          // Check system preference
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          themeToApply = systemPrefersDark ? 'dark' : 'light';
        } else {
          // Use user's explicit preference (light or dark)
          themeToApply = colorMode;
        }
        
        // Set localStorage to match user preference
        localStorage.setItem('theme', themeToApply);
        
        // Apply theme class immediately to update the UI
        const htmlElement = document.documentElement;
        if (themeToApply === 'dark') {
          htmlElement.classList.add('dark');
        } else if (themeToApply === 'light') {
          // Explicitly remove dark class for light theme to ensure proper light theme display
          htmlElement.classList.remove('dark');
        }
        
        // Verify localStorage was set correctly
        const verifyTheme = localStorage.getItem('theme');
        if (verifyTheme !== themeToApply) {
          // Retry if localStorage wasn't set correctly
          localStorage.setItem('theme', themeToApply);
        }
      }
      
      // Apply locale if different from current
      if (language && language !== locale) {
        targetLocale = language;
        shouldRedirect = true;
        // Set locale cookie
        document.cookie = `NEXT_LOCALE=${language}; path=/; max-age=31536000; SameSite=Lax`;
      }
      
      // Mark preferences as applied to prevent multiple applications
      preferencesAppliedRef.current = true;
      
      // If we need to redirect due to locale change, do it here
      // Otherwise, redirect to home page with current locale (if still on login page)
      if (shouldRedirect) {
        startTransition(() => {
          router.push(`/${targetLocale}`);
          router.refresh();
        });
      } else if (window.location.pathname.includes('/login') || window.location.pathname.includes('/register')) {
        // Only redirect if still on login/register page
        startTransition(() => {
          router.push(`/${locale}`);
          router.refresh();
        });
      }
    }
  }, [session, locale, router]);

  // Client-side validation
  const validate = (): boolean => {
    const newErrors: LoginErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = t('login.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('login.errors.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('login.errors.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('login.errors.passwordMin');
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
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe.toString(),
        redirect: false,
      });

      if (result?.error) {
        // Check if error is due to unverified email
        if (result.error === 'EMAIL_NOT_VERIFIED' || result.error.includes('EMAIL_NOT_VERIFIED')) {
          // Redirect to pending verification page
          startTransition(() => {
            router.push(`/${locale}/login/password/pending?email=${encodeURIComponent(formData.email)}`);
          });
          setIsLoading(false);
          return;
        }
        setErrors({ general: t('login.errors.invalidCredentials') });
        setIsLoading(false);
        return;
      }

      // Refresh router to ensure session is available
      router.refresh();
      
      // Immediately check for any existing theme in localStorage and apply it
      // This ensures theme consistency before session is fully loaded
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      // Wait a moment for session to be available before redirecting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Redirect to home page immediately after successful login
      // The useEffect will handle applying user preferences from MongoDB
      try {
        startTransition(() => {
          router.push(`/${locale}`);
        });
      } catch (redirectError) {
        // Fallback redirect if startTransition fails
        console.log('Redirect error, using fallback:', redirectError);
        window.location.href = `/${locale}`;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: t('login.errors.somethingWentWrong') });
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
    if (errors[name as keyof LoginErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleRememberMeChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      rememberMe: checked,
    }));
  };

  const handleEditEmail = () => {
    startTransition(() => {
      router.push(`/${locale}/login?email=${encodeURIComponent(formData.email)}`);
    });
  };

  const isRTL = locale === 'he';

  // Show loading state while redirecting if login is disabled or no email
  if (!loginEnabled || !emailFromParams) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark whitespace-pre-line">
            {!loginEnabled ? t('login.disabledRedirecting') : 'Redirecting...'}
          </p>
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
              {t('login.title')}
            </h1>
            <p className="text-gray dark:text-gray-dark">
              {t('login.subtitle')}
            </p>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Email Field - Read Only with Edit Button */}
            <div className="w-full">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingInput
                    id="email"
                    name="email"
                    type="email"
                    label={t('login.email')}
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
                  onClick={handleEditEmail}
                  className="h-10 !px-4 mb-0 -ms-[4.25rem] z-[2] hover:text-text dark:hover:text-white hover:!bg-transparent"
                  disabled={isLoading}
                >
                  {t('login.edit') || 'Edit'}
                </Button>
              </div>
            </div>

            {/* Password Field */}
            <div className="w-full">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FloatingInput
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label={t('login.password')}
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    autoComplete="current-password"
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

            {/* Remember Me & Forgot Password */}
            <div className={`flex items-center justify-between w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleRememberMeChange}
                label={t('login.rememberMe')}
                variant="brand"
              />
              <Link
                href={`/${locale}/reset-password?email=${encodeURIComponent(formData.email)}`}
                className="text-sm text-text-secondary dark:text-text-secondary-dark hover:underline transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
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
                  {t('login.signInButton')}
                </span>
              ) : (
                t('login.signInButton')
              )}
            </Button>
          </form>

          {/* Sign Up Link - Only show if registration is enabled */}
          {registerEnabled && (
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t('login.noAccount')}{' '}
              <Link
                href={`/${locale}/register`}
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {t('login.signUp')}
              </Link>
            </p>
          )}

          {/* Back to Home Link - Only show if registration is disabled */}
          {!registerEnabled && (
            <div className="text-center">
              <Link
                href={`/${locale}`}
                className="text-sm text-text-secondary dark:text-text-secondary-dark hover:underline transition-colors"
              >
                {t('login.backToHome')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

