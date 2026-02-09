'use client';

import { Suspense, useState, useTransition, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useTranslation } from '@/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button, FloatingInput } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { isRegisterEnabled, isLoginEnabled } from '@/lib/utils/ecommerce';
import { emailExists } from '@/lib/actions/auth';
import { Icon } from '@/components/icons/Icon';

const LOGIN_EMAIL_FAIL_KEY = 'login_email_fail_count';
const LOGIN_EMAIL_COOLDOWN_KEY = 'login_email_cooldown_end';

interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

function LoginPageContent() {
  const locale = useLocale();
  const t = useTranslation('auth');
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();
  const registerEnabled = isRegisterEnabled();
  const loginEnabled = isLoginEnabled();
  
  // Get email from URL params if available
  const emailFromParams = searchParams.get('email') || '';
  
  const [formData, setFormData] = useState({
    email: emailFromParams,
  });
  
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [cooldownEndMs, setCooldownEndMs] = useState<number | null>(null);
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(0);
  const preferencesAppliedRef = useRef(false);

  // Update formData when email from params changes
  useEffect(() => {
    if (emailFromParams) {
      setFormData(prev => ({
        ...prev,
        email: emailFromParams,
      }));
    }
  }, [emailFromParams]);

  // Restore cooldown from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(LOGIN_EMAIL_COOLDOWN_KEY);
    if (stored) {
      const end = parseInt(stored, 10);
      if (end > Date.now()) {
        setCooldownEndMs(end);
        setCooldownRemainingSec(Math.ceil((end - Date.now()) / 1000));
      } else sessionStorage.removeItem(LOGIN_EMAIL_COOLDOWN_KEY);
    }
  }, []);

  // Clear cooldown when time expires and update remaining seconds for button
  useEffect(() => {
    if (cooldownEndMs == null) return;
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((cooldownEndMs - now) / 1000));
      setCooldownRemainingSec(remaining);
      if (remaining <= 0) {
        setCooldownEndMs(null);
        sessionStorage.removeItem(LOGIN_EMAIL_COOLDOWN_KEY);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndMs]);

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

  // Client-side validation (email only)
  const validate = (): boolean => {
    const newErrors: LoginErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = t('login.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('login.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});

    // Validate email only
    if (!validate()) {
      return;
    }

    // Check cooldown (from state or sessionStorage)
    const now = Date.now();
    const cooldownEnd = cooldownEndMs ?? (typeof window !== 'undefined' ? parseInt(sessionStorage.getItem(LOGIN_EMAIL_COOLDOWN_KEY) ?? '', 10) : 0);
    if (cooldownEnd && now < cooldownEnd) {
      const seconds = Math.ceil((cooldownEnd - now) / 1000);
      toast({
        title: t('login.cooldown.tooManyAttempts'),
        description: t('login.cooldown.tryAgainInSeconds', { seconds: seconds.toString() }).replace('{seconds}', String(seconds)),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if email exists in database
      const exists = await emailExists(formData.email);
      
      if (!exists) {
        // Email doesn't exist
        if (registerEnabled) {
          startTransition(() => {
            router.push(`/${locale}/register?email=${encodeURIComponent(formData.email)}`);
          });
        } else {
          // Count failed attempt and apply cooldown after 4 failures
          const rawCount = typeof window !== 'undefined' ? sessionStorage.getItem(LOGIN_EMAIL_FAIL_KEY) : null;
          const count = (rawCount ? parseInt(rawCount, 10) : 0) + 1;
          sessionStorage.setItem(LOGIN_EMAIL_FAIL_KEY, String(count));

          if (count >= 4) {
            const cooldownSeconds = count === 4 ? 30 : 60;
            const end = now + cooldownSeconds * 1000;
            sessionStorage.setItem(LOGIN_EMAIL_COOLDOWN_KEY, String(end));
            setCooldownEndMs(end);
            setCooldownRemainingSec(cooldownSeconds);
            toast({
              title: t('login.cooldown.tooManyAttempts'),
              description: cooldownSeconds === 30
                ? t('login.cooldown.tryAgainInSeconds', { seconds: '30' }).replace('{seconds}', '30')
                : t('login.cooldown.tryAgainInMinute'),
              variant: 'destructive',
            });
          }
          setErrors({ general: t('login.errors.emailNotFound') || 'No account found with this email address.' });
        }
        setIsLoading(false);
        return;
      }

      // Email exists: clear email fail count and cooldown
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(LOGIN_EMAIL_FAIL_KEY);
        sessionStorage.removeItem(LOGIN_EMAIL_COOLDOWN_KEY);
      }
      setCooldownEndMs(null);

      // Navigate to password page with email as query parameter
      startTransition(() => {
        router.push(`/${locale}/login/password?email=${encodeURIComponent(formData.email)}`);
      });
      
      setIsLoading(false);
    } catch (error) {
      console.error('Navigation error:', error);
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
    
    // Also clear general error (email not found) when user starts typing in email field
    if (name === 'email' && errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined,
      }));
    }
  };

  const handleEmailFocus = () => {
    setIsEmailFocused(true);
    // Clear email error when user focuses on the field
    if (errors.email) {
      setErrors(prev => ({
        ...prev,
        email: undefined,
      }));
    }
    // Also clear general error (email not found) when user focuses on email field
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined,
      }));
    }
  };

  const handleEmailBlur = () => {
    setIsEmailFocused(false);
  };

  // Check if we should show error state (email error or email not found error)
  const showErrorState = (errors.email && !isEmailFocused) || 
    (errors.general === (t('login.errors.emailNotFound') || 'No account found with this email address.'));

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background dark:bg-background-dark">
      <div className="w-full max-w-[400px] animate-fadeIn">
        {/* Card */}
        <div className="flex flex-col gap-4 p-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-2">
            {/* Logo Icon - links to homepage */}
            <Link
              href={`/${locale}`}
              className="flex justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-main rounded-lg"
              aria-label={t('login.backToHome') || 'Back to home'}
            >
              <Icon
                name="logo"
                className={`w-[120px] h-auto transition-colors duration-300 hover:opacity-90 ${
                  showErrorState
                    ? 'text-red dark:text-red-dark'
                    : 'text-text dark:text-text-dark'
                }`}
              />
            </Link>
            <h1 className="text-[1rem] font-medium text-gray dark:text-gray-dark">
              {t('login.subtitle')}
            </h1>
          </div>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-bg dark:bg-red-bg-dark border border-red-border dark:border-red-border-dark rounded-lg p-3 text-sm text-red dark:text-red-dark animate-fade-in text-center">
              {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Email Field */}
            <FloatingInput
              id="email"
              name="email"
              type="email"
              label={t('login.email')}
              value={formData.email}
              onChange={handleChange}
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
              disabled={isLoading}
              autoComplete="email"
              error={errors.email}
            />

            {/* Continue Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={`w-full max-w-[270px] transition-colors duration-300 ${
                showErrorState
                  ? '!bg-red dark:!bg-red-dark'
                  : ''
              }`}
              disabled={isLoading || cooldownRemainingSec > 0}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size={16} variant="brand" />
                </span>
              ) : cooldownRemainingSec > 0 ? (
                t('login.cooldown.buttonWaitSeconds', { seconds: cooldownRemainingSec }).replace('{seconds}', String(cooldownRemainingSec))
              ) : (
                t('login.continue') || 'Continue'
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

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
