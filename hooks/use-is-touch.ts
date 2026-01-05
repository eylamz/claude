'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if the device supports touch
 * @returns true if device supports touch, false otherwise
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Check if device supports touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(hasTouch);
  }, []);

  return isTouch;
}











