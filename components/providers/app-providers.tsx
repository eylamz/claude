'use client';

import { Suspense, ReactNode, useEffect } from 'react';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import InternalAnalytics from '@/components/analytics/InternalAnalytics';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { prefetchPopularSearchesForPrimaryLocales } from '@/lib/search/popular-cache';

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * App-level providers wrapper
 * Includes SessionProvider for NextAuth, ThemeProvider for theme management, TooltipProvider for tooltips, and Toaster for toast notifications.
 * When NEXT_PUBLIC_ENABLE_ANALYTICS is true, mounts InternalAnalytics (MongoDB) and GoogleAnalytics (GA4).
 */
export function AppProviders({ children }: AppProvidersProps) {
  // On first client render, prefetch popular searches for both en + he (48h TTL in localStorage)
  useEffect(() => {
    prefetchPopularSearchesForPrimaryLocales();
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        <TooltipProvider>
          {children}
          <Toaster />
          {ENABLE_ANALYTICS && (
            <>
              <InternalAnalytics />
              <Suspense fallback={null}>
                <GoogleAnalytics />
              </Suspense>
            </>
          )}
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

