/**
 * Search from localStorage caches (skateparks_cache, events_cache, guides_cache).
 * If a cache is missing, fetches full data from the same APIs the pages use,
 * stores in localStorage, then filters by query and maps to search result shape.
 * Uses flipLanguage so typing with wrong keyboard layout (e.g. "zfrui" for "זכרון") still matches.
 */

import { flipLanguage } from '@/lib/utils/transliterate';

export type SearchResultType = 'skateparks' | 'events' | 'guides';

export interface SearchResultFromCache {
  id: string;
  type: SearchResultType;
  slug: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  image?: string;
  coverImage?: string;
  area?: 'north' | 'center' | 'south';
  rating?: number;
  startDate?: string;
  description?: string;
  relatedSports?: string[];
  ratingCount?: number;
  readTime?: number;
  /** 'name' = matched by name; 'area' = matched only by area (shown last) */
  matchBy?: 'name' | 'area';
}

/** Area search terms: English and Hebrew (מרכז, דרום, צפון). */
const AREA_TERMS: Record<'north' | 'center' | 'south', string[]> = {
  north: ['north', 'צפון'],
  south: ['south', 'דרום'],
  center: ['center', 'מרכז'],
};

/** Category trigger terms: typing these (or ≥3 chars) shows all items in that category. Hebrew, English, wrong-keyboard. */
const CATEGORY_TRIGGERS: Record<SearchResultType, string[]> = {
  events: ['אירועים', 'events', 'thrugho', 'קמאד'],
  skateparks: ['סקייטפארקים', 'skateparks', 'parks', 'דלשאקפשרלד', 'xehhyptreho'],
  guides: ['מדריכים', 'guides', 'nsrhfho'],
};

const MIN_CATEGORY_CHARS = 3;

/** True if query (or flipped) has ≥minChars and matches any trigger (trigger contains query, or query contains trigger’s first minChars). */
export function queryMatchesCategory(
  query: string,
  category: SearchResultType,
  minChars: number = MIN_CATEGORY_CHARS
): boolean {
  const q = query.trim().toLowerCase();
  const flipped = flipLanguage(query).trim().toLowerCase();
  const check = (str: string): boolean => {
    if (str.length < minChars) return false;
    const triggers = CATEGORY_TRIGGERS[category];
    return triggers.some((t) => {
      const tLower = t.toLowerCase();
      return tLower.includes(str) || (tLower.length >= minChars && str.includes(tLower.slice(0, minChars)));
    });
  };
  return check(q) || (flipped.length >= minChars && check(flipped));
}

/** Resolve query to area when user types north/south/center or צפון/דרום/מרכז (incl. flipped layout). */
export function getAreaFromQuery(query: string): 'north' | 'center' | 'south' | null {
  const q = query.toLowerCase().trim();
  const flipped = flipLanguage(query).toLowerCase().trim();
  for (const [area, terms] of Object.entries(AREA_TERMS)) {
    if (terms.some((t) => t.toLowerCase() === q || t.toLowerCase() === flipped)) {
      return area as 'north' | 'center' | 'south';
    }
  }
  return null;
}

/** Max age for skateparks/events/guides cache before refetch (1 hour). */
export const SKATEPARKS_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
export const EVENTS_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
export const GUIDES_CACHE_MAX_AGE_MS = 60 * 60 * 1000;

/** Parse skateparks_version from localStorage: may be legacy number string or { version, fetchedAt }. fetchedAt can be number (ms) or human-readable ISO date string. */
export function parseSkateparksVersion(
  value: string | null
): { version?: number; fetchedAt?: number } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      let fetchedAtMs: number | undefined;
      if (typeof parsed.fetchedAt === 'number' && !isNaN(parsed.fetchedAt)) {
        fetchedAtMs = parsed.fetchedAt;
      } else if (typeof parsed.fetchedAt === 'string') {
        const ms = new Date(parsed.fetchedAt).getTime();
        if (!isNaN(ms)) fetchedAtMs = ms;
      }
      return {
        version: typeof parsed.version === 'number' ? parsed.version : Number(parsed.version) || undefined,
        fetchedAt: fetchedAtMs,
      };
    }
  } catch {
    // legacy: plain version number
  }
  const v = Number(value);
  if (!isNaN(v)) return { version: v };
  return {};
}

/** Human-readable timestamp for skateparks_version (e.g. "2025-02-04T14:30:00.000Z"). */
export function getSkateparksFetchedAtReadable(): string {
  return new Date().toISOString();
}

/** True if skateparks cache was fetched less than 1 hour ago. */
export function isSkateparksCacheFresh(fetchedAt: number | undefined): boolean {
  if (fetchedAt == null) return false;
  return Date.now() - fetchedAt < SKATEPARKS_CACHE_MAX_AGE_MS;
}

