'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { signIn, useSession, update } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { isRegisterEnabled, isLoginEnabled } from '@/lib/utils/ecommerce';

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const router = useRouter();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();
  const registerEnabled = isRegisterEnabled();
  const loginEnabled = isLoginEnabled();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const preferencesAppliedRef = useRef(false);

  // Redirect to home page if login is disabled
  useEffect(() => {
    if (!loginEnabled) {
      startTransition(() => {
        router.push(`/${locale}`);
      });
    }
  }, [loginEnabled, locale, router]);

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
        redirect: false,
      });

      if (result?.error) {
        setErrors({ general: t('login.errors.invalidCredentials') });
        setIsLoading(false);
        return;
      }

      // Success - try to update session (non-blocking)
      try {
        await update();
      } catch (updateError) {
        // Ignore update errors - router.refresh() will handle session update
        console.log('Session update skipped:', updateError);
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof LoginErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const isRTL = locale === 'he';

  // Show loading state while redirecting if login is disabled
  if (!loginEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
        <div className="text-center">
          <LoadingSpinner className="mb-4" />
          <p className="text-text dark:text-text-dark whitespace-pre-line">{t('login.disabledRedirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-[400px] animate-fade-in">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 space-y-6 border border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('login.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
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
          <form onSubmit={handleSubmit} className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200`}
                placeholder={t('login.email')}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400 animate-fade-in">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                } bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200`}
                placeholder={t('login.password')}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400 animate-fade-in">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 transition-colors"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {t('login.rememberMe')}
                </span>
              </label>
              <Link
                href={`/${locale}/auth/forgot-password`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
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

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                {locale === 'he' ? 'או המשך עם' : 'Or continue with'}
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                // Placeholder for Google sign-in
                console.log('Google sign-in');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300">
                {t('login.signInWithGoogle')}
              </span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                // Placeholder for Facebook sign-in
                console.log('Facebook sign-in');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300">
                {t('login.signInWithFacebook')}
              </span>
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
}

