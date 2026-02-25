// nextjs-app/app/[locale]/(public)/search/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useRef, useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard, TrainerCard } from '@/components/shop';
import { ParkCard } from '@/components/skateparks/ParkCard';
import { SearchInput } from '@/components/common/SearchInput';
import { Icon } from '@/components/icons';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button, SegmentedControls, Skeleton } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils/cn';
import {
  searchFromCache,
  readFromCacheSync,
  type SearchResultFromCache,
} from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';
import { isEcommerceEnabled, isTrainersEnabled } from '@/lib/utils/ecommerce';
import { trackSearchQuery, trackSearchClick } from '@/lib/analytics/internal';

// Optimize image URLs for event/guide thumbnails (match events + guides pages)
function getOptimizedImageUrl(originalUrl: string): string | null {
  if (!originalUrl?.trim()) return null;
  if (originalUrl.includes('cloudinary.com')) {
    const parts = originalUrl.split('/upload/');
    if (parts.length === 2) return `${parts[0]}/upload/w_800,c_fill,q_auto:good,f_auto/${parts[1]}`;
  }
  return originalUrl;
}

// Sport config for guide cards (match guides-page-client)
const SPORT_CONFIG_GUIDES = [
  { value: 'roller', iconName: 'Roller' as const },
  { value: 'skate', iconName: 'Skate' as const },
  { value: 'scoot', iconName: 'scooter' as const },
  { value: 'bmx', iconName: 'bmx-icon' as const },
  { value: 'longboard', iconName: 'Longboard' as const },
] as const;

// Sport config for filter panel (guides + events; displayName for labels)
const SPORT_FILTER_CONFIG = [
  {
    value: 'roller',
    iconName: 'Roller' as const,
    displayNameEn: 'Rollerblading',
    displayNameHe: 'רולר',
  },
  { value: 'skate', iconName: 'Skate' as const, displayNameEn: 'Skating', displayNameHe: 'סקייט' },
  {
    value: 'scoot',
    iconName: 'scooter' as const,
    displayNameEn: 'Scootering',
    displayNameHe: 'קורקינט',
  },
  { value: 'bmx', iconName: 'bmx-icon' as const, displayNameEn: 'BMX', displayNameHe: 'אופניים' },
  {
    value: 'longboard',
    iconName: 'Longboard' as const,
    displayNameEn: 'Longboarding',
    displayNameHe: 'לונגבורד',
  },
] as const;

type CategoryTab = 'all' | 'products' | 'skateparks' | 'events' | 'guides' | 'trainers';

interface SearchResultBase {
  id: string;
  type: CategoryTab;
}

interface ProductResult extends SearchResultBase {
  type: 'products';
  slug: string;
  name: string | { en: string; he: string };
  images?: Array<{ url: string }>;
  price: number;
  discountPrice?: number;
  variants?: any[];
  totalStock?: number;
}

interface SkateparkResult extends SearchResultBase {
  type: 'skateparks';
  slug: string;
  name: string | { en: string; he: string };
  imageUrl: string;
  area: 'north' | 'center' | 'south';
  rating?: number;
  amenities?: Record<string, boolean>;
}

interface EventResult extends SearchResultBase {
  type: 'events';
  slug: string;
  title: string;
  image?: string;
  startDate: string;
  relatedSports?: string[];
}

interface GuideResult extends SearchResultBase {
  type: 'guides';
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  relatedSports?: string[];
  difficulty?: string;
  rating?: number;
  ratingCount?: number;
  readTime?: number;
}

interface TrainerResult extends SearchResultBase {
  type: 'trainers';
  slug: string;
  name: string;
  profileImage?: string;
  area: 'north' | 'center' | 'south';
  relatedSports?: string[];
  rating?: number;
  totalReviews?: number;
}

type SearchResult = ProductResult | SkateparkResult | EventResult | GuideResult | TrainerResult;

// Minimal Skatepark shape for ParkCard from search result (no badges/amenities)
function skateparkResultToPark(
  s: SkateparkResult,
  locale: string
): Parameters<typeof ParkCard>[0]['park'] {
  const name =
    typeof s.name === 'string'
      ? s.name
      : (s.name[locale as 'en' | 'he'] ?? s.name.en ?? s.name.he ?? '');
  return {
    _id: s.id,
    slug: s.slug,
    name,
    address: { en: '', he: '' },
    area: s.area,
    location: { lat: 0, lng: 0 },
    imageUrl: s.imageUrl ?? '',
    amenities: {
      entryFee: s.amenities?.entryFee ?? false,
      parking: s.amenities?.parking ?? false,
      shade: s.amenities?.shade ?? false,
      bathroom: s.amenities?.bathroom ?? false,
      helmetRequired: s.amenities?.helmetRequired ?? false,
      guard: s.amenities?.guard ?? false,
      seating: s.amenities?.seating ?? false,
      bombShelter: s.amenities?.bombShelter ?? false,
      scootersAllowed: s.amenities?.scootersAllowed ?? false,
      bikesAllowed: s.amenities?.bikesAllowed ?? false,
      noWax: s.amenities?.noWax ?? false,
      nearbyRestaurants: s.amenities?.nearbyRestaurants ?? false,
    },
    rating: s.rating ?? 0,
    totalReviews: 0,
    is24Hours: false,
  };
}

