'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { hasConsent } from '@/lib/utils/cookie-consent';
import { trackPageView, isAnalyticsEnabled } from '@/lib/analytics/internal';

export default function InternalAnalytics() {
  const pathname = usePathname();
  const locale = useLocale();
  const previousPathRef = useRef<string | null>(null);
  const enterTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname) return;
    if (!hasConsent('analytics')) return;

    const now = Date.now();
    const previousPath = previousPathRef.current;
    const enterTime = enterTimeRef.current;

    // Send previous page with time on page (if we had one)
    if (previousPath != null && previousPath !== pathname) {
      const timeOnPageMs = Math.round(now - enterTime);
      trackPageView({
        path: previousPath,
        locale,
        timeOnPageMs,
      });
    }

    // Send current page view (enter)
    trackPageView({
      path: pathname,
      locale,
      timeOnPageMs: 0,
    });

    previousPathRef.current = pathname;
    enterTimeRef.current = Date.now();
  }, [pathname, locale]);

  // On leave (tab close / navigate away), send current page time
  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname) return;
    if (!hasConsent('analytics')) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const timeOnPageMs = Math.round(Date.now() - enterTimeRef.current);
        trackPageView({
          path: pathname,
          locale,
          timeOnPageMs,
        });
      }
    };

    const handleBeforeUnload = () => {
      const timeOnPageMs = Math.round(Date.now() - enterTimeRef.current);
      trackPageView({
        path: pathname,
        locale,
        timeOnPageMs,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, locale]);

  return null;
}
