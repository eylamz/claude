export type PopularSearchItem = {
  resultType: string;
  resultSlug: string;
  count: number;
  name?: string;
};

const ENABLE_ANALYTICS = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const CACHE_KEY = 'search_popular_clicks';
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

type PopularCachePayload = {
  fetchedAt: number;
  resultsByLocale: Record<string, PopularSearchItem[]>;
};

let inFlight: Promise<PopularCachePayload> | null = null;

export function isPopularCacheFresh(entry: PopularCachePayload | null) {
  if (!entry) return false;
  const fetchedAt = entry.fetchedAt;
  if (typeof fetchedAt !== 'number') return false;
  return Date.now() - fetchedAt <= CACHE_TTL_MS;
}

async function fetchPopularForLocale(locale: string): Promise<PopularSearchItem[]> {
  if (!ENABLE_ANALYTICS) return [];
  const url = `/api/search/popular?locale=${encodeURIComponent(locale)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: PopularSearchItem[] };
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function loadPopularSearches(locale: string): Promise<PopularSearchItem[]> {
  if (!ENABLE_ANALYTICS) return [];
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PopularCachePayload;
      if (isPopularCacheFresh(parsed)) {
        const byLocale = parsed.resultsByLocale || {};
        const existing = byLocale[locale];
        if (Array.isArray(existing)) {
          return existing;
        }
      }
    }
  } catch {
    // ignore invalid cache
  }

  // If a combined fetch is already in flight, wait for it and then return this locale's slice.
  if (inFlight) {
    const payload = await inFlight;
    const byLocale = payload.resultsByLocale || {};
    return byLocale[locale] || [];
  }

  // Start a combined fetch for both primary locales; cache together under single key.
  inFlight = (async () => {
    const [enResults, heResults] = await Promise.all([
      fetchPopularForLocale('en'),
      fetchPopularForLocale('he'),
    ]);
    const payload: PopularCachePayload = {
      fetchedAt: Date.now(),
      resultsByLocale: {
        en: enResults,
        he: heResults,
      },
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // ignore quota / private mode
    }
    return payload;
  })();

  try {
    const payload = await inFlight;
    const byLocale = payload.resultsByLocale || {};
    return byLocale[locale] || [];
  } finally {
    inFlight = null;
  }
}

// Prefetch popular searches for both main locales (en + he) on initial app load.
export function prefetchPopularSearchesForPrimaryLocales() {
  if (typeof window === 'undefined') return;
  if (!ENABLE_ANALYTICS) return;
  // Fire and forget; loadPopularSearches will fetch and cache both en + he together.
  void loadPopularSearches('en');
}