/** Parse events_version from localStorage: may be legacy number string or { version, fetchedAt }. fetchedAt can be number (ms) or human-readable ISO date string. */
export function parseEventsVersion(
  value: string | null
): { version?: number; fetchedAt?: number } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      let fetchedAtMs: number | undefined;
      if (typeof parsed.fetchedAt === 'number' && !isNaN(parsed.fetchedAt)) {
        fetchedAtMs = parsed.fetchedAt;
      } else if (typeof parsed.fetchedAt === 'string') {
        const ms = new Date(parsed.fetchedAt).getTime();
        if (!isNaN(ms)) fetchedAtMs = ms;
      }
      return {
        version: typeof parsed.version === 'number' ? parsed.version : Number(parsed.version) || undefined,
        fetchedAt: fetchedAtMs,
      };
    }
  } catch {
    // legacy: plain version number
  }
  const v = Number(value);
  if (!isNaN(v)) return { version: v };
  return {};
}

/** Human-readable timestamp for events_version (e.g. "2025-02-04T14:30:00.000Z"). */
export function getEventsFetchedAtReadable(): string {
  return new Date().toISOString();
}

/** True if events cache was fetched less than 1 hour ago. */
export function isEventsCacheFresh(fetchedAt: number | undefined): boolean {
  if (fetchedAt == null) return false;
  return Date.now() - fetchedAt < EVENTS_CACHE_MAX_AGE_MS;
}

/** Parse guides_version from localStorage: may be legacy number string or { version, fetchedAt }. fetchedAt can be number (ms) or human-readable ISO date string. */
export function parseGuidesVersion(
  value: string | null
): { version?: number; fetchedAt?: number } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null) {
      let fetchedAtMs: number | undefined;
      if (typeof parsed.fetchedAt === 'number' && !isNaN(parsed.fetchedAt)) {
        fetchedAtMs = parsed.fetchedAt;
      } else if (typeof parsed.fetchedAt === 'string') {
        const ms = new Date(parsed.fetchedAt).getTime();
        if (!isNaN(ms)) fetchedAtMs = ms;
      }
      return {
        version: typeof parsed.version === 'number' ? parsed.version : Number(parsed.version) || undefined,
        fetchedAt: fetchedAtMs,
      };
    }
  } catch {
    // legacy: plain version number
  }
  const v = Number(value);
  if (!isNaN(v)) return { version: v };
  return {};
}

/** Human-readable timestamp for guides_version (e.g. "2025-02-04T14:30:00.000Z"). */
export function getGuidesFetchedAtReadable(): string {
  return new Date().toISOString();
}

/** True if guides cache was fetched less than 1 hour ago. */
export function isGuidesCacheFresh(fetchedAt: number | undefined): boolean {
  if (fetchedAt == null) return false;
  return Date.now() - fetchedAt < GUIDES_CACHE_MAX_AGE_MS;
}

const CACHE_CONFIG = {
  skateparks: {
    key: 'skateparks_cache',
    versionKey: 'skateparks_version',
    fetchUrl: '/api/skateparks',
    parseResponse: (data: any) => data.skateparks || [],
    getVersion: (data: any) => data.version ?? 1,
  },
  events: {
    key: 'events_cache',
    versionKey: 'events_version',
    fetchUrl: '/api/events?full=true',
    parseResponse: (data: any) => data.events || [],
    getVersion: (data: any) => data.version ?? 1,
  },
  guides: {
    key: 'guides_cache',
    versionKey: 'guides_version',
    fetchUrl: '/api/guides?limit=100',
    parseResponse: (data: any) => data.guides || [],
    getVersion: (data: any) => data.version ?? 1,
  },
} as const;

function getLocalizedText(value: string | { en?: string; he?: string } | undefined, locale: string): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const loc = locale === 'he' ? 'he' : 'en';
  return value[loc] || value.en || value.he || '';
}

/** Match if text includes query OR flipped query (wrong keyboard layout, e.g. "zfrui" -> "זכרון"). */
function matchesQueryOrFlipped(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const flipped = flipLanguage(query);
  const flippedLower = flipped ? flipped.toLowerCase().trim() : '';
  const textLower = text.toLowerCase();
  return textLower.includes(q) || (flippedLower !== '' && textLower.includes(flippedLower));
}

