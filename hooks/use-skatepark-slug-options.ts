'use client';

import { useState, useEffect } from 'react';

const CACHE_KEY = 'skateparks_cache';

/**
 * Returns skatepark slugs from localStorage skateparks_cache for autocomplete.
 * Used on admin event edit/new when "Location is a skatepark" is checked.
 */
export function useSkateparkSlugOptions(): string[] {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const list = arr
          .map((p: { slug?: string }) => p.slug)
          .filter((s): s is string => typeof s === 'string' && s.length > 0);
        setSlugs([...new Set(list)]);
      }
    } catch {
      // ignore invalid cache
    }
  }, []);

  return slugs;
}
