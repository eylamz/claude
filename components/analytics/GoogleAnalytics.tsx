'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializeGA, pageview } from '@/lib/analytics/gtag';
import { hasConsent } from '@/lib/utils/cookie-consent';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize GA4 on mount if consent is given
    if (hasConsent('analytics')) {
      initializeGA();
    }

    // Listen for consent updates
    const handleConsentUpdate = () => {
      if (hasConsent('analytics')) {
        initializeGA();
        // Track current page view after consent
        if (pathname) {
          const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
          pageview(url);
        }
      }
    };

    window.addEventListener('cookieConsentUpdated', handleConsentUpdate);

    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate);
    };
  }, []);

  useEffect(() => {
    // Track page views on route change (only if consent is given)
    if (pathname && hasConsent('analytics')) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      pageview(url);
    }
  }, [pathname, searchParams]);

  return null;
}