/** Ensure cache is populated; return parsed array or null if fetch failed. */
async function getOrFillCache(
  category: keyof typeof CACHE_CONFIG
): Promise<any[] | null> {
  const config = CACHE_CONFIG[category];
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(config.key);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        // For skateparks/events: skip refetch if cache was fetched less than 1 hour ago
        if (category === 'skateparks') {
          const versionRaw = localStorage.getItem(config.versionKey);
          const { fetchedAt } = parseSkateparksVersion(versionRaw);
          if (isSkateparksCacheFresh(fetchedAt)) return arr;
        } else if (category === 'events') {
          const versionRaw = localStorage.getItem(config.versionKey);
          const { fetchedAt } = parseEventsVersion(versionRaw);
          if (isEventsCacheFresh(fetchedAt)) return arr;
        } else if (category === 'guides') {
          const versionRaw = localStorage.getItem(config.versionKey);
          const { fetchedAt } = parseGuidesVersion(versionRaw);
          if (isGuidesCacheFresh(fetchedAt)) return arr;
        } else {
          return arr;
        }
      }
    } catch {
      // invalid cache
    }
  }

  try {
    const res = await fetch(config.fetchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const items = config.parseResponse(data);
    if (!Array.isArray(items)) return null;
    const version = config.getVersion(data);
    localStorage.setItem(config.key, JSON.stringify(items));
    if (category === 'skateparks') {
      localStorage.setItem(
        config.versionKey,
        JSON.stringify({ version, fetchedAt: getSkateparksFetchedAtReadable() })
      );
    } else if (category === 'events') {
      localStorage.setItem(
        config.versionKey,
        JSON.stringify({ version, fetchedAt: getEventsFetchedAtReadable() })
      );
    } else if (category === 'guides') {
      localStorage.setItem(
        config.versionKey,
        JSON.stringify({ version, fetchedAt: getGuidesFetchedAtReadable() })
      );
    } else {
      localStorage.setItem(config.versionKey, String(version));
    }
    return items;
  } catch {
    return null;
  }
}

function searchSkateparks(
  items: any[],
  query: string,
  locale: string,
  limit: number
): SearchResultFromCache[] {
  // When query is a category trigger (e.g. "סקייטפארקים", "skateparks", "xehhyptreho"), show all skateparks
  if (queryMatchesCategory(query, 'skateparks')) {
    const results: SearchResultFromCache[] = [];
    for (const park of items) {
      if (results.length >= limit) break;
      const nameLocale = getLocalizedText(park.name, locale);
      const nameEn = getLocalizedText(park.name, 'en');
      const nameHe = getLocalizedText(park.name, 'he');
      results.push({
        id: park._id?.toString() || park.id || park.slug,
        type: 'skateparks',
        slug: park.slug,
        name: nameLocale || nameEn || nameHe,
        imageUrl: park.imageUrl || park.images?.[0]?.url || '',
        area: park.area,
        rating: park.rating,
        matchBy: 'name',
      });
    }
    return results;
  }

  const q = query.toLowerCase().trim();
  const areaFromQuery = getAreaFromQuery(query);
  const nameMatchedIds = new Set<string>();
  const nameResults: SearchResultFromCache[] = [];
  const areaResults: SearchResultFromCache[] = [];

  // 1) Name matches first
  for (const park of items) {
    const nameEn = getLocalizedText(park.name, 'en');
    const nameHe = getLocalizedText(park.name, 'he');
    const nameLocale = getLocalizedText(park.name, locale);
    if (!q || matchesQueryOrFlipped(nameEn, query) || matchesQueryOrFlipped(nameHe, query)) {
      const id = park._id?.toString() || park.id || park.slug;
      nameMatchedIds.add(id);
      nameResults.push({
        id,
        type: 'skateparks',
        slug: park.slug,
        name: nameLocale || nameEn || nameHe,
        imageUrl: park.imageUrl || park.images?.[0]?.url || '',
        area: park.area,
        rating: park.rating,
        matchBy: 'name',
      });
      if (nameResults.length >= limit) break;
    }
  }

  // 2) Area matches last (only when query is an area term; exclude already name-matched)
  if (areaFromQuery && nameResults.length < limit) {
    const areaLimit = limit - nameResults.length;
    for (const park of items) {
      if (areaResults.length >= areaLimit) break;
      const id = park._id?.toString() || park.id || park.slug;
      if (nameMatchedIds.has(id)) continue;
      if (park.area === areaFromQuery) {
        const nameLocale = getLocalizedText(park.name, locale);
        const nameEn = getLocalizedText(park.name, 'en');
        const nameHe = getLocalizedText(park.name, 'he');
        areaResults.push({
          id,
          type: 'skateparks',
          slug: park.slug,
          name: nameLocale || nameEn || nameHe,
          imageUrl: park.imageUrl || park.images?.[0]?.url || '',
          area: park.area,
          rating: park.rating,
          matchBy: 'area',
        });
      }
    }
  }

  return [...nameResults, ...areaResults];
}