// Event card thumbnail (match events page EventThumbnail)
const SearchEventThumbnail = memo(({ photoUrl, title }: { photoUrl: string; title: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [photoUrl]);
  useEffect(() => {
    const check = () => {
      if (!imgRef.current) return false;
      const img = imgRef.current;
      if (img.complete && img.naturalHeight !== 0) {
        setIsLoaded(true);
        return true;
      }
      if (img.complete && img.naturalHeight === 0) {
        setIsLoaded(true);
        setHasError(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const t = setTimeout(() => {
      if (!isLoaded && !hasError && imgRef.current?.complete) {
        setIsLoaded(true);
        if (imgRef.current?.naturalHeight === 0) setHasError(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [photoUrl, isLoaded, hasError]);
  const url = photoUrl ? getOptimizedImageUrl(photoUrl) : null;
  return (
    <>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-card dark:bg-card-dark flex items-center justify-center z-10">
          <LoadingSpinner />
        </div>
      )}
      {url ? (
        <img
          ref={imgRef}
          src={url}
          alt={title}
          className={cn(
            'w-full h-full rounded-xl object-cover transition-all duration-300 select-none saturate-150 group-hover:saturate-[1.75] group-hover:scale-105',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            setIsLoaded(true);
            setHasError(true);
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 opacity-50" />
        </div>
      )}
    </>
  );
});
SearchEventThumbnail.displayName = 'SearchEventThumbnail';

// Event card matching events page EventCard design
const SearchEventCard = memo(
  ({
    event,
    locale,
    highlightQuery,
    animationDelay = 0,
    getSportTranslation,
    onResultClick,
  }: {
    event: EventResult;
    locale: string;
    highlightQuery?: string;
    animationDelay?: number;
    getSportTranslation: (sport: string) => string;
    onResultClick?: () => void;
  }) => {
    const [isClicked, setIsClicked] = useState(false);
    const [showNameSection, setShowNameSection] = useState(false);
    const [showEventName, setShowEventName] = useState(false);
    const router = useRouter();
    useEffect(() => {
      const t = setTimeout(() => {
        setShowNameSection(true);
        setShowEventName(true);
      }, 300 + animationDelay);
      return () => clearTimeout(t);
    }, [animationDelay]);
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onResultClick?.();
        setIsClicked(true);
        setTimeout(() => router.push(`/${locale}/events/${event.slug}`), 300);
      },
      [event.slug, locale, router, onResultClick]
    );
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d
        .toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\./g, '/');
    };
    const href = `/${locale}/events/${event.slug}`;
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          'block h-fit group rounded-xl cursor-pointer relative select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn',
          "before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300",
          isClicked && 'before:animate-shimmerInfinite'
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
        aria-label={event.title}
      >
        <div
          className="bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden"
          style={{
            filter:
              'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)',
          }}
        >
          {event.relatedSports && event.relatedSports.length > 0 && (
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
              {event.relatedSports.slice(0, 4).map((sport, idx) => {
                const sc = SPORT_CONFIG_GUIDES.find(
                  (s) => s.value === sport.toLowerCase() || sport.toLowerCase().includes(s.value)
                );
                return (
                  <div
                    key={idx}
                    className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg"
                    title={sc ? sport : getSportTranslation(sport)}
                  >
                    {sc ? (
                      <Icon name={sc.iconName as any} className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-medium text-white">
                        {getSportTranslation(sport)}
                      </span>
                    )}
                  </div>
                );
              })}
              {event.relatedSports.length > 4 && (
                <div className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg">
                  <span className="text-xs font-medium text-white">
                    +{event.relatedSports.length - 4}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="absolute bottom-2 left-0 z-10">
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-500 dark:bg-purple-600 text-white text-xs md:text-sm font-semibold px-2 md:px-3 py-1 rounded-r-full shadow-lg">
              {formatDate(event.startDate)}
            </div>
          </div>
          <SearchEventThumbnail photoUrl={event.image ?? ''} title={event.title} />
        </div>
        <div
          className="space-y-1 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showNameSection ? '200px' : '0',
            paddingTop: showNameSection ? '0.5rem' : '0',
            paddingBottom: showNameSection ? '0.5rem' : '0',
          }}
        >
          <h3
            className={cn(
              'text-lg font-medium',
              showEventName && 'animate-fadeInDown animation-delay-[1s]'
            )}
          >
            {highlightQuery ? highlightMatch(event.title, highlightQuery) : event.title}
          </h3>
        </div>
      </Link>
    );
  }
);
SearchEventCard.displayName = 'SearchEventCard';

// Guide card thumbnail (match guides page)
const SearchGuideThumbnail = memo(({ photoUrl, title }: { photoUrl: string; title: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [photoUrl]);
  useEffect(() => {
    const check = () => {
      if (!imgRef.current) return false;
      const img = imgRef.current;
      if (img.complete && img.naturalHeight !== 0) {
        setIsLoaded(true);
        return true;
      }
      if (img.complete && img.naturalHeight === 0) {
        setIsLoaded(true);
        setHasError(true);
        return true;
      }
      return false;
    };
    if (check()) return;
    const t = setTimeout(() => {
      if (!isLoaded && !hasError && imgRef.current?.complete) {
        setIsLoaded(true);
        if (imgRef.current?.naturalHeight === 0) setHasError(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [photoUrl, isLoaded, hasError]);
  const url = photoUrl ? getOptimizedImageUrl(photoUrl) : null;
  return (
    <>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-background/20 dark:bg-background/20 flex items-center justify-center z-10">
          <LoadingSpinner />
        </div>
      )}
      {url ? (
        <img
          ref={imgRef}
          src={url}
          alt={title}
          className={cn(
            'w-full h-full rounded-xl object-cover transition-all duration-300 select-none saturate-150 group-hover:saturate-[1.75] group-hover:scale-105',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            setHasError(false);
          }}
          onError={() => {
            setIsLoaded(true);
            setHasError(true);
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16" />
        </div>
      )}
    </>
  );
});
SearchGuideThumbnail.displayName = 'SearchGuideThumbnail';

// Guide card matching guides-page-client GuideCard design
const SearchGuideCard = memo(
  ({
    guide,
    locale,
    highlightQuery,
    animationDelay = 0,
    getSportTranslation,
    getDifficultyTranslation,
    onResultClick,
  }: {
    guide: GuideResult;
    locale: string;
    highlightQuery?: string;
    animationDelay?: number;
    getSportTranslation: (sport: string) => string;
    getDifficultyTranslation: (difficulty: string) => string;
    onResultClick?: () => void;
  }) => {
    const [isClicked, setIsClicked] = useState(false);
    const [showNameSection, setShowNameSection] = useState(false);
    const [showGuideName, setShowGuideName] = useState(false);
    const router = useRouter();
    useEffect(() => {
      const t = setTimeout(() => {
        setShowNameSection(true);
        setShowGuideName(true);
      }, 300 + animationDelay);
      return () => clearTimeout(t);
    }, [animationDelay]);
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onResultClick?.();
        setIsClicked(true);
        setTimeout(() => router.push(`/${locale}/guides/${guide.slug}`), 300);
      },
      [guide.slug, locale, router, onResultClick]
    );
    const href = `/${locale}/guides/${guide.slug}`;
    return (
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          'block h-fit group rounded-xl cursor-pointer relative select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn',
          "before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300",
          isClicked && 'before:animate-shimmerInfinite'
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
        aria-label={guide.title}
      >
        <div
          className="bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden"
          style={{
            filter:
              'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)',
          }}
        >
          {guide.relatedSports && guide.relatedSports.length > 0 && (
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
              {guide.relatedSports.slice(0, 4).map((sport, idx) => {
                const sc = SPORT_CONFIG_GUIDES.find(
                  (s) => s.value === sport.toLowerCase() || sport.toLowerCase().includes(s.value)
                );
                return (
                  <div
                    key={idx}
                    className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg"
                    title={sc ? sport : getSportTranslation(sport)}
                  >
                    {sc ? (
                      <Icon name={sc.iconName as any} className="w-4 h-4 text-white" />
                    ) : (
                      <span className="text-xs font-medium text-white">
                        {getSportTranslation(sport)}
                      </span>
                    )}
                  </div>
                );
              })}
              {guide.relatedSports.length > 4 && (
                <div className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg">
                  <span className="text-xs font-medium text-white">
                    +{guide.relatedSports.length - 4}
                  </span>
                </div>
              )}
            </div>
          )}
          {guide.difficulty && (
            <div className="absolute bottom-2 left-0 z-10">
              <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-500 dark:bg-purple-600 text-white text-xs md:text-sm font-semibold ps-1 md:ps-3 pe-1 md:pe-2 py-1 rounded-r-full shadow-lg">
                {getDifficultyTranslation(guide.difficulty)}
              </div>
            </div>
          )}
          <SearchGuideThumbnail photoUrl={guide.coverImage ?? ''} title={guide.title} />
        </div>
        <div
          className="space-y-1 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showNameSection ? '200px' : '0',
            paddingTop: showNameSection ? '0.5rem' : '0',
            paddingBottom: showNameSection ? '0.5rem' : '0',
          }}
        >
          <h3
            className={cn(
              'text-lg font-medium opacity-0',
              showGuideName && 'animate-fadeInDown animation-delay-[1s]'
            )}
          >
            {highlightQuery ? highlightMatch(guide.title, highlightQuery) : guide.title}
          </h3>
        </div>
      </Link>
    );
  }
);
SearchGuideCard.displayName = 'SearchGuideCard';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('search');
  const tGuides = useTranslations('guides');
  const tSkateparks = useTranslations('skateparks');
  const isHebrew = locale === 'he';

  const getSportTranslation = useCallback(
    (sport: string): string => {
      if (!sport) return sport;
      const key = `sports.${sport.toLowerCase()}`;
      const translated = tGuides(key as any);
      if (translated && translated !== key && !translated.startsWith('sports.')) return translated;
      return sport.charAt(0).toUpperCase() + sport.slice(1);
    },
    [tGuides]
  );
  const getDifficultyTranslation = useCallback(
    (difficulty: string): string => {
      if (!difficulty) return difficulty;
      const key = `difficulty.${difficulty.toLowerCase()}`;
      const translated = tGuides(key as any);
      if (translated && translated !== key && !translated.startsWith('difficulty.'))
        return translated;
      return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    },
    [tGuides]
  );

  // Query and UI state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedTabs, setSelectedTabs] = useState<Exclude<CategoryTab, 'all'>[]>(() => {
    const types = searchParams.get('types') || searchParams.get('tab') || '';
    return types.split(',').filter(Boolean) as Exclude<CategoryTab, 'all'>[];
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSports, setSelectedSports] = useState<string[]>(() => {
    const s = searchParams.get('sports') || '';
    return s.split(',').filter(Boolean);
  });
  const [sportsFilterOpen, setSportsFilterOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const a = searchParams.get('amenities') || '';
    return a.split(',').filter(Boolean);
  });
  const [amenitiesFilterOpen, setAmenitiesFilterOpen] = useState(false);

  // Top 5 most clicked search results (from analytics), cached per locale in localStorage with fetchedAt (1 week TTL)
  const [popularClicks, setPopularClicks] = useState<
    Array<{ resultType: string; resultSlug: string; count: number; name?: string }>
  >([]);

  // Scroll state
  const [isScrolled, setIsScrolled] = useState(false);

  // Mobile detection for sports filter (Popover vs Drawer)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch top 5 most clicked search results for "Popular" section; use localStorage per locale if fetched < 1 week ago
  useEffect(() => {
    const CACHE_KEY = `search_popular_clicks_${locale}`;
    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
    type PopularItem = { resultType: string; resultSlug: string; count: number; name?: string };
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { results?: unknown[]; fetchedAt?: number };
        const fetchedAt = parsed?.fetchedAt;
        if (
          typeof fetchedAt === 'number' &&
          Date.now() - fetchedAt <= CACHE_TTL_MS &&
          Array.isArray(parsed?.results)
        ) {
          setPopularClicks(parsed.results as PopularItem[]);
          return;
        }
      }
    } catch {
      // ignore invalid cache
    }
    fetch(`/api/search/popular?locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then((data: { results?: PopularItem[] }) => {
        if (Array.isArray(data?.results)) {
          setPopularClicks(data.results);
          if (data.results.length > 0) {
            try {
              localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ results: data.results, fetchedAt: Date.now() })
              );
            } catch {
              // ignore quota / private mode
            }
          }
        }
      })
      .catch(() => {});
  }, [locale]);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAnalyticsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Version check (versionOnly + refetch) only on first load; later searches use localStorage only
  const versionCheckDoneRef = useRef(false);

  const toggleTab = useCallback((tab: Exclude<CategoryTab, 'all'>) => {
    setSelectedTabs((prev) => {
      const next = prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab];
      if (prev.includes(tab) && tab === 'skateparks') setSelectedAmenities([]);
      if (!next.includes('events') && !next.includes('guides')) setSelectedSports([]);
      return next;
    });
    setPage(1);
  }, []);

  // Track scroll (match skateparks FilterBar threshold for sticky bar)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 260);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update URL when tab/page change (not when typing — don't sync URL with query)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedTabs.length > 0) params.set('types', selectedTabs.join(','));
    if (selectedSports.length > 0) params.set('sports', selectedSports.join(','));
    if (selectedAmenities.length > 0) params.set('amenities', selectedAmenities.join(','));
    if (page > 1) params.set('page', String(page));
    params.set('locale', String(locale));
    router.replace(`/${locale}/search?${params.toString()}`);
  }, [selectedTabs, selectedSports, selectedAmenities, page, query, locale, router]);

  // Debounced search query analytics (1.5s after user stops typing)
  useEffect(() => {
    if (!query.trim()) {
      if (searchAnalyticsDebounceRef.current) {
        clearTimeout(searchAnalyticsDebounceRef.current);
        searchAnalyticsDebounceRef.current = null;
      }
      return;
    }
    if (searchAnalyticsDebounceRef.current) clearTimeout(searchAnalyticsDebounceRef.current);
    searchAnalyticsDebounceRef.current = setTimeout(() => {
      trackSearchQuery({ query: query.trim(), source: 'search_page', locale });
      searchAnalyticsDebounceRef.current = null;
    }, 1500);
    return () => {
      if (searchAnalyticsDebounceRef.current) {
        clearTimeout(searchAnalyticsDebounceRef.current);
        searchAnalyticsDebounceRef.current = null;
      }
    };
  }, [query, locale]);

  // Cache-backed categories (localStorage first; fill cache if missing)
  const cacheCategories = useMemo((): ('skateparks' | 'events' | 'guides')[] => {
    if (selectedTabs.length === 0) return ['skateparks', 'events', 'guides'];
    return selectedTabs.filter(
      (t): t is 'skateparks' | 'events' | 'guides' =>
        t === 'skateparks' || t === 'events' || t === 'guides'
    );
  }, [selectedTabs]);

  // API-only categories (no localStorage cache; always fetch)
  const apiCategories = useMemo((): ('products' | 'trainers')[] => {
    if (selectedTabs.length === 0) {
      const list: ('products' | 'trainers')[] = [];
      if (isEcommerceEnabled()) list.push('products');
      if (isTrainersEnabled()) list.push('trainers');
      return list;
    }
    return selectedTabs.filter((t): t is 'products' | 'trainers' => {
      if (t === 'products') return isEcommerceEnabled();
      if (t === 'trainers') return isTrainersEnabled();
      return false;
    });
  }, [selectedTabs]);

  // Map SearchResultFromCache to SearchResult (same shape as API)
  const mapCacheResultToSearchResult = (r: SearchResultFromCache): SearchResult => {
    if (r.type === 'skateparks') {
      return {
        id: r.id,
        type: 'skateparks',
        slug: r.slug,
        name: r.name ?? '',
        imageUrl: r.imageUrl ?? '',
        area: r.area ?? 'center',
        rating: r.rating,
        amenities: r.amenities,
      };
    }
    if (r.type === 'events') {
      return {
        id: r.id,
        type: 'events',
        slug: r.slug,
        title: r.title ?? '',
        image: r.image,
        startDate: r.startDate ?? new Date().toISOString(),
        relatedSports: r.relatedSports ?? [],
      };
    }
    return {
      id: r.id,
      type: 'guides',
      slug: r.slug,
      title: r.title ?? '',
      description: r.description,
      coverImage: r.coverImage,
      relatedSports: r.relatedSports,
      difficulty: (r as { difficulty?: string }).difficulty,
      rating: r.rating,
      ratingCount: r.ratingCount,
      readTime: r.readTime,
    };
  };

  // Load from localStorage first; fetch only when cache is missing or DB version !== cache version.
  useEffect(() => {
    const shouldFetch = query.trim() || selectedTabs.length > 0;
    if (!shouldFetch) {
      setResults([]);
      setTotal(0);
      return;
    }
    const searchQuery = query.trim() || '';

    // 1) Always show cached data first and fast (no network) when we have events/guides/skateparks in localStorage
    let cacheMapped: SearchResult[] = [];
    if (cacheCategories.length > 0) {
      const syncCacheResults = readFromCacheSync(searchQuery, locale, cacheCategories);
      cacheMapped = syncCacheResults.map(mapCacheResultToSearchResult);
      setResults(cacheMapped);
      setTotal(cacheMapped.length);
      setLoading(false);
    }

    // 2) Version check + refetch only on first load. After that, searches use localStorage only (no versionOnly or refetch).
    const needCacheCheckOrFetch = cacheCategories.length > 0;
    const needApiFetch = apiCategories.length > 0;

    if (!needCacheCheckOrFetch && !needApiFetch) {
      return;
    }

    const hasCacheToShow = cacheMapped.length > 0;
    const doVersionCheck = !versionCheckDoneRef.current;

    if (!hasCacheToShow || needApiFetch) setLoading(true);
    const controller = new AbortController();
    const run = async () => {
      try {
        const allResults: SearchResult[] = [];

        if (cacheCategories.length > 0) {
          if (doVersionCheck) {
            const cacheResults = await searchFromCache(searchQuery, locale, cacheCategories);
            allResults.push(...cacheResults.map(mapCacheResultToSearchResult));
          } else {
            allResults.push(...cacheMapped);
          }
        }

        const cacheCount = allResults.length;
        if (apiCategories.length > 0) {
          const params = new URLSearchParams();
          if (searchQuery) params.set('q', searchQuery);
          params.set('types', apiCategories.join(','));
          params.set('page', String(page));
          params.set('locale', String(locale));
          const res = await fetch(`/api/search?${params.toString()}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error('Search failed');
          const data = await res.json();
          const apiResults = (data.results || []) as SearchResult[];
          allResults.push(...apiResults);
          setTotal(cacheCount + (data.total ?? 0));
        } else {
          setTotal(allResults.length);
        }

        setResults(allResults);
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e);
        setResults(cacheMapped);
        setTotal(cacheMapped.length);
      } finally {
        if (doVersionCheck) versionCheckDoneRef.current = true;
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [query, selectedTabs, cacheCategories, apiCategories, page, locale]);

  // Amenity options: same order and icon map as AmenitiesButton for identical popover layout
  const AMENITY_POPOVER_OPTIONS = useMemo(
    () => [
      { key: 'parking', iconName: 'parking' as const },
      { key: 'entryFee', iconName: 'moneyBold' as const },
      { key: 'bathroom', iconName: 'toilet' as const },
      { key: 'shade', iconName: 'shadeBold' as const },
      { key: 'seating', iconName: 'seatBold' as const },
      { key: 'noWax', iconName: 'Wax' as const },
      { key: 'nearbyRestaurants', iconName: 'foodBold' as const },
      { key: 'guard', iconName: 'securityGuard' as const },
      { key: 'helmetRequired', iconName: 'helmet' as const },
      { key: 'scootersAllowed', iconName: 'scooter' as const },
      { key: 'bikesAllowed', iconName: 'bmx-icon' as const },
      { key: 'bombShelter', iconName: 'safe-house' as const },
    ],
    []
  );

  // Client-side filter: sports for guides/events only; amenities for skateparks only
  const filteredResults = useMemo(() => {
    let list = results;
    if (selectedSports.length > 0) {
      list = list.filter((item) => {
        if (item.type === 'guides' || item.type === 'events') {
          const sports = (item as GuideResult | EventResult).relatedSports ?? [];
          return sports.some((s) => selectedSports.includes(s));
        }
        return true;
      });
    }
    if (selectedAmenities.length > 0) {
      list = list.filter((item) => {
        if (item.type === 'skateparks') {
          const park = item as SkateparkResult;
          const amenities = park.amenities ?? {};
          return selectedAmenities.every((amenity) => amenities[amenity] === true);
        }
        return true;
      });
    }
    return list;
  }, [results, selectedSports, selectedAmenities]);

  // Debounced input handler
  const handleQueryChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = e.target.value;
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
  };

  const handleClearSearch = () => {
    setQuery('');
    setPage(1);
    searchInputRef.current?.focus();
  };

  const ecommerceEnabled = isEcommerceEnabled();
  const trainersEnabled = isTrainersEnabled();

  const tabs: {
    key: Exclude<CategoryTab, 'all'>;
    label: string;
    icon: string;
    iconBold: string;
    color: string;
  }[] = useMemo(() => {
    const allTabs: {
      key: Exclude<CategoryTab, 'all'>;
      label: string;
      icon: string;
      iconBold: string;
      color: string;
    }[] = [
      {
        key: 'products',
        label: t('tabs.products') || 'Products',
        icon: 'shop',
        iconBold: 'shopBold',
        color: 'orange',
      },
      {
        key: 'skateparks',
        label: t('tabs.skateparks') || 'Parks',
        icon: 'trees',
        iconBold: 'treesBold',
        color: 'green',
      },
      {
        key: 'events',
        label: t('tabs.events') || 'Events',
        icon: 'calendar',
        iconBold: 'calendarBold',
        color: 'purple',
      },
      {
        key: 'guides',
        label: t('tabs.guides') || 'Guides',
        icon: 'book',
        iconBold: 'bookBold',
        color: 'blue',
      },
      {
        key: 'trainers',
        label: t('tabs.trainers') || 'Trainers',
        icon: 'trainers',
        iconBold: 'trainersBold',
        color: 'pink',
      },
    ];
    return allTabs.filter(
      (tab) =>
        tab.key === 'skateparks' ||
        tab.key === 'events' ||
        tab.key === 'guides' ||
        (tab.key === 'products' && ecommerceEnabled) ||
        (tab.key === 'trainers' && trainersEnabled)
    );
  }, [t, ecommerceEnabled, trainersEnabled]);

  // Show all tabs when there are any results; hide tab bar only when there are no results at all
  const { visibleTabs, showTabBar, hasSkateparkResults, hasGuideOrEventResults } = useMemo(() => {
    const typeSet = new Set(results.map((r) => r.type));
    const hasResults = results.length > 0;
    return {
      visibleTabs: hasResults ? tabs : [],
      showTabBar: hasResults,
      hasSkateparkResults: typeSet.has('skateparks'),
      hasGuideOrEventResults: typeSet.has('guides') || typeSet.has('events'),
    };
  }, [results, tabs]);

  const showTabsAndFilters = (query.trim() !== '' || selectedTabs.length > 0) && showTabBar;

  // Group results by type for section separation (order matches tabs)
  const resultsByType = useMemo(() => {
    const order: Exclude<CategoryTab, 'all'>[] = [
      'products',
      'skateparks',
      'events',
      'guides',
      'trainers',
    ];
    const typeToTab = Object.fromEntries(tabs.map((tab) => [tab.key, tab]));
    const groups: {
      type: Exclude<CategoryTab, 'all'>;
      label: string;
      icon: string;
      items: SearchResult[];
    }[] = [];
    for (const type of order) {
      const items = filteredResults.filter((r) => r.type === type);
      if (items.length > 0) {
        const tab = typeToTab[type];
        groups.push({
          type,
          label: tab?.label ?? type,
          icon: tab?.iconBold ?? tab?.icon ?? 'categoryBold',
          items,
        });
      }
    }
    return groups;
  }, [filteredResults, tabs]);

  // Get color classes for tab
  const getTabColorClasses = (color: string) => {
    const colors: Record<
      string,
      { bg: string; text: string; border: string; hoverBorder: string }
    > = {
      purple: {
        bg: 'bg-purple dark:bg-purple-dark',
        text: 'text-purple-bg dark:text-purple-bg-dark',
        border: 'border-brand-purple dark:border-brand-purple',
        hoverBorder: 'hover:border-brand-purple dark:hover:border-brand-purple',
      },
      green: {
        bg: 'bg-green dark:bg-green-dark',
        text: 'text-green-bg dark:text-green-bg-dark',
        border: 'border-green-border dark:border-green-border-dark',
        hoverBorder: 'hover:border-green-border dark:hover:border-green-border-dark',
      },
      blue: {
        bg: 'bg-blue dark:bg-blue-dark',
        text: 'text-blue-bg dark:text-blue-bg-dark',
        border: 'border-brand-blue dark:border-blue',
        hoverBorder: 'hover:border-brand-blue dark:hover:border-blue',
      },
      orange: {
        bg: 'bg-orange dark:bg-orange-dark',
        text: 'text-orange-bg dark:text-orange-bg-dark',
        border: 'border-orange-border dark:border-orange-border-dark',
        hoverBorder: 'hover:border-orange-border dark:hover:border-orange-border-dark',
      },
      teal: {
        bg: 'bg-teal dark:bg-teal-dark',
        text: 'text-teal-bg dark:text-teal-bg-dark',
        border: 'border-teal-border dark:border-teal-border-dark',
        hoverBorder: 'hover:border-teal-border dark:hover:border-teal-border-dark',
      },
      pink: {
        bg: 'bg-pink dark:bg-pink-dark',
        text: 'text-pink-bg dark:text-pink-bg-dark',
        border: 'border-brand-pink dark:border-brand-pink',
        hoverBorder: 'hover:border-brand-pink dark:hover:border-brand-pink',
      },
    };
    return colors[color] || colors.purple;
  };

  /** Map tab color to Button variant (teal → brand; others match Button variant names). */
  const getTabButtonVariant = (
    color: string
  ): 'purple' | 'green' | 'blue' | 'orange' | 'brand' | 'pink' | 'gray' | 'teal' => {
    return color as 'purple' | 'green' | 'blue' | 'orange' | 'pink' | 'gray' | 'teal';
  };

  const renderCard = (item: SearchResult) => {
    switch (item.type) {
      case 'products': {
        const p = item as ProductResult;
        const href = `/${locale}/shop/${p.slug}`;
        return (
          <div
            key={p.id}
            onClick={() =>
              trackSearchClick({
                query,
                resultType: 'products',
                resultId: p.id,
                resultSlug: p.slug,
                href,
                source: 'search_page',
                locale,
              })
            }
          >
            <ProductCard
              product={{
                id: p.id,
                slug: p.slug,
                name: p.name as any,
                price: p.price,
                discountPrice: p.discountPrice,
                images: p.images,
                variants: p.variants,
                totalStock: p.totalStock,
              }}
              view={viewMode}
              highlightQuery={query}
            />
          </div>
        );
      }
      case 'skateparks': {
        const s = item as SkateparkResult;
        const park = skateparkResultToPark(s, locale);
        const href = `/${locale}/skateparks/${s.slug}`;
        return (
          <div
            key={s.id}
            onClick={() =>
              trackSearchClick({
                query,
                resultType: 'skateparks',
                resultId: s.id,
                resultSlug: s.slug,
                href,
                source: 'search_page',
                locale,
              })
            }
          >
            <ParkCard
              park={park}
              locale={locale}
              animationDelay={(filteredResults.indexOf(item) ?? 0) * 50}
              highlightQuery={query}
            />
          </div>
        );
      }
      case 'guides': {
        const g = item as GuideResult;
        const href = `/${locale}/guides/${g.slug}`;
        return (
          <SearchGuideCard
            key={g.id}
            guide={g}
            locale={locale}
            highlightQuery={query}
            animationDelay={(filteredResults.indexOf(item) ?? 0) * 50}
            getSportTranslation={getSportTranslation}
            getDifficultyTranslation={getDifficultyTranslation}
            onResultClick={() =>
              trackSearchClick({
                query,
                resultType: 'guides',
                resultId: g.id,
                resultSlug: g.slug,
                href,
                source: 'search_page',
                locale,
              })
            }
          />
        );
      }
      case 'trainers': {
        const tr = item as TrainerResult;
        const href = `/${locale}/trainers/${tr.slug}`;
        return (
          <div
            key={tr.id}
            onClick={() =>
              trackSearchClick({
                query,
                resultType: 'trainers',
                resultId: tr.id,
                resultSlug: tr.slug,
                href,
                source: 'search_page',
                locale,
              })
            }
          >
            <TrainerCard
              slug={tr.slug}
              name={tr.name}
              image={tr.profileImage}
              area={tr.area}
              sports={tr.relatedSports}
              rating={tr.rating}
              reviewCount={tr.totalReviews}
              highlightQuery={query}
            />
          </div>
        );
      }
      case 'events': {
        const ev = item as EventResult;
        const href = `/${locale}/events/${ev.slug}`;
        return (
          <SearchEventCard
            key={ev.id}
            event={ev}
            locale={locale}
            highlightQuery={query}
            animationDelay={(filteredResults.indexOf(item) ?? 0) * 50}
            getSportTranslation={getSportTranslation}
            onResultClick={() =>
              trackSearchClick({
                query,
                resultType: 'events',
                resultId: ev.id,
                resultSlug: ev.slug,
                href,
                source: 'search_page',
                locale,
              })
            }
          />
        );
      }
      default:
        return null;
    }
  };

  const tr = (en: string, he: string) => (isHebrew ? he : en);

  // Applied filters bar (FilterBar / events page style)
  const hasSearchQuery = !!query.trim();
  const hasAnyFilter =
    hasSearchQuery ||
    selectedTabs.length > 0 ||
    selectedSports.length > 0 ||
    selectedAmenities.length > 0;
  const activeFiltersCount =
    (hasSearchQuery ? 1 : 0) +
    selectedTabs.length +
    selectedSports.length +
    selectedAmenities.length;
  const hasMultipleFilters = activeFiltersCount > 1;

  const clearAllFilters = useCallback(() => {
    setQuery('');
    setSelectedTabs([]);
    setSelectedSports([]);
    setSelectedAmenities([]);
    setPage(1);
  }, []);

  return (
    <div
      className="min-h-screen bg-background dark:bg-background-dark"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      {/* ========================================
          HERO SECTION - Match skateparks page
      ======================================== */}
      <div className="relative pt-14 md:pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5 z-10">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Find Anything', 'מצא כל דבר')}
            </h1>
            <h2 className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Search parks, guides, and events in one place.',
                'חפש פארקים, מדריכים ואירועים במקום אחד.'
              )}
            </h2>

            {/* Popular: show when we have at least one clicked result (visible even when user has typed) */}
            {popularClicks.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {tr('Popular:', 'פופולרי:')}
                </span>
                {popularClicks.map((item) => {
                  const pathPrefix = item.resultType === 'products' ? 'shop' : item.resultType;
                  const href = `/${locale}/${pathPrefix}/${item.resultSlug}`;
                  const label = item.name ?? item.resultSlug.replace(/-/g, ' ');
                  return (
                    <Link
                      key={`${item.resultType}-${item.resultSlug}`}
                      href={href}
                      onClick={() =>
                        trackSearchClick({
                          query: label,
                          resultType: item.resultType,
                          resultSlug: item.resultSlug,
                          href,
                          source: 'search_page',
                          locale,
                        })
                      }
                      className="px-3 py-1.5 text-sm bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300"
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================
          STICKY BAR - Search + Tabs (FilterBar / MobileSidebar style)
      ======================================== */}
      <div
        className={cn(
          'sticky z-40 bg-background dark:bg-background-dark transition-all duration-200 border-b-2 border-transparent',
          isScrolled
            ? 'top-16 shadow-xl border-header-border dark:border-header-border-dark py-3'
            : 'top-0 py-4'
        )}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div
            className={cn(
              'flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3',
              !showTabsAndFilters && 'sm:justify-center'
            )}
          >
            {/* Search - centered when bar has no other elements, otherwise left-aligned */}
            <div
              className={cn(
                'min-w-0',
                showTabsAndFilters ? 'flex-1 max-w-[250px]' : 'w-full max-w-2xl sm:max-w-xl'
              )}
            >
              <SearchInput
                ref={searchInputRef}
                value={query}
                onChange={handleQueryChange}
                onClear={handleClearSearch}
                placeholder={tr('Search for anything...', 'חפש כל דבר...')}
                className="w-full !max-w-full"
              />
            </div>
            {/* Tabs (multi-select) - show when there are results and user has searched or selected at least one tab */}
            {(query.trim() || selectedTabs.length > 0) && showTabBar && (
              <div className="flex gap-2 min-w-0 items-center">
                {visibleTabs.map((tab) => {
                  const isSelected = selectedTabs.includes(tab.key);
                  return (
                    <Button
                      key={tab.key}
                      type="button"
                      variant={isSelected ? getTabButtonVariant(tab.color) : 'gray'}
                      size="md"
                      className="!rounded-lg gap-2 flex-shrink-0 whitespace-nowrap font-semibold shadow-none"
                      onClick={() => toggleTab(tab.key)}
                    >
                      <Icon
                        name={(isSelected ? tab.iconBold : tab.icon) as any}
                        className="w-5 h-5 md:w-4 md:h-4"
                      />
                      <span className="hidden md:inline">{tab.label}</span>
                    </Button>
                  );
                })}
                {/* Sports filter - show when there are guides or events results */}
                {hasGuideOrEventResults && (
                  <div className="flex-shrink-0">
                    {isMobile ? (
                      <>
                        <Button
                          variant={selectedSports.length > 0 ? 'teal' : 'gray'}
                          size="md"
                          className="relative"
                          aria-label={tr('Filter by sport', 'סנן לפי ספורט')}
                          onClick={() => setSportsFilterOpen(true)}
                        >
                          <Icon
                            name={selectedSports.length > 0 ? 'filterBold' : 'filter'}
                            className="w-5 h-5"
                          />
                          {selectedSports.length > 0 && (
                            <Badge
                              variant="teal"
                              className="rounded-full absolute -top-2 -right-2 min-w-[18px] min-h-[18px] p-0 flex items-center justify-center text-[10px]"
                            >
                              {selectedSports.length}
                            </Badge>
                          )}
                        </Button>
                        <Drawer
                          isOpen={sportsFilterOpen}
                          onClose={() => setSportsFilterOpen(false)}
                          title={tr('Filter by sport', 'סנן לפי ספורט')}
                        >
                          <div className="space-y-3">
                            {selectedSports.length > 0 && (
                              <Button
                                variant="red"
                                size="sm"
                                onClick={() => {
                                  setSelectedSports([]);
                                  setSportsFilterOpen(false);
                                }}
                                className="gap-1"
                              >
                                <Icon name="trashBold" className="h-3 w-3" /> {tr('Clear', 'נקה')}
                              </Button>
                            )}
                            <div className="flex flex-col gap-1">
                              {SPORT_FILTER_CONFIG.map((sport) => {
                                const checked = selectedSports.includes(sport.value);
                                return (
                                  <button
                                    key={sport.value}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSports((prev) =>
                                        prev.includes(sport.value)
                                          ? prev.filter((s) => s !== sport.value)
                                          : [...prev, sport.value]
                                      );
                                    }}
                                    className={cn(
                                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left font-medium transition-colors',
                                      checked
                                        ? 'bg-teal-bg dark:bg-teal-bg-dark text-teal dark:text-teal-dark'
                                        : 'bg-muted dark:bg-muted-dark hover:bg-muted/80'
                                    )}
                                  >
                                    <Icon name={sport.iconName as any} className="w-4 h-4" />
                                    <span>
                                      {isHebrew ? sport.displayNameHe : sport.displayNameEn}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </Drawer>
                      </>
                    ) : (
                      <Popover open={sportsFilterOpen} onOpenChange={setSportsFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={selectedSports.length > 0 ? 'teal' : 'gray'}
                            size="md"
                            className="relative"
                            aria-label={tr('Filter by sport', 'סנן לפי ספורט')}
                          >
                            <Icon
                              name={selectedSports.length > 0 ? 'filterBold' : 'filter'}
                              className="w-5 h-5"
                            />
                            {selectedSports.length > 0 && (
                              <Badge
                                variant="teal"
                                className="shadow-sm rounded-full absolute -top-2 -right-2 min-w-[18px] min-h-[18px] p-0 flex items-center justify-center text-[10px]"
                              >
                                {selectedSports.length}
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 p-2">
                          <div className="space-y-1 w-full">
                            <div
                              className={cn(
                                'flex items-center justify-between py-1',
                                isHebrew ? 'flex-row-reverse' : 'flex-row'
                              )}
                            >
                              <span className="text-sm font-medium">
                                {tr('Filter by sport', 'סנן לפי ספורט')}
                              </span>
                              {selectedSports.length > 0 && (
                                <Button
                                  variant="red"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => setSelectedSports([])}
                                >
                                  <Icon name="trashBold" className="h-3 w-3" /> {tr('Clear', 'נקה')}
                                </Button>
                              )}
                            </div>
                            <div className="w-full flex flex-col items-end gap-1">
                              {SPORT_FILTER_CONFIG.map((sport) => {
                                const checked = selectedSports.includes(sport.value);
                                return (
                                  <button
                                    key={sport.value}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSports((prev) =>
                                        prev.includes(sport.value)
                                          ? prev.filter((s) => s !== sport.value)
                                          : [...prev, sport.value]
                                      );
                                    }}
                                    className={cn(
                                      'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                      isHebrew ? 'flex-row-reverse' : 'flex-row',
                                      checked
                                        ? 'bg-teal-bg text-teal dark:bg-teal-bg-dark dark:text-teal-dark border border-teal-border dark:border-teal-border-dark'
                                        : 'hover:bg-gray-bg dark:hover:bg-gray-bg-dark'
                                    )}
                                  >
                                    <Icon name={sport.iconName as any} className="w-4 h-4" />
                                    <span>
                                      {isHebrew ? sport.displayNameHe : sport.displayNameEn}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
                {/* Amenities filter - show when there are skatepark results */}
                {hasSkateparkResults && (
                  <div className="flex-shrink-0">
                    {isMobile ? (
                      <>
                        <Button
                          variant={selectedAmenities.length > 0 ? 'blue' : 'gray'}
                          size="md"
                          className="relative"
                          aria-label={tr('Filter by amenities', 'סנן לפי שירותים')}
                          onClick={() => setAmenitiesFilterOpen(true)}
                        >
                          <Icon
                            name={selectedAmenities.length > 0 ? 'notesBold' : 'notes'}
                            className="w-5 h-5"
                          />
                          {selectedAmenities.length > 0 && (
                            <Badge
                              variant="blue"
                              className="shadow-sm rounded-full absolute -top-2 -right-2 min-w-[18px] min-h-[18px] p-0 flex items-center justify-center text-[10px]"
                            >
                              {selectedAmenities.length}
                            </Badge>
                          )}
                        </Button>
                        <Drawer
                          isOpen={amenitiesFilterOpen}
                          onClose={() => setAmenitiesFilterOpen(false)}
                          title={tr('Filter by amenities', 'סנן לפי שירותים')}
                        >
                          <div className="space-y-2">
                            {selectedAmenities.length > 0 && (
                              <>
                                <div
                                  className={cn(
                                    'flex',
                                    isHebrew ? 'flex-row-reverse' : 'flex-row',
                                    'justify-end'
                                  )}
                                >
                                  <Button
                                    variant="red"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAmenities([]);
                                      setAmenitiesFilterOpen(false);
                                    }}
                                    className="h-8 px-2 text-xs flex flex-row-reverse gap-1 items-center"
                                  >
                                    {tr('Clear', 'נקה')}
                                    <Icon name="trashBold" className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                              </>
                            )}
                            <div
                              className={cn(
                                'flex flex-col gap-1',
                                isHebrew ? 'items-end' : 'items-start'
                              )}
                            >
                              {AMENITY_POPOVER_OPTIONS.map((amenity) => (
                                <Button
                                  key={amenity.key}
                                  variant={
                                    selectedAmenities.includes(amenity.key) ? 'blue' : 'none'
                                  }
                                  size="sm"
                                  className={cn(
                                    'flex gap-2 font-medium w-full justify-start min-w-0',
                                    selectedAmenities.includes(amenity.key)
                                      ? ''
                                      : 'text-gray dark:text-gray-dark',
                                    isHebrew ? 'flex-row-reverse' : 'flex-row'
                                  )}
                                  onClick={() =>
                                    setSelectedAmenities((prev) =>
                                      prev.includes(amenity.key)
                                        ? prev.filter((a) => a !== amenity.key)
                                        : [...prev, amenity.key]
                                    )
                                  }
                                >
                                  <Icon
                                    name={amenity.iconName as any}
                                    className={cn(
                                      'w-4 h-4 shrink-0 transition-all duration-200',
                                      selectedAmenities.includes(amenity.key)
                                        ? 'text-blue dark:text-blue-dark'
                                        : 'text-gray/75 dark:text-gray-dark/75'
                                    )}
                                  />
                                  {tSkateparks(`amenities.${amenity.key}` as any) || amenity.key}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </Drawer>
                      </>
                    ) : (
                      <Popover open={amenitiesFilterOpen} onOpenChange={setAmenitiesFilterOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={selectedAmenities.length > 0 ? 'blue' : 'gray'}
                            size="md"
                            className="relative"
                            aria-label={tr('Filter by amenities', 'סנן לפי שירותים')}
                          >
                            <Icon
                              name={selectedAmenities.length > 0 ? 'notesBold' : 'notes'}
                              className="w-5 h-5"
                            />
                            {selectedAmenities.length > 0 && (
                              <Badge
                                variant="blue"
                                className="shadow-sm rounded-full absolute -top-2 -right-2 min-w-[18px] min-h-[18px] p-0 flex items-center justify-center text-[10px]"
                              >
                                {selectedAmenities.length}
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-fit p-2">
                          <div className="space-y-2">
                            <div
                              className={cn(
                                'flex gap-4',
                                isHebrew ? 'flex-row-reverse' : 'flex-row',
                                'items-center justify-between h-[32px]'
                              )}
                            >
                              <h4 className="mx-2.5 text-sm font-medium">
                                {tr('Filter by amenities', 'סנן לפי שירותים')}
                              </h4>
                              <div
                                className={cn(
                                  'flex gap-1.5 items-center',
                                  isHebrew ? 'flex-row-reverse' : 'flex-row'
                                )}
                              >
                                {selectedAmenities.length > 0 && (
                                  <Button
                                    variant="red"
                                    size="sm"
                                    onClick={() => setSelectedAmenities([])}
                                    className="opacity-0 animate-popFadeIn h-8 px-2 text-xs flex flex-row-reverse gap-1 items-center"
                                    style={{ animationDelay: '300ms' }}
                                  >
                                    {tr('Clear', 'נקה')}
                                    <Icon name="trashBold" className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="gray"
                                  size="sm"
                                  onClick={() => setAmenitiesFilterOpen(false)}
                                  className="h-8 w-8 p-0 shrink-0"
                                  aria-label={tr('Close', 'סגור')}
                                >
                                  <Icon name="X" className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                            <table className="w-full border-collapse">
                              <tbody>
                                {Array.from({
                                  length: Math.ceil(AMENITY_POPOVER_OPTIONS.length / 2),
                                }).map((_, rowIndex) => {
                                  const leftAmenity = AMENITY_POPOVER_OPTIONS[rowIndex * 2];
                                  const rightAmenity = AMENITY_POPOVER_OPTIONS[rowIndex * 2 + 1];
                                  return (
                                    <tr key={rowIndex}>
                                      <td
                                        className="w-1/2 px-1 py-0.5 border-r border-popover-border dark:border-popover-border-dark"
                                        style={{ textAlign: isHebrew ? 'right' : 'left' }}
                                      >
                                        <div
                                          className={cn(
                                            'w-full inline-flex',
                                            isHebrew ? 'flex-row-reverse' : 'flex-row'
                                          )}
                                        >
                                          {leftAmenity && (
                                            <Button
                                              variant={
                                                selectedAmenities.includes(leftAmenity.key)
                                                  ? 'blue'
                                                  : 'none'
                                              }
                                              size="sm"
                                              className={cn(
                                                'flex gap-2 !justify-start font-medium w-full text-nowrap',
                                                selectedAmenities.includes(leftAmenity.key)
                                                  ? ''
                                                  : 'text-gray dark:text-gray-dark',
                                                isHebrew ? 'flex-row-reverse' : 'flex-row'
                                              )}
                                              onClick={() =>
                                                setSelectedAmenities((prev) =>
                                                  prev.includes(leftAmenity.key)
                                                    ? prev.filter((a) => a !== leftAmenity.key)
                                                    : [...prev, leftAmenity.key]
                                                )
                                              }
                                            >
                                              <Icon
                                                name={leftAmenity.iconName as any}
                                                className={cn(
                                                  'w-4 h-4 transition-all duration-200',
                                                  selectedAmenities.includes(leftAmenity.key)
                                                    ? 'text-blue dark:text-blue-dark'
                                                    : 'text-gray/75 dark:text-gray-dark/75'
                                                )}
                                              />
                                              {tSkateparks(`amenities.${leftAmenity.key}` as any) ||
                                                leftAmenity.key}
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                      <td
                                        className="w-1/2 px-1 py-0.5"
                                        style={{ textAlign: isHebrew ? 'right' : 'left' }}
                                      >
                                        <div
                                          className={cn(
                                            'inline-flex',
                                            isHebrew ? 'flex-row-reverse' : 'flex-row'
                                          )}
                                        >
                                          {rightAmenity && (
                                            <Button
                                              variant={
                                                selectedAmenities.includes(rightAmenity.key)
                                                  ? 'blue'
                                                  : 'none'
                                              }
                                              size="sm"
                                              className={cn(
                                                'flex gap-2 w-fit text-nowrap',
                                                selectedAmenities.includes(rightAmenity.key)
                                                  ? ''
                                                  : 'text-text dark:text-text-dark/90',
                                                isHebrew ? 'flex-row-reverse' : 'flex-row'
                                              )}
                                              onClick={() =>
                                                setSelectedAmenities((prev) =>
                                                  prev.includes(rightAmenity.key)
                                                    ? prev.filter((a) => a !== rightAmenity.key)
                                                    : [...prev, rightAmenity.key]
                                                )
                                              }
                                            >
                                              <Icon
                                                name={rightAmenity.iconName as any}
                                                className={cn(
                                                  'w-4 h-4 transition-all duration-200',
                                                  selectedAmenities.includes(rightAmenity.key)
                                                    ? 'text-blue dark:text-blue-dark'
                                                    : 'text-gray/75 dark:text-gray-dark/75'
                                                )}
                                              />
                                              {tSkateparks(
                                                `amenities.${rightAmenity.key}` as any
                                              ) || rightAmenity.key}
                                            </Button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                )}
                {/* View toggle - grid/list */}
                <div className="flex items-center flex-shrink-0">
                  <SegmentedControls
                    name="search-view-mode"
                    value={viewMode}
                    onValueChange={(v) => setViewMode(v as 'grid' | 'list')}
                    options={[
                      {
                        value: 'grid',
                        icon: (
                          <Icon
                            name={viewMode === 'grid' ? 'categoryBold' : 'category'}
                            className="w-5 h-5"
                          />
                        ),
                        variant: 'orange',
                      },
                      {
                        value: 'list',
                        icon: (
                          <Icon name={viewMode === 'list' ? 'taskBold' : 'task'}
                           className="w-5 h-5" />
                        ),
                        variant: 'pink',
                      },
                    ]}
                    className="h-[2.88rem] sm:h-[2.5rem]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active / Applied Filters Status - FilterBar & events page style */}
          {hasAnyFilter && (
            <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
              <div className="flex flex-wrap items-center gap-2">
                {/* Results count badge - how many results are showing */}
                {!loading && (query.trim() || selectedTabs.length > 0) && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-bg dark:bg-gray-bg-dark rounded-full border border-gray-border dark:border-gray-border-dark animate-pop">
                    <Icon name="searchBold" className="w-4 h-4 text-gray dark:text-gray-dark" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {filteredResults.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {filteredResults.length === 1
                        ? tr('result', 'תוצאה')
                        : tr('results', 'תוצאות')}
                    </span>
                  </div>
                )}

                {/* Search query badge */}
                {hasSearchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-bg dark:bg-orange-bg-dark rounded-full border border-orange-border dark:border-orange-border-dark hover:bg-orange-bg/80 dark:hover:bg-orange-bg-dark/80 transition-colors cursor-pointer animate-pop"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      "{query.trim()}"
                    </span>
                    <Icon name="X" className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Category tab badges */}
                {selectedTabs.map((tabKey) => {
                  const tab = tabs.find((t) => t.key === tabKey);
                  if (!tab) return null;
                  const colorClasses =
                    tab.color === 'orange'
                      ? 'bg-orange-bg dark:bg-orange-bg-dark border-orange-border dark:border-orange-border-dark hover:bg-orange-bg/80 dark:hover:bg-orange-bg-dark/80'
                      : tab.color === 'green'
                        ? 'bg-green-bg dark:bg-green-bg-dark border-green-border dark:border-green-border-dark hover:bg-green-bg/80 dark:hover:bg-green-bg-dark/80'
                        : tab.color === 'purple'
                          ? 'bg-purple-bg dark:bg-purple-bg-dark border-purple-border dark:border-purple-border-dark hover:bg-purple-bg/80 dark:hover:bg-purple-bg-dark/80'
                          : tab.color === 'blue'
                            ? 'bg-blue-bg dark:bg-blue-bg-dark border-blue-border dark:border-blue-border-dark hover:bg-blue-bg/80 dark:hover:bg-blue-bg-dark/80'
                            : tab.color === 'pink'
                              ? 'bg-pink-bg dark:bg-pink-bg-dark border-pink-border dark:border-pink-border-dark hover:bg-pink-bg/80 dark:hover:bg-pink-bg-dark/80'
                              : 'bg-gray-bg dark:bg-gray-bg-dark border-gray-border dark:border-gray-border-dark hover:bg-gray-bg/80 dark:hover:bg-gray-bg-dark/80';
                  return (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => toggleTab(tabKey)}
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors cursor-pointer animate-pop',
                        colorClasses
                      )}
                    >
                      <Icon name={(tab.iconBold ?? tab.icon) as any} className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {tab.label}
                      </span>
                      <Icon name="X" className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  );
                })}

                {/* Sports badges (relatedSports filter) */}
                {selectedSports.map((sport) => {
                  const sportConfig = SPORT_FILTER_CONFIG.find((s) => s.value === sport);
                  const label = sportConfig
                    ? isHebrew
                      ? sportConfig.displayNameHe
                      : sportConfig.displayNameEn
                    : getSportTranslation(sport);
                  return (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => setSelectedSports((prev) => prev.filter((s) => s !== sport))}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-bg dark:bg-teal-bg-dark rounded-full border border-teal-border dark:border-teal-border-dark hover:bg-teal-bg/80 dark:hover:bg-teal-bg-dark/80 transition-colors cursor-pointer animate-pop"
                    >
                      {sportConfig ? (
                        <Icon
                          name={sportConfig.iconName as any}
                          className="w-3.5 h-3.5 text-teal dark:text-teal-dark"
                        />
                      ) : null}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </span>
                      <Icon name="X" className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  );
                })}

                {/* Amenities badges */}
                {selectedAmenities.map((amenityKey) => {
                  const amenityOption = AMENITY_POPOVER_OPTIONS.find((a) => a.key === amenityKey);
                  const label = tSkateparks(`amenities.${amenityKey}` as any) || amenityKey;
                  return (
                    <button
                      key={amenityKey}
                      type="button"
                      onClick={() =>
                        setSelectedAmenities((prev) => prev.filter((a) => a !== amenityKey))
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-bg dark:bg-blue-bg-dark rounded-full border border-blue-border dark:border-blue-border-dark hover:bg-blue-bg/80 dark:hover:bg-blue-bg-dark/80 transition-colors cursor-pointer animate-pop"
                    >
                      {amenityOption && (
                        <Icon
                          name={amenityOption.iconName as any}
                          className="w-3.5 h-3.5 text-blue dark:text-blue-dark"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {label}
                      </span>
                      <Icon name="X" className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  );
                })}

                {/* Clear All */}
                {hasMultipleFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-transparent text-gray dark:text-gray-dark hover:text-red dark:hover:text-red-dark hover:bg-red-bg dark:hover:bg-red-bg-dark hover:border-red-border dark:hover:border-red-border-dark rounded-full transition-colors duration-200 animate-fadeIn"
                    style={{ animationDelay: '400ms' }}
                  >
                    <Icon name="X" className="w-3.5 h-3.5" />
                    {tr('Clear All', 'נקה הכל')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading bar - MobileSidebar style */}
          {loading && (
            <div className="w-full h-[2px] mt-2 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
              <div className="bg-brand-main dark:bg-brand-dark loading-bar w-full h-full" />
            </div>
          )}
          {!loading && query && filteredResults.length > 0 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedSports.length > 0 && total !== filteredResults.length ? (
                <>
                  {tr('Showing', 'מציג')}{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {filteredResults.length}
                  </strong>{' '}
                  {tr('of', 'מתוך')} <strong>{total}</strong> {tr('results', 'תוצאות')}
                </>
              ) : (
                <>
                  {tr('Found', 'נמצאו')}{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {filteredResults.length}
                  </strong>{' '}
                  {tr('results', 'תוצאות')}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT - Grid like skateparks page
      ======================================== */}
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 overflow-x-hidden md:overflow-x-visible">
        {query || selectedTabs.length > 0 ? (
          <>
            {/* Results - same grid as skateparks: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 */}
            <main className="min-w-0">
              {loading ? (
                <div
                  className={cn(
                    'grid gap-4 md:gap-6',
                    viewMode === 'grid'
                      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                      : 'grid-cols-1 sm:grid-cols-2'
                  )}
                >
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              ) : filteredResults.length > 0 ? (
                <div
                  className="space-y-10"
                  role="region"
                  aria-label={tr('Search results', 'תוצאות חיפוש')}
                >
                  {resultsByType.map((group) => {
                    const showHeading = resultsByType.length > 1;
                    return (
                      <section
                        key={group.type}
                        aria-labelledby={showHeading ? `search-section-${group.type}` : undefined}
                        className={
                          showHeading
                            ? 'border-b border-gray-200 dark:border-gray-700 pb-10 last:border-b-0 last:pb-0'
                            : ''
                        }
                      >
                        {showHeading && (
                          <h2
                            id={`search-section-${group.type}`}
                            className="text-lg font-semibold text-text dark:text-text-dark mb-4 flex items-center gap-2"
                          >
                            <Icon name={group.icon as any} className="w-5 h-5 flex-shrink-0" />
                            {group.label}
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                              ({group.items.length})
                            </span>
                          </h2>
                        )}
                        <div
                          className={cn(
                            'grid gap-4 md:gap-6',
                            viewMode === 'grid'
                              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                              : 'grid-cols-1 sm:grid-cols-2'
                          )}
                        >
                          {group.items.map((item) => renderCard(item))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                /* Empty State - match skateparks page */
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-bg dark:bg-gray-bg-dark mb-4">
                    <Icon name="searchQuest" className="w-8 h-8 text-gray dark:text-gray-dark" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {tr('No Results Found', 'לא נמצאו תוצאות')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {tr(
                      "Try adjusting your search or tabs to find what you're looking for",
                      'נסה לשנות את החיפוש או הלשוניות כדי למצוא את מה שאתה מחפש'
                    )}
                  </p>
                </div>
              )}
            </main>
          </>
        ) : (
          /* Initial State - Before Search (skateparks-style cards) */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tr('Start Your Search', 'התחל לחפש')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {tr(
                  'Explore parks, products, events, guides, and trainers.',
                  'גלה פארקים, אירועים ומדריכים.'
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {tabs.map((tab) => {
                const colorClasses = getTabColorClasses(tab.color);
                const isSelected = selectedTabs.includes(tab.key);
                return (
                  <button
                    key={tab.key}
                    onClick={() => toggleTab(tab.key)}
                    className={cn(
                      'p-6 text-center bg-card dark:bg-card-dark rounded-2xl border transition-all group',
                      isSelected
                        ? colorClasses.border
                        : cn(
                            'border-gray-border dark:border-gray-border-dark',
                            colorClasses.hoverBorder,
                            'hover:shadow-lg'
                          )
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center justify-center w-14 h-14 rounded-full mb-3 transition-colors',
                        colorClasses.bg,
                        'group-hover:opacity-90'
                      )}
                    >
                      <Icon name={tab.icon as any} className={cn('w-7 h-7', colorClasses.text)} />
                    </div>
                    <h3 className="text-lg font-bold text-text dark:text-text-dark mb-1">
                      {tab.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isHebrew
                        ? `צפייה בכל ה${tab.label}`
                        : `Browse all ${tab.label.toLowerCase()}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-64 w-full max-w-4xl bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
