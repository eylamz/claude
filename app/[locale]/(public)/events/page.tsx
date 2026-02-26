'use client';

import { useEffect, useState, useCallback, memo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { X, TrendingUp } from 'lucide-react';
import { Button, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { Icon } from '@/components/icons';
import { fullEventToListEvent } from '@/lib/events/formatEvent';
import { flipLanguage } from '@/lib/utils/transliterate';
import {
  queryMatchesCategory,
  parseEventsVersion,
  isEventsCacheFresh,
  getEventsFetchedAtReadable,
} from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';

/** Cache stores full event objects; list page needs list shape. */
function isFullFormatEvent(e: any): boolean {
  return e && (e.content != null || (e.dateTime != null && e.featuredImage != null));
}

function cacheToListEvents(cache: any[], locale: 'en' | 'he') {
  return cache.map((e) => (isFullFormatEvent(e) ? fullEventToListEvent(e, locale) : e));
}

/** Parse "tag:name" or "תג:name" from search query. */
function parseTagSearch(
  query: string
): { isTagSearch: true; tag: string } | { isTagSearch: false } {
  if (!query || typeof query !== 'string') return { isTagSearch: false };
  const trimmed = query.trim();
  const match = trimmed.match(/^\s*(?:tag|תג)\s*:\s*(.*)$/i);
  if (!match) return { isTagSearch: false };
  const tag = (match[1] ?? '').trim();
  return { isTagSearch: true, tag };
}

/** Get all tag strings from an event. */
function getEventTags(event: Event): string[] {
  const t = event.tags;
  if (!t || !Array.isArray(t)) return [];
  return t;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  interestedCount: number;
  maxParticipants?: number;
  currentParticipants: number;
  isFree: boolean;
  price?: number;
  sports: string[];
  tags?: string[];
  isHappeningNow: boolean;
  isPast: boolean;
}

// Sport mapping configuration - matching guides page
const SPORT_CONFIG = [
  {
    value: 'roller',
    iconName: 'Roller' as const,
    displayName: 'Roller',
    variant: 'teal' as const,
    tooltipEn: 'Filter by Roller events',
    tooltipHe: 'סנן לפי אירועי רולר',
  },
  {
    value: 'skate',
    iconName: 'Skate' as const,
    displayName: 'Skateboard',
    variant: 'teal' as const,
    tooltipEn: 'Filter by Skateboard events',
    tooltipHe: 'סנן לפי אירועי סקייט',
  },
  {
    value: 'scoot',
    iconName: 'scooter' as const,
    displayName: 'Scootering',
    variant: 'blue' as const,
    tooltipEn: 'Filter by Scoot events',
    tooltipHe: 'סנן לפי אירועי קורקינט',
  },
  {
    value: 'bmx',
    iconName: 'bmx-icon' as const,
    displayName: 'BMX',
    variant: 'teal' as const,
    tooltipEn: 'Filter by BMX events',
    tooltipHe: 'סנן לפי אירועי BMX',
  },
  {
    value: 'longboard',
    iconName: 'Longboard' as const,
    displayName: 'Longboard',
    variant: 'teal' as const,
    tooltipEn: 'Filter by Longboard events',
    tooltipHe: 'סנן לפי אירועי לונגבורד',
  },
  {
    value: 'ice-hocky',
    iconName: 'IceHocky' as const,
    displayName: 'Ice Hocky',
    variant: 'teal' as const,
    tooltipEn: 'Filter by Ice Hocky events',
    tooltipHe: 'סנן לפי אירועי הוקי קרח',
  },
  {
    value: 'roller-hocky',
    iconName: 'RollerHocky' as const,
    displayName: 'Roller Hocky',
    variant: 'teal' as const,
    tooltipEn: 'Filter by Roller Hocky events',
    tooltipHe: 'סנן לפי אירועי הוקי רולר',
  },
] as const;

// Utility function to optimize image URLs
const getOptimizedImageUrl = (originalUrl: string): string | null => {
  if (!originalUrl || originalUrl.trim() === '') return null;

  if (originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_800,c_fill,q_auto:good,f_auto/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

// Memoized thumbnail component
const EventThumbnail = memo(
  ({
    photoUrl,
    eventTitle,
    onLoad,
    alwaysSaturated = false,
  }: {
    photoUrl: string;
    eventTitle: string;
    onLoad?: () => void;
    alwaysSaturated?: boolean;
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      setIsLoaded(false);
      setHasError(false);
    }, [photoUrl]);

    useEffect(() => {
      const checkImageLoaded = () => {
        if (imgRef.current) {
          const img = imgRef.current;
          if (img.complete && img.naturalHeight !== 0) {
            setIsLoaded(true);
            setHasError(false);
            onLoad?.();
            return true;
          } else if (img.complete && img.naturalHeight === 0) {
            setIsLoaded(true);
            setHasError(true);
            return true;
          }
        }
        return false;
      };

      if (checkImageLoaded()) return;

      const timeout1 = setTimeout(() => {
        checkImageLoaded();
      }, 100);

      const timeout2 = setTimeout(() => {
        if (!isLoaded && !hasError && imgRef.current) {
          const img = imgRef.current;
          if (!img.complete || img.naturalHeight === 0) {
            setIsLoaded(true);
            setHasError(true);
          }
        }
      }, 3000);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }, [photoUrl, onLoad]);

    const handleImageLoad = () => {
      setIsLoaded(true);
      setHasError(false);
      onLoad?.();
    };

    const handleImageError = () => {
      setIsLoaded(true);
      setHasError(true);
    };

    const optimizedUrl = photoUrl ? getOptimizedImageUrl(photoUrl) : null;

    return (
      <>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-card dark:bg-card-dark flex items-center justify-center z-10">
            <LoadingSpinner />
          </div>
        )}
        {optimizedUrl ? (
          <img
            ref={imgRef}
            src={optimizedUrl}
            alt={eventTitle}
            className={`w-full h-full rounded-xl object-cover transition-all duration-200 select-none ${
              alwaysSaturated ? 'saturate-[1.75]' : 'saturate-150 group-hover:saturate-[1.75]'
            } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <div className="w-16 h-16 opacity-50 " />
          </div>
        )}
      </>
    );
  }
);
EventThumbnail.displayName = 'EventThumbnail';

/**
 * Event Card Component
 */
const EventCard = memo(
  ({
    event,
    locale,
    animationDelay = 0,
    getSportTranslation,
    highlightQuery,
  }: {
    event: Event;
    locale: string;
    animationDelay?: number;
    getSportTranslation: (sport: string) => string;
    highlightQuery?: string;
  }) => {
    const [isClicked, setIsClicked] = useState(false);
    const [showNameSection, setShowNameSection] = useState(false);
    const [showEventName, setShowEventName] = useState(false);
    const cardRef = useRef<HTMLAnchorElement>(null);
    const router = useRouter();
    const tr = useCallback(
      (enText: string, heText: string) => (locale === 'he' ? heText : enText),
      [locale]
    );

    useEffect(() => {
      const timer = setTimeout(() => {
        setShowNameSection(true);
        setTimeout(() => {
          setShowEventName(true);
        }, 0);
      }, 300 + animationDelay);
      return () => clearTimeout(timer);
    }, [animationDelay]);

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setIsClicked(true);
        setTimeout(() => {
          router.push(`/${locale}/events/${event.slug}`);
        }, 300);
      },
      [event.slug, locale, router]
    );

    const href = `/${locale}/events/${event.slug}`;
    const isPast = event.isPast;
    const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const formatted = date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      // Normalize to slashes (e.g. he-IL may use dots)
      return formatted.replace(/\./g, '/');
    };

    return (
      <Link
        ref={cardRef}
        href={href}
        onClick={handleCardClick}
        className={`block h-fit group rounded-xl cursor-pointer relative select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''} ${isPast ? 'opacity-60' : ''}`}
        style={{ animationDelay: `${animationDelay}ms` }}
        aria-label={event.title}
      >
        <div
          className="group-hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden"
          style={{
            filter:
              'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)',
          }}
        >
          {/* Sports Tags Overlay */}
          {event.sports && event.sports.length > 0 && (
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
              {event.sports.slice(0, 4).map((sport, idx) => {
                const sportLower = sport.toLowerCase();
                const sportConfig = SPORT_CONFIG.find(
                  (s) =>
                    s.value === sportLower ||
                    sportLower.includes(s.value) ||
                    s.displayName.toLowerCase() === sportLower
                );
                return (
                  <div
                    key={idx}
                    className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg"
                    title={sportConfig ? sportConfig.displayName : getSportTranslation(sport)}
                  >
                    {sportConfig ? (
                      <Icon name={sportConfig.iconName as any} className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-medium text-white">
                        {getSportTranslation(sport)}
                      </span>
                    )}
                  </div>
                );
              })}
              {event.sports.length > 4 && (
                <div className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg">
                  <span className="text-xs font-medium text-white">+{event.sports.length - 4}</span>
                </div>
              )}
            </div>
          )}

          {/* Status Badges */}
          {event.isHappeningNow && (
            <div className="absolute top-2 right-2 z-10">
              <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-red-500 dark:bg-red-600 text-white text-xs md:text-sm font-semibold px-2 md:px-3 py-1 rounded-full shadow-lg">
                {tr('Happening Now', 'קורה עכשיו')}
              </div>
            </div>
          )}
          {isFull && !event.isHappeningNow && (
            <div className="absolute top-2 right-2 z-10">
              <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-gray-800 dark:bg-gray-700 text-white text-xs md:text-sm font-semibold px-2 md:px-3 py-1 rounded-full shadow-lg">
                {tr('Full', 'מלא')}
              </div>
            </div>
          )}

          {/* Date Badge */}
          <div className="absolute bottom-2 left-0 z-10">
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-500 dark:bg-purple-600 text-white text-xs md:text-sm font-semibold px-2 md:px-3 py-1 rounded-r-full shadow-lg">
              {formatDate(event.startDate)}
            </div>
          </div>

          <EventThumbnail photoUrl={event.image || ''} eventTitle={event.title} />
        </div>

        {/* Name Section */}
        <div
          className="space-y-1 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showNameSection ? '200px' : '0',
            paddingTop: showNameSection ? '0.5rem' : '0',
            paddingBottom: showNameSection ? '0.5rem' : '0',
          }}
        >
          <h3
            className={`text-lg font-medium opacity-0 ${showEventName ? 'animate-fadeInDown animation-delay-[1s]' : ''}`}
          >
            {highlightQuery ? highlightMatch(event.title, highlightQuery) : event.title}
          </h3>
        </div>
      </Link>
    );
  }
);
EventCard.displayName = 'EventCard';

function EventsPageContent() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('events');

  const tr = useCallback(
    (enText: string, heText: string) => (locale === 'he' ? heText : enText),
    [locale]
  );

  // Helper function to get translated sport name
  const getSportTranslation = useCallback(
    (sport: string): string => {
      if (!sport) return sport;
      const sportKey = sport.toLowerCase();
      const translationKey = `sports.${sportKey}`;
      try {
        const translated = t(translationKey as any);
        if (translated && translated !== translationKey && !translated.startsWith('sports.')) {
          return translated;
        }
      } catch (e) {
        // Translation key doesn't exist
      }
      return sport.charAt(0).toUpperCase() + sport.slice(1);
    },
    [t]
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filtersData, setFiltersData] = useState<{ sports: string[] }>({ sports: [] });
  const [loading, setLoading] = useState(true);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  // Filters — support ?tag= for tag search (same as guides); ?search= for free text
  const tagFromUrl = searchParams.get('tag');
  const searchFromUrl = searchParams.get('search');
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get('sports')?.split(',').filter(Boolean) || []
  );
  const [searchQuery, setSearchQuery] = useState(
    tagFromUrl != null && tagFromUrl !== ''
      ? (locale === 'he' ? 'תג: ' : 'tag: ') + tagFromUrl
      : searchFromUrl || ''
  );
  const [hasSpotsAvailable, setHasSpotsAvailable] = useState(
    searchParams.get('hasSpots') === 'true'
  );

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 12;

  // UI State
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const versionCheckInFlightRef = useRef(false);

  // Track scroll position for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;

      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        setIsHeaderVisible(false);
      }

      prevScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 240);
    };

    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);
    setIsScrolled(initialScrollY > 240);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check version and cache on mount (refetch only after 1 hour from last fetch)
  useEffect(() => {
    const checkVersionAndCache = async () => {
      const cacheKey = 'events_cache';
      const versionKey = 'events_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersionRaw = localStorage.getItem(versionKey);
      const { version: storedVersionNum, fetchedAt } = parseEventsVersion(cachedVersionRaw);

      // If no cache or version, fetch and cache all events (full format for slug page)
      if (!cachedData || !cachedVersionRaw) {
        console.log('No cache found, fetching events for initial cache (full format)');
        try {
          const response = await fetch(`/api/events?full=true`);
          if (response.ok) {
            const data = await response.json();
            const currentVersion = data.version || 1;
            const allEvents = data.events || [];
            console.log('Initial cache fetch:', allEvents.length, 'events');
            localStorage.setItem(cacheKey, JSON.stringify(allEvents));
            localStorage.setItem(
              versionKey,
              JSON.stringify({ version: currentVersion, fetchedAt: getEventsFetchedAtReadable() })
            );
            setCurrentVersion(currentVersion);
          }
        } catch (error) {
          console.error('Error fetching events for cache:', error);
        }
      } else {
        // Cache exists, check if it has data
        try {
          const parsedCache = JSON.parse(cachedData);
          if (!Array.isArray(parsedCache) || parsedCache.length === 0) {
            console.log('Cache exists but is empty, will fetch fresh data');
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(versionKey);
          } else if (isEventsCacheFresh(fetchedAt)) {
            // Fetched less than 1 hour ago, skip version check and refetch
            setCurrentVersion(storedVersionNum ?? parseInt(cachedVersionRaw, 10));
            setCacheInitialized(true);
            return;
          } else {
            // Avoid duplicate version check when effect runs twice (e.g. React Strict Mode)
            if (versionCheckInFlightRef.current) {
              setCacheInitialized(true);
              return;
            }
            versionCheckInFlightRef.current = true;
            console.log(
              'Cache exists with',
              parsedCache.length,
              'events, checking version (cache older than 1h)'
            );
            try {
              const versionResponse = await fetch('/api/events?versionOnly=true');
              if (versionResponse.ok) {
                const versionData = await versionResponse.json();
                const fetchedVersion = versionData.version || 1;
                setCurrentVersion(fetchedVersion);
                const storedVersion = storedVersionNum ?? parseInt(cachedVersionRaw, 10);

                if (storedVersion !== fetchedVersion) {
                  console.log('Version mismatch, updating cache');
                  const response = await fetch(`/api/events?full=true`);
                  if (response.ok) {
                    const data = await response.json();
                    const newVersion = data.version || 1;
                    const allEvents = data.events || [];
                    localStorage.setItem(cacheKey, JSON.stringify(allEvents));
                    localStorage.setItem(
                      versionKey,
                      JSON.stringify({
                        version: newVersion,
                        fetchedAt: getEventsFetchedAtReadable(),
                      })
                    );
                    setCurrentVersion(newVersion);
                  }
                } else {
                  setCurrentVersion(storedVersion);
                }
              }
            } catch (error) {
              console.warn('Failed to check events version', error);
              if (cachedVersionRaw) {
                setCurrentVersion(storedVersionNum ?? parseInt(cachedVersionRaw, 10));
              }
            } finally {
              versionCheckInFlightRef.current = false;
            }
          }
        } catch (e) {
          console.warn('Failed to parse cache, clearing it', e);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(versionKey);
        }
      }

      setCacheInitialized(true);
    };

    checkVersionAndCache();
  }, [locale]);

  // Fetch events only when cache is initialized
  useEffect(() => {
    if (!cacheInitialized) return;
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, cacheInitialized]);

  // Extract filters from events data - normalize to SPORT_CONFIG values
  useEffect(() => {
    if (events.length > 0) {
      const sportsSet = new Set<string>();
      events.forEach((event) => {
        event.sports?.forEach((sport) => {
          // Normalize sport name to match SPORT_CONFIG values
          const sportLower = sport.toLowerCase();
          const matchingConfig = SPORT_CONFIG.find(
            (config) =>
              config.value === sportLower ||
              sportLower.includes(config.value) ||
              config.displayName.toLowerCase() === sportLower
          );
          if (matchingConfig) {
            sportsSet.add(matchingConfig.value);
          } else {
            // If no match, add the original sport name
            sportsSet.add(sport);
          }
        });
      });
      setFiltersData({
        sports: Array.from(sportsSet).sort(),
      });
    }
  }, [events]);

  // Filter events
  useEffect(() => {
    filterEvents();
  }, [events, selectedSports, searchQuery, hasSpotsAvailable]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const cacheKey = 'events_cache';
      const versionKey = 'events_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersionRaw = localStorage.getItem(versionKey);
      const { version: storedVersionNum, fetchedAt } = parseEventsVersion(cachedVersionRaw);

      if (cachedData && cachedVersionRaw) {
        try {
          const allCachedEvents = JSON.parse(cachedData);
          const storedVersion = storedVersionNum ?? parseInt(cachedVersionRaw, 10);

          if (Array.isArray(allCachedEvents) && allCachedEvents.length > 0) {
            let versionMatches = true;
            if (currentVersion !== null) {
              versionMatches = storedVersion === currentVersion;
            }
            if (versionMatches && (isEventsCacheFresh(fetchedAt) || currentVersion !== null)) {
              console.log('Using cached events:', allCachedEvents.length);
              setEvents(cacheToListEvents(allCachedEvents, locale as 'en' | 'he'));
              setLoading(false);
              return;
            }
            if (!versionMatches) console.log('Version mismatch, will fetch fresh data');
          } else {
            console.log('Cache exists but is empty, fetching fresh data');
          }
        } catch (e) {
          console.warn('Failed to parse cached events data', e);
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(versionKey);
        }
      } else {
        console.log('No cache found, fetching fresh data');
      }

      console.log('Fetching fresh events from API (full format)');
      const response = await fetch(`/api/events?full=true`);
      if (response.ok) {
        const data = await response.json();
        const fetchedVersion = data.version || 1;
        const allEvents = data.events || [];
        console.log('Fetched events from API:', allEvents.length);
        setEvents(cacheToListEvents(allEvents, locale as 'en' | 'he'));
        localStorage.setItem(cacheKey, JSON.stringify(allEvents));
        localStorage.setItem(
          versionKey,
          JSON.stringify({ version: fetchedVersion, fetchedAt: getEventsFetchedAtReadable() })
        );
        setCurrentVersion(fetchedVersion);
      } else {
        console.error('Failed to fetch events:', response.status, response.statusText);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Sports filter - using relatedSports like guides
    if (selectedSports.length > 0) {
      filtered = filtered.filter((event) =>
        event.sports?.some((sport) => {
          const sportLower = sport.toLowerCase();
          return selectedSports.some((selectedSport) => {
            // Check if sport matches selected sport (config value)
            if (selectedSport === sportLower) return true;
            // Check if sport matches any SPORT_CONFIG
            const matchingConfig = SPORT_CONFIG.find(
              (config) =>
                config.value === selectedSport &&
                (config.value === sportLower ||
                  sportLower.includes(config.value) ||
                  config.displayName.toLowerCase() === sportLower)
            );
            return !!matchingConfig;
          });
        })
      );
    }

    // Search query: tag: / תג: filter by tag; category trigger (show all); else match title + location
    if (searchQuery) {
      const tagSearch = parseTagSearch(searchQuery);
      if (tagSearch.isTagSearch) {
        const tagLower = tagSearch.tag.toLowerCase();
        filtered = filtered.filter((event) => {
          const tags = getEventTags(event);
          return tags.some(
            (t) => t.toLowerCase() === tagLower || t.toLowerCase().includes(tagLower)
          );
        });
      } else if (queryMatchesCategory(searchQuery, 'events')) {
        // Show all events when user types e.g. "אירועים", "events", "thrugho"
      } else {
        const query = searchQuery.toLowerCase().trim();
        const flipped = flipLanguage(searchQuery);
        const flippedLower = flipped ? flipped.toLowerCase().trim() : '';
        filtered = filtered.filter((event) => {
          const titleLower = event.title.toLowerCase();
          const locationLower = event.location?.toLowerCase() ?? '';
          return (
            titleLower.includes(query) ||
            locationLower.includes(query) ||
            (flippedLower &&
              (titleLower.includes(flippedLower) || locationLower.includes(flippedLower)))
          );
        });
      }
    }

    // Has spots available
    if (hasSpotsAvailable) {
      filtered = filtered.filter(
        (event) => !event.maxParticipants || event.currentParticipants < event.maxParticipants
      );
    }

    setFilteredEvents(filtered);
  };

  const handleClearFilters = () => {
    setSelectedSports([]);
    setSearchQuery('');
    setHasSpotsAvailable(false);
    setPage(1);
  };

  // Calculate pagination info
  const totalResults = filteredEvents.length;
  const totalPages = Math.ceil(totalResults / limit);
  const currentPage = page;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * limit, currentPage * limit);
  const showingFrom = (currentPage - 1) * limit + 1;
  const showingTo = Math.min(currentPage * limit, totalResults);

  const hasAnyFilter = selectedSports.length > 0 || hasSpotsAvailable || searchQuery.trim();

  const activeFiltersCount =
    selectedSports.length + (hasSpotsAvailable ? 1 : 0) + (searchQuery.trim() ? 1 : 0);
  const hasMultipleFilters = activeFiltersCount > 1;

  // Show relatedSports filter buttons only when 2+ sports have events (no point filtering with one)
  const sportFilterButtons =
    filtersData.sports.length >= 2
      ? SPORT_CONFIG.filter((sport) => filtersData.sports.includes(sport.value))
      : [];

  return (
    <div
      className="min-h-screen bg-background dark:bg-background-dark"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div className="relative pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Join the Experience', 'הצטרפו לחוויה')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Upcoming events and unforgettable moments.',
                'אירועים קרובים ורגעים בלתי נשכחים.'
              )}
            </p>

            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center justify-end gap-2 text-sm w-1/2">
                <Icon name="bellBold" className="w-3 h-3 text-brand-main" />
                <span className="text-gray-600 dark:text-gray-400">
                  {tr('Stay Tuned', 'הישארו מעודכנים')}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm w-1/2">
                <TrendingUp className="w-4 h-4 text-green-500" />

                <span className="text-gray-600 dark:text-gray-400">
                  {totalResults} {totalResults === 1 ? t('event') : t('events')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          STICKY FILTER BAR - Modern & Clean
      ======================================== */}
      <div
        className={`sticky z-40 transition-all duration-300 border-b-2 border-transparent ${
          isHeaderVisible ? 'top-16 md:top-16' : 'top-0'
        } ${
          isScrolled
            ? 'shadow-xl bg-header dark:bg-header-dark border-header-border dark:border-header-border-dark py-3'
            : 'py-4'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Main Filter Row */}
          <div className="flex flex-col xxs:flex-row items-stretch md:items-center gap-3">
            {/* Left: Search */}
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 min-w-0">
                <SearchInput
                  placeholder={tr('Search events...', 'חפש אירועים...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  showTagButton
                  className="w-full"
                />
              </div>
            </div>

            {/* Right: Filters - relatedSports buttons (only sports with events) */}
            <div className="flex items-center gap-3">
              <TooltipProvider delayDuration={50}>
                <div className="flex items-center gap-2 flex-wrap">
                  {sportFilterButtons.map((sport) => {
                    const isSelected = selectedSports.includes(sport.value);

                    return (
                      <Tooltip key={sport.value}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isSelected ? sport.variant : 'gray'}
                            size="sm"
                            onClick={() => {
                              setSelectedSports((prev) =>
                                prev.includes(sport.value)
                                  ? prev.filter((s) => s !== sport.value)
                                  : [...prev, sport.value]
                              );
                              setPage(1);
                            }}
                            aria-label={tr(sport.tooltipEn, sport.tooltipHe)}
                          >
                            <Icon name={sport.iconName as any} className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="text-center"
                          variant={isSelected ? sport.variant : 'gray'}
                        >
                          {tr(sport.tooltipEn, sport.tooltipHe)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>
          </div>

          {/* ========================================
              ACTIVE FILTERS STATUS - Improved Layout
          ======================================== */}
          {hasAnyFilter && (
            <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
              <div className="flex flex-wrap items-center gap-2">
                {/* Results Count Badge */}
                {!loading && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-bg dark:bg-gray-bg-dark rounded-full border border-gray-border dark:border-gray-border-dark animate-pop">
                    <Icon name="calendarBold" className="w-4 h-4 text-gray dark:text-gray-dark" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {paginatedEvents.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {tr('of', 'מתוך')} {totalResults}
                    </span>
                  </div>
                )}

                {/* Search Query Badge - purple when tag search, orange otherwise */}
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-200 cursor-pointer animate-pop ${
                      parseTagSearch(searchQuery).isTagSearch
                        ? 'bg-purple-bg dark:bg-purple-bg-dark border-purple-border dark:border-purple-border-dark hover:bg-purple-hover-bg dark:hover:bg-purple-hover-bg-dark'
                        : 'bg-orange-bg dark:bg-orange-bg-dark border-orange-border dark:border-orange-border-dark hover:bg-orange-hover-bg dark:hover:bg-orange-hover-bg-dark'
                    }`}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      "{searchQuery}"
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Sports Badges */}
                {selectedSports.map((sport) => {
                  const sportConfig = SPORT_CONFIG.find((s) => s.value === sport);
                  return (
                    <button
                      key={sport}
                      onClick={() => setSelectedSports((prev) => prev.filter((s) => s !== sport))}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-teal-bg dark:bg-teal-bg-dark rounded-full border border-teal-border dark:border-teal-border-dark hover:bg-teal-hover-bg dark:hover:bg-teal-hover-bg-dark transition-colors duration-200 cursor-pointer animate-pop"
                      title={sportConfig ? sportConfig.displayName : getSportTranslation(sport)}
                    >
                      {sportConfig ? (
                        <Icon
                          name={sportConfig.iconName as any}
                          className="w-3.5 h-3.5 text-teal dark:text-teal-dark"
                        />
                      ) : null}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getSportTranslation(sport)}
                      </span>
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  );
                })}

                {/* Has Spots Available Badge */}
                {hasSpotsAvailable && (
                  <button
                    onClick={() => setHasSpotsAvailable(false)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {tr('Has Spots', 'יש מקומות')}
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Clear All Filters Button */}
                {hasMultipleFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="opacity-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-transparent text-gray dark:text-gray-dark hover:text-red dark:hover:text-red-dark hover:bg-red-bg dark:hover:bg-red-bg-dark hover:border-red-border dark:hover:border-red-border-dark rounded-full transition-colors duration-200 animate-fadeIn"
                    style={{ animationDelay: `400ms` }}
                  >
                    <X className="w-3.5 h-3.5" />
                    {tr('Clear All', 'נקה הכל')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT AREA
      ======================================== */}
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {loading ? (
          /* Grid skeleton - matches EventCard structure (rounded-xl card, rounded-2xl image area, name section) */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-fit rounded-xl">
                <div className="bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden">
                  <div className="absolute inset-0 bg-card dark:bg-card-dark animate-pulse" />
                </div>
                <div className="pt-2 pb-2 space-y-1">
                  <div className="h-5 bg-card/80 dark:bg-card-dark/80 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {paginatedEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  locale={locale}
                  animationDelay={index * 50}
                  getSportTranslation={getSportTranslation}
                  highlightQuery={searchQuery || undefined}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {tr('Showing', 'מציג')} {showingFrom} {tr('to', 'עד')} {showingTo}{' '}
                  {tr('of', 'מתוך')} {totalResults} {totalResults === 1 ? t('event') : t('events')}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {tr('Previous', 'הקודם')}
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            pageNum === currentPage
                              ? 'bg-blue-600 dark:bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {tr('Next', 'הבא')}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-main/10 to-green-500/10 dark:from-brand-main/20 dark:to-green-500/20 mb-4">
              <Icon name="searchQuest" className="w-8 h-8 text-brand-main" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery
                ? tr('No events match your search', 'לא נמצאו אירועים')
                : tr('No events found', 'לא נמצאו אירועים')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tr('Try adjusting your filters or search terms', 'נסה לשנות את הפילטרים או החיפוש')}
            </p>
            {hasAnyFilter && (
              <Button variant="brand" onClick={handleClearFilters}>
                {tr('Clear All Filters', 'נקה את כל הפילטרים')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EventsPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoadingSpinner className="w-8 h-8" />
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<EventsPageFallback />}>
      <EventsPageContent />
    </Suspense>
  );
}
