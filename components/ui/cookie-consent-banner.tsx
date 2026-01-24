'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from './button';
import { X, Settings, Check } from 'lucide-react';
import {
  getCookiePreferences,
  setCookiePreferences,
  acceptAllCookies,
  rejectNonEssentialCookies,
  hasGivenConsent,
  type CookieCategory,
} from '@/lib/utils/cookie-consent';

export default function CookieConsentBanner() {
  const t = useTranslations('common');
  const locale = useLocale();
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    functional: false,
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
        essential: existing.essential,
        analytics: existing.analytics,
        functional: existing.functional,
      });
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setIsVisible(false);
    // Trigger analytics initialization if needed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialCookies();
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const handleSavePreferences = () => {
    setCookiePreferences(preferences);
    setIsVisible(false);
    setShowSettings(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
    }
  };

  const toggleCategory = (category: CookieCategory) => {
    if (category === 'essential') return; // Essential cannot be toggled

    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!showSettings ? (
          // Main banner view
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('cookieConsent.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {t('cookieConsent.customize')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectNonEssential}
                className="text-gray-700 dark:text-gray-300"
              >
                {t('cookieConsent.rejectNonEssential')}
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-brand-main hover:bg-brand-main/90 text-white"
              >
                {t('cookieConsent.acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          // Settings view
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('cookieConsent.settings.title')}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label={t('cookieConsent.settings.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('cookieConsent.settings.description')}
            </p>

            {/* Cookie Categories */}
            <div className="space-y-4">
              {/* Essential Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {t('cookieConsent.categories.essential.title')}
                      </h4>
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        {t('cookieConsent.categories.essential.required')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('cookieConsent.categories.essential.description')}
                    </p>
                    <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.essential.examples.session')}</li>
                      <li>{t('cookieConsent.categories.essential.examples.security')}</li>
                      <li>{t('cookieConsent.categories.essential.examples.authentication')}</li>
                    </ul>
                  </div>
                  <div className="ml-4 flex items-center">
                    <div className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-end px-1 cursor-not-allowed">
                      <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {t('cookieConsent.categories.analytics.title')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('cookieConsent.categories.analytics.description')}
                    </p>
                    <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.analytics.examples.pageViews')}</li>
                      <li>{t('cookieConsent.categories.analytics.examples.userBehavior')}</li>
                      <li>{t('cookieConsent.categories.analytics.examples.performance')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => toggleCategory('analytics')}
                    className={`ml-4 w-10 h-6 rounded-full flex items-center transition-colors ${
                      preferences.analytics
                        ? 'bg-brand-main justify-end'
                        : 'bg-gray-300 dark:bg-gray-600 justify-start'
                    } px-1 cursor-pointer`}
                    aria-label={t('cookieConsent.categories.analytics.toggle')}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                  </button>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {t('cookieConsent.categories.functional.title')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('cookieConsent.categories.functional.description')}
                    </p>
                    <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
                      <li>{t('cookieConsent.categories.functional.examples.language')}</li>
                      <li>{t('cookieConsent.categories.functional.examples.theme')}</li>
                      <li>{t('cookieConsent.categories.functional.examples.preferences')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => toggleCategory('functional')}
                    className={`ml-4 w-10 h-6 rounded-full flex items-center transition-colors ${
                      preferences.functional
                        ? 'bg-brand-main justify-end'
                        : 'bg-gray-300 dark:bg-gray-600 justify-start'
                    } px-1 cursor-pointer`}
                    aria-label={t('cookieConsent.categories.functional.toggle')}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSettings(false);
                  handleRejectNonEssential();
                }}
              >
                {t('cookieConsent.rejectNonEssential')}
              </Button>
              <Button
                variant="outline"
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
                onClick={handleSavePreferences}
                className="bg-brand-main hover:bg-brand-main/90 text-white"
              >
                {t('cookieConsent.savePreferences')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
