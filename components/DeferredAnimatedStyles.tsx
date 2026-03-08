'use client';

import { useEffect } from 'react';

/**
 * Loads animated button CSS after first paint so they don't block LCP.
 * Card gradient CSS is no longer loaded so gradient/orb effects don't appear on the homepage whyEnboss section.
 */
export function DeferredAnimatedStyles() {
  useEffect(() => {
    import('@/app/[locale]/(public)/button-bg-animated.css');
  }, []);
  return null;
}
