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
  const userId = getUserId(session);
  const previousPathRef = useRef<string | null>(null);
  const enterTimeRef = useRef<number>(Date.now());
  const lastTrackedPathRef = useRef<string | null>(null);
  const lastTrackedAtRef = useRef<number>(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // Only re-run on pathname/locale change so session loading doesn't trigger an extra page view
  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname) return;
    if (!hasConsent('analytics')) return;

    const now = Date.now();
    const previousPath = previousPathRef.current;
    const enterTime = enterTimeRef.current;
    const payload = { locale, userId: userIdRef.current };

    // Send previous page with time on page (if we had one)
    if (previousPath != null && previousPath !== pathname) {
      const timeOnPageMs = Math.round(now - enterTime);
      trackPageView({
        path: previousPath,
        ...payload,
        timeOnPageMs,
      });
    }

    // Dedupe: avoid double-sending same page view (e.g. React Strict Mode runs effects twice in dev)
    const DEDUPE_MS = 2000;
    if (
      lastTrackedPathRef.current === pathname &&
      now - lastTrackedAtRef.current < DEDUPE_MS
    ) {
      previousPathRef.current = pathname;
      enterTimeRef.current = Date.now();
      return;
    }

    // Send current page view (enter)
    trackPageView({
      path: pathname,
      ...payload,
      timeOnPageMs: 0,
    });

    lastTrackedPathRef.current = pathname;
    lastTrackedAtRef.current = Date.now();
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
          userId: userIdRef.current,
          timeOnPageMs,
        });
      }
    };

    const handleBeforeUnload = () => {
      const timeOnPageMs = Math.round(Date.now() - enterTimeRef.current);
      trackPageView({
        path: pathname,
        locale,
        userId: userIdRef.current,
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
