'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from './button';
import { X } from 'lucide-react';
import { Icon } from '@/components/icons';
import {
  getCookiePreferences,
  setCookiePreferences,
  acceptAllCookies,
  rejectNonEssentialCookies,
  hasGivenConsent,
  type CookieCategory,
} from '@/lib/utils/cookie-consent';
import { trackConsent } from '@/lib/analytics/internal';
import { Switch } from '@/components/ui/switch';

export default function CookieConsentBanner() {
  const t = useTranslations('common');
  const locale = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    functional: true,
  });

  useEffect(() => {
    // Check if user has already given consent
    if (!hasGivenConsent()) {
      setIsVisible(true);
    }

    // Load existing preferences if any
    const existing = getCookiePreferences();
    if (existing) {
      setPreferences({
        essential: true, // Always enabled, cannot be disabled
        analytics: existing.analytics,
        functional: existing.functional,
      });
    }

    // Listen for show cookie settings event
    const handleShowSettings = () => {
      setIsVisible(true);
      setShowSettings(true);
    };

    window.addEventListener('showCookieSettings', handleShowSettings);

    return () => {
      window.removeEventListener('showCookieSettings', handleShowSettings);
    };
  }, []);

  const handleAcceptAll = () => {
    trackConsent('accept_all');
    acceptAllCookies();
    setIsVisible(false);
    // Trigger analytics initialization if needed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const handleRejectNonEssential = () => {
    trackConsent('reject_non_essential');
    rejectNonEssentialCookies();
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const handleSavePreferences = () => {
    trackConsent('save_preferences');
    setCookiePreferences({
      ...preferences,
      functional: true, // Always enabled, cannot be disabled
    });
    setIsVisible(false);
    setShowSettings(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const toggleCategory = (category: CookieCategory) => {
    if (category === 'essential' || category === 'functional') return; // Essential and functional cannot be toggled

    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  const isRtl = locale === 'he';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`fixed z-[10000] font-assistant bottom-4 left-4 right-4 lg:bottom-9 lg:left-9 lg:right-9 p-4 lg:py-6 lg:px-9 rounded-3xl border border-[#E5E5E5] dark:border-border-dark bg-white dark:bg-background-dark shadow-[0_8px_25px_rgba(16,42,118,0.17)] dark:shadow-none dark:[filter:drop-shadow(0_1px_1px_#66666612)_drop-shadow(0_2px_2px_#5e5e5e12)_drop-shadow(0_4px_4px_#7a5d4413)_drop-shadow(0_8px_8px_#5e5e5e12)_drop-shadow(0_16px_16px_#5e5e5e12)] opacity-0 animate-popUp transition-all duration-300 ${showSettings ? 'max-h-[85vh] overflow-y-auto' : ''}`}
      style={{ animationDelay: '3s' }}
    >
      <div className="flex-1 min-w-0 w-full">
        <div className="relative">
          {/* Main banner view */}
          <div
            className={`transition-all duration-200 ease-in-out ${
              showSettings
                ? 'opacity-0 pointer-events-none absolute inset-0'
                : 'animate-fadeIn pointer-events-auto relative'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-start gap-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('cookieConsent.title')}
                </h3>
              <Icon name="cookieBold" className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-dark mb-4">
                  {t('cookieConsent.description')}{' '}
                  <Link
                    href={`/${locale}/cookies`}
                    className="text-brand-main dark:text-brand-dark hover:underline"
                  >
                    {t('cookieConsent.learnMore')}
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="gray"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1"
                >
                  <Icon name="settingsBold" className="w-4 h-4" />
                </Button>
                <Button
                  variant="gray"
                  size="sm"
                  onClick={handleRejectNonEssential}
                >
                  {t('cookieConsent.rejectNonEssential')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleAcceptAll}
                  className="!px-4 font-semibold"
                >
                  {t('cookieConsent.acceptAll')}
                </Button>
              </div>
            </div>
          </div>

          {/* Settings view */}
          <div
            className={`pt-6 md:p-0 transition-all duration-200 ease-in-out ${
              showSettings
                ? 'animate-fadeIn pointer-events-auto relative'
                : 'opacity-0 pointer-events-none absolute inset-0'
            }`}
          >
            <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-text dark:text-text-dark">
                {t('cookieConsent.settings.title')}
              </h3>
              <Icon name="cookieBold" className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray dark:text-gray-dark  hover:text-text-dark dark:hover:text-text-dark"
                aria-label={t('cookieConsent.settings.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray dark:text-gray-dark">
              {t('cookieConsent.settings.description')}
            </p>

            {/* Cookie Categories */}
            <div className="space-y-4">
              {/* Essential Cookies */}
              <div className="border border-gray-border dark:border-gray-border-dark rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-text dark:text-text-dark">
                        {t('cookieConsent.categories.essential.title')}
                      </h4>
                      <span className="text-xs bg-green-bg dark:bg-green-bg-dark border border-green-border dark:border-green-border-dark text-green dark:text-green-dark px-2 py-1 rounded">
                        {t('cookieConsent.categories.essential.required')}
                      </span>
                    </div>
                    <p className="text-sm text-gray dark:text-gray-dark mb-2">
                      {t('cookieConsent.categories.essential.description')}
                    </p>
                    <ul className="text-xs text-gray/70 dark:text-gray-dark/70 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.essential.examples.session')}</li>
                      <li>{t('cookieConsent.categories.essential.examples.security')}</li>
                      <li>{t('cookieConsent.categories.essential.examples.authentication')}</li>
                    </ul>
                  </div>
                  <div className="flex items-center">
                  <Switch
                    checked={preferences.essential}
                    onCheckedChange={() => toggleCategory('essential')}
                    variant="brand"
                    size="sm"
                    disabled={true}
                  />
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-border dark:border-gray-border-dark rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-text dark:text-text-dark mb-2">
                      {t('cookieConsent.categories.analytics.title')}
                    </h4>
                    <p className="text-sm text-gray dark:text-gray-dark mb-2">
                      {t('cookieConsent.categories.analytics.description')}
                    </p>
                    <ul className="text-xs text-gray/70 dark:text-gray-dark/70 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.analytics.examples.pageViews')}</li>
                      <li>{t('cookieConsent.categories.analytics.examples.userBehavior')}</li>
                      <li>{t('cookieConsent.categories.analytics.examples.performance')}</li>
                    </ul>
                  </div>
                  <Switch
                    checked={preferences.analytics}
                    onCheckedChange={() => toggleCategory('analytics')}
                    variant="brand"
                    size="sm"
                  />
                 
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="border border-gray-border dark:border-gray-border-dark rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-text dark:text-text-dark">
                        {t('cookieConsent.categories.functional.title')}
                      </h4>
                      <span className="text-xs bg-green-bg dark:bg-green-bg-dark border border-green-border dark:border-green-border-dark text-green dark:text-green-dark px-2 py-1 rounded">
                        {t('cookieConsent.categories.functional.required')}
                      </span>
                    </div>
                    <p className="text-sm text-gray dark:text-gray-dark mb-2">
                      {t('cookieConsent.categories.functional.description')}
                    </p>
                    <ul className="text-xs text-gray/70 dark:text-gray-dark/70 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.functional.examples.language')}</li>
                      <li>{t('cookieConsent.categories.functional.examples.theme')}</li>
                      <li>{t('cookieConsent.categories.functional.examples.preferences')}</li>
                      <li>{t('cookieConsent.categories.functional.examples.contentCache')}</li>
                    </ul>
                  </div>
                  <div className="flex items-center">
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={() => toggleCategory('functional')}
                      variant="brand"
                      size="sm"
                      disabled={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="my-4 flex flex-wrap items-center gap-3 pt-4 border-t border-gray-border dark:border-gray-border-dark">
              <Button
                variant="gray"
                size="sm"
                onClick={() => {
                  setShowSettings(false);
                  handleRejectNonEssential();
                }}
              >
                {t('cookieConsent.rejectNonEssential')}
              </Button>
              <Button
                variant="gray"
                size="sm"
                onClick={() => {
                  setPreferences({
                    essential: true,
                    analytics: true,
                    functional: true,
                  });
                }}
              >
                {t('cookieConsent.selectAll')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSavePreferences}
                className="!px-4 font-semibold"
              >
                {t('cookieConsent.savePreferences')}
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
