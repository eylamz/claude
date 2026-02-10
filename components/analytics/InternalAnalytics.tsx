'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { hasConsent } from '@/lib/utils/cookie-consent';
import { trackPageView, isAnalyticsEnabled } from '@/lib/analytics/internal';

function getUserId(session: { user?: { id?: string } } | null): string | undefined {
  const id = session?.user?.id;
  return typeof id === 'string' && id ? id : undefined;
}

export default function InternalAnalytics() {
  const pathname = usePathname();
  const locale = useLocale();
  const { data: session } = useSession();
  const previousPathRef = useRef<string | null>(null);
  const enterTimeRef = useRef<number>(Date.now());
  const userId = getUserId(session);

  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname) return;
    if (!hasConsent('analytics')) return;

    const now = Date.now();
    const previousPath = previousPathRef.current;
    const enterTime = enterTimeRef.current;
    const payload = { locale, userId };

    // Send previous page with time on page (if we had one)
    if (previousPath != null && previousPath !== pathname) {
      const timeOnPageMs = Math.round(now - enterTime);
      trackPageView({
        path: previousPath,
        ...payload,
        timeOnPageMs,
      });
    }

    // Send current page view (enter)
    trackPageView({
      path: pathname,
      ...payload,
      timeOnPageMs: 0,
    });

    previousPathRef.current = pathname;
    enterTimeRef.current = Date.now();
  }, [pathname, locale, userId]);

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
          userId,
          timeOnPageMs,
        });
      }
    };

    const handleBeforeUnload = () => {
      const timeOnPageMs = Math.round(Date.now() - enterTimeRef.current);
      trackPageView({
        path: pathname,
        locale,
        userId,
        timeOnPageMs,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname, locale, userId]);

  return null;
}
