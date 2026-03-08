'use client';

import { useEffect } from 'react';

/**
 * Loads animated background/button CSS after first paint so they don't block LCP.
 * Used in (public) layout so Footer and home page get styles on all public routes.
 */
export function DeferredAnimatedStyles() {
  useEffect(() => {
    import('@/app/[locale]/(public)/button-bg-animated.css');
    import('@/app/[locale]/(public)/card-bg-animated.css');
  }, []);
  return null;
}