function searchEvents(
  items: any[],
  query: string,
  locale: string,
  limit: number
): SearchResultFromCache[] {
  // When query is a category trigger (e.g. "אירועים", "events", "thrugho"), show all events
  if (queryMatchesCategory(query, 'events')) {
    const results: SearchResultFromCache[] = [];
    for (const event of items) {
      if (results.length >= limit) break;
      const title = getLocalizedText(
        event.content?.en?.title != null
          ? { en: event.content.en.title, he: event.content?.he?.title }
          : event.title,
        locale
      );
      const startDate = event.dateTime?.startDate ?? event.startDate;
      const startStr = typeof startDate === 'string' ? startDate : startDate?.toISO?.() ?? '';
      results.push({
        id: event._id?.toString() || event.id || event.slug,
        type: 'events',
        slug: event.slug,
        title,
        image:
          typeof event.featuredImage === 'string'
            ? event.featuredImage
            : event.featuredImage?.url ?? event.images?.[0]?.url ?? '',
        startDate: startStr,
      });
    }
    return results;
  }

  const results: SearchResultFromCache[] = [];
  for (const event of items) {
    const title = getLocalizedText(
      event.content?.en?.title != null
        ? { en: event.content.en.title, he: event.content?.he?.title }
        : event.title,
      locale
    );
    const titleEn = getLocalizedText(
      event.content?.en?.title != null
        ? { en: event.content.en.title, he: event.content?.he?.title }
        : event.title,
      'en'
    );
    const titleHe = getLocalizedText(
      event.content?.he?.title != null
        ? { en: event.content?.en?.title, he: event.content.he.title }
        : event.title,
      'he'
    );
    const searchable = `${titleEn} ${titleHe}`;
    if (!query.trim() || matchesQueryOrFlipped(searchable, query)) {
      const startDate =
        event.dateTime?.startDate ?? event.startDate;
      const startStr =
        typeof startDate === 'string' ? startDate : startDate?.toISO?.() ?? '';
      results.push({
        id: event._id?.toString() || event.id || event.slug,
        type: 'events',
        slug: event.slug,
        title,
        image:
          typeof event.featuredImage === 'string'
            ? event.featuredImage
            : event.featuredImage?.url ?? event.images?.[0]?.url ?? '',
        startDate: startStr,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchGuides(
  items: any[],
  query: string,
  locale: string,
  limit: number
): SearchResultFromCache[] {
  // When query is a category trigger (e.g. "מדריכים", "guides", "nsrhfho"), show all guides
  if (queryMatchesCategory(query, 'guides')) {
    const results: SearchResultFromCache[] = [];
    for (const guide of items) {
      if (results.length >= limit) break;
      results.push({
        id: guide.id ?? guide._id?.toString() ?? guide.slug,
        type: 'guides',
        slug: guide.slug,
        title: getLocalizedText(guide.title, locale),
        description: getLocalizedText(guide.description, locale),
        coverImage: guide.coverImage ?? '',
        relatedSports: guide.relatedSports,
        rating: guide.rating,
        ratingCount: guide.ratingCount,
        readTime: guide.readTime,
      });
    }
    return results;
  }

  const results: SearchResultFromCache[] = [];
  for (const guide of items) {
    const title = getLocalizedText(guide.title, locale);
    const titleEn = getLocalizedText(guide.title, 'en');
    const titleHe = getLocalizedText(guide.title, 'he');
    const descEn = getLocalizedText(guide.description, 'en');
    const descHe = getLocalizedText(guide.description, 'he');
    const searchable = `${titleEn} ${titleHe} ${descEn} ${descHe}`;
    if (!query.trim() || matchesQueryOrFlipped(searchable, query)) {
      results.push({
        id: guide.id ?? guide._id?.toString() ?? guide.slug,
        type: 'guides',
        slug: guide.slug,
        title,
        description: getLocalizedText(guide.description, locale),
        coverImage: guide.coverImage ?? '',
        relatedSports: guide.relatedSports,
        rating: guide.rating,
        ratingCount: guide.ratingCount,
        readTime: guide.readTime,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

const SEARCH_LIMIT = 20;

/**
 * Search cached data (skateparks, events, guides). Uses localStorage first;
 * if a cache is missing, fetches from the same API the list pages use and
 * stores in localStorage, then filters by query.
 */
export async function searchFromCache(
  query: string,
  locale: string,
  categories: SearchResultType[]
): Promise<SearchResultFromCache[]> {
  const all: SearchResultFromCache[] = [];
  const limitPerCategory = Math.ceil(SEARCH_LIMIT / Math.max(1, categories.length));

  for (const category of categories) {
    const items = await getOrFillCache(category);
    if (!items || items.length === 0) continue;

    if (category === 'skateparks') {
      all.push(...searchSkateparks(items, query, locale, limitPerCategory));
    } else if (category === 'events') {
      all.push(...searchEvents(items, query, locale, limitPerCategory));
    } else if (category === 'guides') {
      all.push(...searchGuides(items, query, locale, limitPerCategory));
    }
  }

  return all.slice(0, SEARCH_LIMIT);
}
