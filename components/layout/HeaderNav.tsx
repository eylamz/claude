'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  TestTubeDiagonal,
  Trash2,
  Minus,
  Plus,
  Loader2,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MapPin,
  Star,
  Calendar,
  ClipboardList,
  UserCircle,
  BookOpen,
  Settings as SettingsIcon,
  Search as SearchIcon,
  X,
  BarChart2,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { Icon } from '@/components/icons/Icon';
import { NavIcons } from '@/components/layout/NavIcons';
import { SearchInput } from '@/components/common/SearchInput';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  useCartStore,
  useCartItemCount,
  useCartItems,
  useCartTotals,
  type CartItem,
} from '@/stores/cartStore';
import {
  isEcommerceEnabled,
  isTrainersEnabled,
  isLoginEnabled,
  isGrowthLabEnabled,
  isCommunityEnabled,
} from '@/lib/utils/ecommerce';
import {
  searchFromCache,
  readFromCacheSync,
  getAreaFromQuery,
  queryMatchesCategory,
  hasCacheForCategories,
  ensureSearchCacheFilled,
  type SearchResultFromCache,
} from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';
import { flipLanguage } from '@/lib/utils/transliterate';
import { trackSearchQuery, trackSearchClick, shouldTrackAnalytics } from '@/lib/analytics/internal';

// Search result types (match API / search page)
type SearchResultType = 'products' | 'skateparks' | 'events' | 'guides' | 'trainers';
interface SearchResultBase {
  id: string;
  type: SearchResultType;
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
  /** When set to 'area', result matched by area only; show last. */
  matchBy?: 'name' | 'area';
}
interface EventResult extends SearchResultBase {
  type: 'events';
  slug: string;
  title: string;
  image?: string;
  startDate: string;
}
interface GuideResult extends SearchResultBase {
  type: 'guides';
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  relatedSports?: string[];
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

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tShop = useTranslations('shop');
  const tEvents = useTranslations('events');
  const tAdmin = useTranslations('admin');
  const tMobileNav = useTranslations('common.mobileNav');
  const tSearch = useTranslations('search');
  const tSkateparks = useTranslations('skateparks');
  const { theme, toggleTheme } = useTheme();

  const skipAnalyticsTracking = !shouldTrackAnalytics(pathname, session?.user?.role === 'admin');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAnalyticsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  /** Only run cache version check / searchFromCache once per session; after that use sync cache only (same as search page). */
  const versionCheckDoneRef = useRef(false);
  /** Refs for background merge: cache and API results when version/API complete. */
  const searchCacheProcessedRef = useRef<SearchResult[]>([]);
  const searchApiResultsRef = useRef<SearchResult[]>([]);
  const searchRunIdRef = useRef(0);

  // Top 5 most clicked search results (from analytics), cached per locale (1 week TTL)
  const [popularClicks, setPopularClicks] = useState<
    Array<{ resultType: string; resultSlug: string; count: number; name?: string }>
  >([]);

  const ecommerceEnabled = isEcommerceEnabled();
  const trainersEnabled = isTrainersEnabled();
  const loginEnabled = isLoginEnabled();
  const growthLabEnabled = isGrowthLabEnabled();
  const communityEnabled = isCommunityEnabled();
  const itemCount = useCartItemCount();
  const items = useCartItems();
  const totals = useCartTotals();
  const { updateQuantity, removeItem } = useCartStore();

  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [_scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  /** Nav link click feedback: show brand icon 0.3s then spinner until navigation */
  const [linkClickState, setLinkClickState] = useState<{
    href: string;
    phase: 'brand' | 'spinner';
  } | null>(null);
  const linkClickPhaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Focus search input when popup opens
  useEffect(() => {
    if (isSearchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isSearchOpen]);

  // Scroll detection for header visibility and skateparks page
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;

      // Determine scroll direction
      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        // Scrolling up or at top - show header
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      }

      prevScrollYRef.current = currentScrollY;
      setScrollY(currentScrollY);
    };

    // Set initial scroll position
    const initialScrollY = window.scrollY;
    setScrollY(initialScrollY);
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  // Clear nav link loading state when route changes (page started loading)
  useEffect(() => {
    setLinkClickState(null);
    if (linkClickPhaseTimeoutRef.current) {
      clearTimeout(linkClickPhaseTimeoutRef.current);
      linkClickPhaseTimeoutRef.current = null;
    }
  }, [pathname]);

  // Update meta theme-color when theme changes
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const color = theme === 'dark' ? '#181c21' : '#f6f7f9';

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = color;
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
  }, [theme]);

  // Save search to recent searches
  const saveSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    },
    [recentSearches]
  );

  // Set query from recent/quick action (results show in popup)
  const handleSearchQuery = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      saveSearch(query);
      setSearchQuery(query);
    },
    [saveSearch]
  );

  // Search only from localStorage cache (no server fetch) - same data source as MobileSidebar cache
  const cacheCategories = useMemo((): ('skateparks' | 'events' | 'guides')[] => {
    return ['skateparks', 'events', 'guides'];
  }, []);

  // When search modal opens: pre-fill cache (skateparks/events/guides) if missing, so first keystroke can show cached results
  useEffect(() => {
    if (!isSearchOpen) return;
    const categories: ('skateparks' | 'events' | 'guides')[] = ['skateparks', 'events', 'guides'];
    if (hasCacheForCategories(categories)) return;
    ensureSearchCacheFilled(locale, categories).catch(() => {});
  }, [isSearchOpen, locale]);

  // Resolve display name for a result (locale-aware)
  const getResultDisplayName = useCallback(
    (item: SearchResult): string => {
      const raw =
        'name' in item && item.name != null
          ? item.name
          : 'title' in item && item.title != null
            ? item.title
            : '';
      if (typeof raw === 'string') return raw;
      if (raw && typeof raw === 'object' && 'en' in raw && 'he' in raw) {
        const loc = locale as 'en' | 'he';
        return (
          (raw as { en?: string; he?: string })[loc] ??
          (raw as { en?: string; he?: string }).en ??
          (raw as { en?: string; he?: string }).he ??
          ''
        );
      }
      return String(raw);
    },
    [locale]
  );

  // Weighted search scoring (like MobileSidebar): original query ranks higher than flipped
  const calculateSearchScore = useCallback(
    (result: SearchResult, query: string, flippedQuery: string | null): number => {
      const q = query.toLowerCase().trim();
      if (!q) return 0;
      const flippedLower = flippedQuery ? flippedQuery.toLowerCase().trim() : null;
      const WEIGHTS = {
        name: 1.0,
        title: 1.0,
        category: 0.7,
        area: 0.5,
        description: 0.5,
        tags: 0.5,
      };
      const FLIPPED_DISCOUNT = 0.9;
      const FLIPPED_MIDDLE_DISCOUNT = 0.8;
      let score = 0;
      const displayName = getResultDisplayName(result).toLowerCase();
      if (displayName.includes(q)) {
        score += displayName.startsWith(q) ? WEIGHTS.name * 2 : WEIGHTS.name;
      } else if (flippedLower && displayName.includes(flippedLower)) {
        const base = displayName.startsWith(flippedLower) ? WEIGHTS.name * 2 : WEIGHTS.name;
        const discount = displayName.startsWith(flippedLower)
          ? FLIPPED_DISCOUNT
          : FLIPPED_MIDDLE_DISCOUNT;
        score += base * discount;
      }
      const categoryMap: Record<string, string> = {
        skateparks: 'skatepark',
        products: 'product',
        events: 'event',
        guides: 'guide',
        trainers: 'trainer',
      };
      const categoryName = categoryMap[result.type] || '';
      if (categoryName && (q.includes(categoryName) || flippedLower?.includes(categoryName)))
        score += WEIGHTS.category;
      if ('area' in result && result.area) {
        const areaName = String(result.area).toLowerCase();
        if (areaName && (q.includes(areaName) || flippedLower?.includes(areaName)))
          score += WEIGHTS.area;
      }
      if ('description' in result && result.description) {
        const descLower = String(result.description).toLowerCase();
        if (descLower.includes(q)) score += WEIGHTS.description;
        else if (flippedLower && descLower.includes(flippedLower))
          score += WEIGHTS.description * FLIPPED_DISCOUNT;
      }
      if ('relatedSports' in result && Array.isArray(result.relatedSports)) {
        const hasMatch = result.relatedSports.some(
          (s) =>
            s.toLowerCase().includes(q) ||
            (flippedLower != null && s.toLowerCase().includes(flippedLower))
        );
        if (hasMatch) score += WEIGHTS.tags;
      }
      return score;
    },
    [getResultDisplayName]
  );

  // Map SearchResultFromCache to SearchResult (same shape for skateparks/events/guides)
  const mapCacheResultToSearchResult = useCallback((r: SearchResultFromCache): SearchResult => {
    if (r.type === 'skateparks') {
      return {
        id: r.id,
        type: 'skateparks',
        slug: r.slug,
        name: r.name ?? '',
        imageUrl: r.imageUrl ?? '',
        area: r.area ?? 'center',
        rating: r.rating,
        matchBy: r.matchBy,
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
      rating: r.rating,
      ratingCount: r.ratingCount,
      readTime: r.readTime,
    };
  }, []);

  const categoryOrder = useMemo(
    () =>
      ecommerceEnabled
        ? ['skateparks', 'products', 'events', 'guides', 'trainers']
        : ['skateparks', 'events', 'guides', 'trainers'],
    [ecommerceEnabled]
  );
  const apiCategories = useMemo((): ('products' | 'trainers')[] => {
    const list: ('products' | 'trainers')[] = [];
    if (ecommerceEnabled) list.push('products');
    if (trainersEnabled) list.push('trainers');
    return list;
  }, [ecommerceEnabled, trainersEnabled]);

  // Fetch search results: show cache first, then version check + API in background
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    // Show cached results immediately (no loading bar)
    const syncResults = readFromCacheSync(searchQuery, locale, cacheCategories).map(
      mapCacheResultToSearchResult
    );
    setSearchResults(syncResults);
    setSearchLoading(false);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const controller = new AbortController();
    const runId = ++searchRunIdRef.current;
    const flippedQuery = flipLanguage(searchQuery);
    const q = searchQuery.toLowerCase().trim();
    const flippedLower = flippedQuery ? flippedQuery.toLowerCase().trim() : null;
    const queryContainsHebrew = /\p{Script=Hebrew}/u.test(searchQuery.trim());

    const matchesQueryOrFlipped = (result: SearchResult): boolean => {
      const name = getResultDisplayName(result).toLowerCase();
      if ('matchBy' in result && result.matchBy === 'area') return true;
      if (result.type === 'events' && queryMatchesCategory(searchQuery, 'events')) return true;
      if (result.type === 'skateparks' && queryMatchesCategory(searchQuery, 'skateparks'))
        return true;
      if (result.type === 'guides' && queryMatchesCategory(searchQuery, 'guides')) return true;
      if (!name) return false;
      if (
        name.includes(q) ||
        (flippedLower != null && flippedLower !== '' && name.includes(flippedLower))
      )
        return true;
      if (queryContainsHebrew) return true;
      return false;
    };

    const processCacheResults = (rawResults: SearchResult[]): SearchResult[] => {
      const filtered = rawResults.filter((r) => matchesQueryOrFlipped(r));
      type ScoredResult = SearchResult & { _score: number };
      const scored: ScoredResult[] = filtered.map((result) => ({
        ...result,
        _score: calculateSearchScore(result, searchQuery, flippedQuery),
      }));
      const sorted = scored.sort((a, b) => {
        const aAreaLast = 'matchBy' in a && a.matchBy === 'area' ? 1 : 0;
        const bAreaLast = 'matchBy' in b && b.matchBy === 'area' ? 1 : 0;
        if (aAreaLast !== bAreaLast) return aAreaLast - bAreaLast;
        if (b._score !== a._score) return b._score - a._score;
        const aName = getResultDisplayName(a).toLowerCase();
        const bName = getResultDisplayName(b).toLowerCase();
        const aStartsQ = aName.startsWith(q);
        const bStartsQ = bName.startsWith(q);
        if (aStartsQ && !bStartsQ) return -1;
        if (!aStartsQ && bStartsQ) return 1;
        if (flippedLower) {
          const aStartsF = aName.startsWith(flippedLower);
          const bStartsF = bName.startsWith(flippedLower);
          if (aStartsF && !bStartsF) return -1;
          if (!aStartsF && bStartsF) return 1;
        }
        return aName.localeCompare(bName);
      });
      return sorted
        .map(({ _score, ...r }) => r)
        .filter((r) => (r.type === 'products' && !ecommerceEnabled ? false : true));
    };

    const mergeAndSet = (cacheFinal: SearchResult[], apiResults: SearchResult[]) => {
      if (runId !== searchRunIdRef.current) return;
      const merged = [...cacheFinal, ...apiResults];
      const order = categoryOrder;
      const sortedMerged = merged.sort((a, b) => {
        const i = order.indexOf(a.type);
        const j = order.indexOf(b.type);
        if (i !== j) return i - j;
        return getResultDisplayName(a).localeCompare(getResultDisplayName(b));
      });
      setSearchResults(sortedMerged);
    };

    // Initialize refs with sync cache so API completion can merge immediately
    searchCacheProcessedRef.current = processCacheResults(syncResults);
    searchApiResultsRef.current = [];

    searchDebounceRef.current = setTimeout(() => {
      // Background: version check + refill cache (no await)
      if (cacheCategories.length > 0 && !versionCheckDoneRef.current) {
        searchFromCache(searchQuery, locale, cacheCategories)
          .then((cacheResults) => {
            if (runId !== searchRunIdRef.current) return;
            versionCheckDoneRef.current = true;
            const mapped = cacheResults.map(mapCacheResultToSearchResult);
            searchCacheProcessedRef.current = processCacheResults(mapped);
            mergeAndSet(searchCacheProcessedRef.current, searchApiResultsRef.current);
          })
          .catch((e) => {
            if ((e as { name?: string }).name !== 'AbortError') console.error(e);
            if (runId === searchRunIdRef.current) {
              mergeAndSet(searchCacheProcessedRef.current, searchApiResultsRef.current);
            }
          });
      }

      // Background: products/trainers API
      if (apiCategories.length > 0) {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        params.set('types', apiCategories.join(','));
        params.set('page', '1');
        params.set('locale', String(locale));
        fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
          .then((res) => (res.ok ? res.json() : { results: [] }))
          .then((data: { results?: SearchResult[] }) => {
            if (runId !== searchRunIdRef.current) return;
            const apiResults = (data?.results || []) as SearchResult[];
            searchApiResultsRef.current = apiResults;
            mergeAndSet(searchCacheProcessedRef.current, searchApiResultsRef.current);
          })
          .catch((e) => {
            if ((e as { name?: string }).name !== 'AbortError') console.error(e);
            if (runId === searchRunIdRef.current) {
              mergeAndSet(searchCacheProcessedRef.current, searchApiResultsRef.current);
            }
          });
      }
    }, 300);

    return () => {
      controller.abort();
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [
    searchQuery,
    locale,
    ecommerceEnabled,
    cacheCategories,
    apiCategories,
    categoryOrder,
    mapCacheResultToSearchResult,
    getResultDisplayName,
    calculateSearchScore,
  ]);

  // Debounced search query analytics (1.5s after user stops typing)
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (searchAnalyticsDebounceRef.current) {
        clearTimeout(searchAnalyticsDebounceRef.current);
        searchAnalyticsDebounceRef.current = null;
      }
      return;
    }
    if (searchAnalyticsDebounceRef.current) clearTimeout(searchAnalyticsDebounceRef.current);
    searchAnalyticsDebounceRef.current = setTimeout(() => {
      trackSearchQuery({ query: searchQuery.trim(), source: 'header', locale, skipTracking: skipAnalyticsTracking });
      searchAnalyticsDebounceRef.current = null;
    }, 1500);
    return () => {
      if (searchAnalyticsDebounceRef.current) {
        clearTimeout(searchAnalyticsDebounceRef.current);
        searchAnalyticsDebounceRef.current = null;
      }
    };
  }, [searchQuery, locale, skipAnalyticsTracking]);

  // Fetch top 5 most clicked search results for "Popular" in search modal; use localStorage per locale if fetched < 1 week ago
  useEffect(() => {
    const CACHE_KEY = `search_popular_clicks_${locale}`;
    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
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
          setPopularClicks(
            parsed.results as Array<{
              resultType: string;
              resultSlug: string;
              count: number;
              name?: string;
            }>
          );
          return;
        }
      }
    } catch {
      // ignore invalid cache
    }
    fetch(`/api/search/popular?locale=${encodeURIComponent(locale)}`)
      .then((res) => res.json())
      .then(
        (data: {
          results?: Array<{ resultType: string; resultSlug: string; count: number; name?: string }>;
        }) => {
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
        }
      )
      .catch(() => {});
  }, [locale]);

  // Group results by category (like MobileSidebar)
  const groupedResults = useMemo(() => {
    return searchResults
      .filter((r) => (r.type === 'products' && !ecommerceEnabled ? false : true))
      .reduce(
        (acc, result) => {
          if (!acc[result.type]) acc[result.type] = [];
          acc[result.type].push(result);
          return acc;
        },
        {} as Record<string, SearchResult[]>
      );
  }, [searchResults, ecommerceEnabled]);

  const maxResultsPerGroup = useMemo(() => {
    const groupCount = Object.keys(groupedResults).length;
    return groupCount > 1 ? 6 : Infinity;
  }, [groupedResults]);

  const categoryLabels: Record<string, string> = useMemo(
    () => ({
      skateparks: tMobileNav('findParks') || 'Skateparks',
      products: tMobileNav('shop') || 'Products',
      events: tMobileNav('events') || 'Events',
      guides: tMobileNav('guides') || 'Guides',
      trainers: tMobileNav('findCoaches') || 'Trainers',
    }),
    [tMobileNav]
  );

  const searchArea = useMemo(() => getAreaFromQuery(searchQuery), [searchQuery]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Sign out without redirect and refresh the current route so session state updates in-place
      await signOut({ redirect: false });
      router.refresh();
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle quantity update
  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.maxStock) return;

    setUpdatingItems((prev) => new Set(prev).add(item.id));

    try {
      await updateQuantity(item.id, newQuantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);
    } finally {
      setTimeout(() => {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 300);
    }
  };

  // Handle item removal
  const handleRemoveItem = async (item: CartItem) => {
    setRemovingItems((prev) => new Set(prev).add(item.id));

    try {
      await removeItem(item.id);
    } catch (err) {
      console.error('Failed to remove item:', err);
      setRemovingItems((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    router.push(`/${locale}/checkout`);
  };

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  const handleNavLinkPress = useCallback((href: string) => {
    if (linkClickPhaseTimeoutRef.current) clearTimeout(linkClickPhaseTimeoutRef.current);
    setLinkClickState({ href, phase: 'brand' });
    linkClickPhaseTimeoutRef.current = setTimeout(() => {
      setLinkClickState((prev) => (prev && prev.href === href ? { ...prev, phase: 'spinner' } : prev));
      linkClickPhaseTimeoutRef.current = null;
    }, 300);
  }, []);

  const isAdmin = session?.user?.role === 'admin';
  const tHomepage = useTranslations('common.homepage');

  return (
    <>
      {/* Desktop Header Navigation */}
      <header
        className={`hidden [@media_(min-width:820px)]:block fixed top-0 left-0 right-0 z-[50] px-3 select-none transition-all duration-300 ease-in-out text-white bg-header dark:bg-header-dark ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div
          className={`mx-auto  border-header-border dark:border-header-border-dark w-full max-w-6xl px-2 overflow-visible text-header-text-dark dark:text-header-text transition-colors duration-200`}
        >
          <div className="flex items-center justify-between h-16">
            {/* LEFT: Logo – first to paint (inline SVG, no fetch) */}
            <div className="flex items-center gap-4">
              <Link
                href={`/${locale}`}
                className="flex flex-col items-start gap-0.5 group overflow-visible"
              >
                <NavIcons
                  name="logo"
                  className="text-brand-main dark:text-brand-dark overflow-visible w-[124px] h-[39px] sm:w-[128px] sm:h-[24px] stroke-[7px] stroke-brand-stroke dark:stroke-transparent group-hover:[filter:drop-shadow(0_0_10px_rgba(60,170,65,0.35))] dark:group-hover:[filter:drop-shadow(0_0_10px_rgba(60,170,65,0.15))] transition-all duration-200"
                  style={{ paintOrder: 'stroke' }}
                />
              </Link>
            </div>

            {/* CENTER: Main Navigation (Action-Oriented) */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Skateparks */}
              <Link
                href={`/${locale}/skateparks`}
                data-brand-highlight={String(linkClickState?.href === `/${locale}/skateparks`)}
                onMouseDown={() => handleNavLinkPress(`/${locale}/skateparks`)}
                className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/skateparks`) ? 'text-black dark:text-white' : ''
                } ${linkClickState?.href === `/${locale}/skateparks` ? 'text-brand-text dark:text-brand-dark' : ''}`}
              >
                <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                  <Icon
                    name="trees"
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                    size={18}
                  />
                  <Icon
                    name="treesBold"
                    className={`absolute inset-0 transition-opacity group-active:opacity-100 text-green dark:text-green-dark ${linkClickState?.href === `/${locale}/skateparks` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                    size={18}
                  />
                  {linkClickState?.href === `/${locale}/skateparks` && linkClickState.phase === 'spinner' && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <LoadingSpinner variant="green" size={18} className="!h-[18px] !w-[18px]" />
                    </span>
                  )}
                </span>
                {tAdmin('skateparks')}
              </Link>

              {/* Trainers */}
              {trainersEnabled && (
                <Link
                  href={`/${locale}/trainers`}
                  data-brand-highlight={String(linkClickState?.href === `/${locale}/trainers`)}
                  onMouseDown={() => handleNavLinkPress(`/${locale}/trainers`)}
                  className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white relative ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/trainers`) ? 'text-black dark:text-white' : ''
                  } ${linkClickState?.href === `/${locale}/trainers` ? 'text-brand-text dark:text-brand-dark' : ''}`}
                >
                  <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                    <Icon
                      name="trainers"
                      className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                      size={18}
                    />
                    <Icon
                      name="trainersBold"
                      className={`absolute inset-0 transition-opacity group-active:opacity-100 text-brand-text dark:text-brand-dark ${linkClickState?.href === `/${locale}/trainers` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                      size={18}
                    />
                    {linkClickState?.href === `/${locale}/trainers` && linkClickState.phase === 'spinner' && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <LoadingSpinner variant="brand" size={18} className="!h-[18px] !w-[18px]" />
                      </span>
                    )}
                  </span>
                  {tAdmin('trainers')}
                  {/* "Featured" badge for premium trainers */}
                  <span className="absolute -top-1 -right-1 flex h-2 w-2"></span>
                </Link>
              )}

              {/* Events */}
              <Link
                href={`/${locale}/events`}
                data-brand-highlight={String(linkClickState?.href === `/${locale}/events`)}
                onMouseDown={() => handleNavLinkPress(`/${locale}/events`)}
                className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/events`) ? 'text-black dark:text-white' : ''
                } ${linkClickState?.href === `/${locale}/events` ? 'text-brand-text dark:text-brand-dark' : ''}`}
              >
                <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                  <Icon
                    name="calendar"
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                    size={18}
                  />
                  <Icon
                    name="calendarBold"
                    className={`absolute inset-0 transition-opacity group-active:opacity-100 text-purple dark:text-purple-dark ${linkClickState?.href === `/${locale}/events` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                    size={18}
                  />
                  {linkClickState?.href === `/${locale}/events` && linkClickState.phase === 'spinner' && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <LoadingSpinner variant="purple" size={18} className="!h-[18px] !w-[18px]" />
                    </span>
                  )}
                </span>
                {tEvents('title')}
              </Link>

              {/* Guides */}
              <Link
                href={`/${locale}/guides`}
                data-brand-highlight={String(linkClickState?.href === `/${locale}/guides`)}
                onMouseDown={() => handleNavLinkPress(`/${locale}/guides`)}
                className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/guides`) ? 'text-black dark:text-white' : ''
                } ${linkClickState?.href === `/${locale}/guides` ? 'text-brand-text dark:text-brand-dark' : ''}`}
              >
                <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                  <Icon
                    name="book"
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                    size={18}
                  />
                  <Icon
                    name="bookBold"
                    className={`absolute inset-0 transition-opacity group-active:opacity-100 text-yellow dark:text-yellow-dark ${linkClickState?.href === `/${locale}/guides` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                    size={18}
                  />
                  {linkClickState?.href === `/${locale}/guides` && linkClickState.phase === 'spinner' && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <LoadingSpinner variant="yellow" size={18} className="!h-[18px] !w-[18px]" />
                    </span>
                  )}
                </span>
                {tAdmin('guides')}
              </Link>

              {/* Growth Lab */}
              {growthLabEnabled && (
                <Link
                  href={`/${locale}/growth-lab`}
                  data-brand-highlight={String(linkClickState?.href === `/${locale}/growth-lab`)}
                  onMouseDown={() => handleNavLinkPress(`/${locale}/growth-lab`)}
                  className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/growth-lab`) ? 'text-black dark:text-white' : ''
                  } ${linkClickState?.href === `/${locale}/growth-lab` ? 'text-brand-text dark:text-brand-dark' : ''}`}
                >
                  <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                    <Icon
                      name="plant"
                      className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                      size={18}
                    />
                    <Icon
                      name="plantBold"
                      className={`absolute inset-0 transition-opacity group-active:opacity-100 text-orange dark:text-orange-dark ${linkClickState?.href === `/${locale}/growth-lab` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                      size={18}
                    />
                    {linkClickState?.href === `/${locale}/growth-lab` && linkClickState.phase === 'spinner' && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <LoadingSpinner variant="orange" size={18} className="!h-[18px] !w-[18px]" />
                      </span>
                    )}
                  </span>
                  {locale === 'en' ? 'Growth Lab' : 'המרחב'}
                </Link>
              )}

              {/* Join Community (drive registration) */}
              {communityEnabled && (
                <Link
                  href={`/${locale}/community`}
                  className={`flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/community`) ? 'text-black dark:text-white' : ''
                  }`}
                >
                  {tHomepage('community')}
                </Link>
              )}

              {/* About */}
              <Link
                href={`/${locale}/about`}
                data-brand-highlight={String(linkClickState?.href === `/${locale}/about`)}
                onMouseDown={() => handleNavLinkPress(`/${locale}/about`)}
                className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/about`) ? 'text-black dark:text-white' : ''
                } ${linkClickState?.href === `/${locale}/about` ? 'text-brand-text dark:text-brand-dark' : ''}`}
              >
                <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                  <Icon
                    name="target"
                    className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                    size={18}
                  />
                  <Icon
                    name="targetBold"
                    className={`absolute inset-0 transition-opacity group-active:opacity-100 text-brand-text dark:text-brand-dark ${linkClickState?.href === `/${locale}/about` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                    size={18}
                  />
                  {linkClickState?.href === `/${locale}/about` && linkClickState.phase === 'spinner' && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <LoadingSpinner variant="brand" size={18} className="!h-[18px] !w-[18px]" />
                    </span>
                  )}
                </span>
                {tCommon('about')}
              </Link>

              {/* Shop */}
              {ecommerceEnabled && (
                <Link
                  href={`/${locale}/shop`}
                  data-brand-highlight={String(linkClickState?.href === `/${locale}/shop`)}
                  onMouseDown={() => handleNavLinkPress(`/${locale}/shop`)}
                  className={`group flex items-center gap-1.5 px-2 lg:px-3 py-2 rounded-lg transition-all duration-300 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white relative ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/shop`) ? 'text-black dark:text-white' : ''
                  } ${linkClickState?.href === `/${locale}/shop` ? 'text-brand-text dark:text-brand-dark' : ''}`}
                >
                  <span className="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                    <Icon
                      name="shop"
                      className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-0 group-data-[brand-highlight=true]:opacity-0"
                      size={18}
                    />
                    <Icon
                      name="shopBold"
                      className={`absolute inset-0 transition-opacity group-active:opacity-100 text-brand-text dark:text-brand-dark ${linkClickState?.href === `/${locale}/shop` && linkClickState.phase === 'brand' ? 'opacity-100' : 'opacity-0'}`}
                      size={18}
                    />
                    {linkClickState?.href === `/${locale}/shop` && linkClickState.phase === 'spinner' && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <LoadingSpinner variant="brand" size={18} className="!h-[18px] !w-[18px]" />
                      </span>
                    )}
                  </span>
                  {tShop('title')}
                  {/* "Featured" badge for shop */}
                  <span className="absolute top-2 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                  </span>
                </Link>
              )}
            </nav>

            {/* RIGHT: Actions (Search, Cart, Settings) */}
            <div className="flex items-center justify-end gap-0 w-[124px] sm:w-[128px]">
              {/* Search (more prominent) */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg text-sidebar-text dark:text-sidebar-text-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-all duration-200"
                aria-label={locale === 'he' ? 'חיפוש פארקים' : 'Search parks'}
              >
                <span className="inline-flex items-center justify-center w-4 h-4">
                  <NavIcons name="searchBold" className="w-4 h-4" />
                </span>
              </button>

              {/* Cart with badge - only show if ecommerce is enabled */}
              {ecommerceEnabled && (
                <div className="relative">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-sidebar-text dark:text-sidebar-text-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-all duration-200"
                        aria-label={locale === 'he' ? 'עגלת קניות' : 'Shopping cart'}
                        type="button"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5">
                          <NavIcons name="backpackBold" className="w-5 h-5" />
                        </span>
                        {/* Cart badge (show when items > 0) */}
                        {itemCount > 0 && (
                          <span className="absolute -top-1 -right-1  min-w-[16px] px-[6px] rounded-full bg-brand-main dark:bg-brand-dark text-text text-[0.75rem] font-bold flex items-center justify-center transition-colors duration-200">
                            {itemCount > 9 ? '9+' : itemCount}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0 !right-0 !left-auto max-h-[600px] overflow-y-auto">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-200">
                          Shopping Cart
                        </h3>
                        {itemCount > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-200">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </p>
                        )}
                      </div>

                      {items.length === 0 ? (
                        <div className="p-8 text-center">
                          <Icon
                            name="emptyBackpack"
                            className="w-full h-auto  mx-auto mb-4 transition-colors duration-200"
                          />
                          <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                            Your bag is empty
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Cart Items */}
                          <div className="p-4 space-y-4">
                            {items.map((item) => {
                              const isUpdating = updatingItems.has(item.id);
                              const isRemoving = removingItems.has(item.id);
                              const currentPrice = item.discountPrice || item.price;
                              const hasDiscount = !!item.discountPrice;
                              const itemSubtotal = currentPrice * item.quantity;

                              return (
                                <div
                                  key={item.id}
                                  className={`flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all ${
                                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                                  }`}
                                >
                                  {/* Product Image */}
                                  <Link
                                    href={`/${locale}/shop/product/${item.productSlug}`}
                                    className="relative flex-shrink-0 w-16 h-16 bg-white dark:bg-gray-700 rounded-lg overflow-hidden hover:opacity-75 transition-all duration-200"
                                  >
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.productName}
                                      fill
                                      sizes="64px"
                                      className="object-cover"
                                    />
                                  </Link>

                                  {/* Product Details */}
                                  <div className="flex-1 min-w-0">
                                    {/* Name and Remove Button */}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <Link
                                        href={`/${locale}/shop/product/${item.productSlug}`}
                                        className="font-medium text-sm text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 line-clamp-2 flex-1"
                                      >
                                        {item.productName}
                                      </Link>
                                      <button
                                        onClick={() => handleRemoveItem(item)}
                                        disabled={isRemoving || isUpdating}
                                        className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Remove item"
                                      >
                                        {isRemoving ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    </div>

                                    {/* Size */}
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                      Size: {item.size}
                                    </p>

                                    {/* Price and Quantity */}
                                    <div className="flex items-center justify-between gap-2">
                                      {/* Price */}
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white transition-colors duration-200">
                                          ${currentPrice.toFixed(2)}
                                        </span>
                                        {hasDiscount && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 line-through transition-colors duration-200">
                                            ${item.price.toFixed(2)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Quantity Selector */}
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() =>
                                            handleUpdateQuantity(item, item.quantity - 1)
                                          }
                                          disabled={item.quantity <= 1 || isUpdating || isRemoving}
                                          className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                          aria-label="Decrease quantity"
                                        >
                                          {isUpdating ? (
                                            <Loader2 className="w-3 h-3 text-gray-600 dark:text-gray-300 animate-spin transition-colors duration-200" />
                                          ) : (
                                            <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300 transition-colors duration-200" />
                                          )}
                                        </button>

                                        <span
                                          className={`min-w-[1.5rem] text-center text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200 ${
                                            isUpdating ? 'opacity-50' : ''
                                          }`}
                                        >
                                          {item.quantity}
                                        </span>

                                        <button
                                          onClick={() =>
                                            handleUpdateQuantity(item, item.quantity + 1)
                                          }
                                          disabled={
                                            item.quantity >= item.maxStock ||
                                            isUpdating ||
                                            isRemoving
                                          }
                                          className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                          aria-label="Increase quantity"
                                        >
                                          {isUpdating ? (
                                            <Loader2 className="w-3 h-3 text-gray-600 dark:text-gray-300 animate-spin transition-colors duration-200" />
                                          ) : (
                                            <Plus className="w-3 h-3 text-gray-600 dark:text-gray-300 transition-colors duration-200" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Item Subtotal */}
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      Subtotal: ${itemSubtotal.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Totals and Checkout */}
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                            {/* Totals */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                                  Subtotal:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                                  ${totals.subtotal.toFixed(2)}
                                </span>
                              </div>
                              {totals.discount > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                                    Discount:
                                  </span>
                                  <span className="font-medium text-green-600 dark:text-green-400 transition-colors duration-200">
                                    -${totals.discount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">
                                  Tax:
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                                  ${totals.tax.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
                                <span className="text-gray-900 dark:text-white transition-colors duration-200">
                                  Total:
                                </span>
                                <span className="text-gray-900 dark:text-white transition-colors duration-200">
                                  ${totals.total.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Checkout Button */}
                            <button
                              onClick={handleCheckout}
                              className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 rounded-lg transition-colors duration-200 font-medium text-sm"
                            >
                              Checkout
                            </button>

                            {/* View Cart Link */}
                            <Link
                              href={`/${locale}/cart`}
                              className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors duration-200"
                            >
                              View full cart
                            </Link>
                          </div>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Settings */}
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="group h-9 w-9 flex items-center justify-center rounded-lg text-sidebar-text dark:text-sidebar-text-dark hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-all duration-200"
                      aria-label={locale === 'he' ? 'הגדרות' : 'Settings'}
                      type="button"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5">
                        <NavIcons
                          name="settingsBold"
                          className="w-5 h-5 group-hover:rotate-[46deg] transition-transform duration-500"
                        />
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className={`w-fit p-2 ${locale === 'he' ? '!left-0 !right-auto' : '!right-0 !left-auto'}`}
                  >
                    <div className="flex flex-col gap-2 justify-center items-center">
                      {/* Theme Toggle */}
                      <Button
                        variant="none"
                        size="sm"
                        onClick={() => toggleTheme()}
                        className={`!px-6 group w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                        aria-label={theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
                      >
                        {theme === 'dark' ? (
                          <Icon
                            name="sunBold"
                            className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-yellow-500"
                          />
                        ) : (
                          <Icon
                            name="moonBold"
                            className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-blue"
                          />
                        )}
                        <span className="text-text dark:text-text-dark/90">
                          {theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
                        </span>
                      </Button>

                      {/* Language Switcher */}
                      <Button
                        variant="none"
                        size="sm"
                        onClick={async () => {
                          const newLang = locale === 'en' ? 'he' : 'en';
                          const segments = pathname.split('/');
                          segments[1] = newLang;
                          await router.push(segments.join('/'));
                        }}
                        className={`!px-6 group w-full flex gap-2 font-medium justify-center ${locale === 'he' ? 'flex-row-reverse' : 'flex-row -ms-1'}`}
                        aria-label={tCommon('toggle_language') || 'Toggle language'}
                      >
                        {locale === 'en' ? (
                          <Icon
                            name="hebrewBold"
                            className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-[#8be100] dark:group-hover:text-brand-dark"
                          />
                        ) : (
                          <Icon
                            name="englishBold"
                            className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-[#8be100] dark:group-hover:text-brand-dark"
                          />
                        )}
                        <span className="text-text dark:text-text-dark/90">
                          {locale === 'en' ? 'עברית' : 'English'}
                        </span>
                      </Button>

                      {/* Login Button */}
                      {loginEnabled && !session && (
                        <>
                          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                          <Button
                            variant="none"
                            size="sm"
                            asChild
                            className={`!px-6 w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            <Link href={`/${locale}/login`}>
                              <Icon
                                name="accountBold"
                                className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200"
                              />
                              <span className="text-text dark:text-text-dark/90">
                                {tCommon('login') || 'Login'}
                              </span>
                            </Link>
                          </Button>
                        </>
                      )}

                      {/* User Profile Link */}
                      {loginEnabled && session && (
                        <>
                          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                          <Button
                            variant="none"
                            size="sm"
                            asChild
                            className={`!px-6 w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            <Link href={`/${locale}/account`}>
                              <Icon
                                name="accountBold"
                                className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200"
                              />
                              <span className="text-text dark:text-text-dark/90">
                                {tCommon('profile')}
                              </span>
                            </Link>
                          </Button>
                        </>
                      )}

                      {/* Admin Menu */}
                      {loginEnabled && isAdmin && (
                        <>
                          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="brand"
                                size="sm"
                                className={`group !px-6 w-full flex items-center justify-between font-medium bg-transparent dark:bg-transparent dark:border-transparent border-transparent hover:border-purple-border dark:hover:border-purple-border-dark  ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                              >

                                  <Icon
                                    name="adminBold"
                                    className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 group-hover:text-brand-text dark:group-hover:text-brand-dark  transition-all duration-200 "
                                  />
                                  <span className="flex-1 text-text dark:text-text-dark/90 group-hover:text-brand-text dark:group-hover:text-brand-dark  transition-all duration-200 ">
                                    {tCommon('admin') || 'Admin'}
                                  </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              side={locale === 'he' ? 'left' : 'right'}
                              align="start"
                              sideOffset={8}
                              className="w-fit p-2"
                            >
                              <div className="space-y-2">
                                {/* Admin Links */}
                                {[
                                  {
                                    href: `/${locale}/admin`,
                                    labelKey: 'dashboard',
                                    icon: LayoutDashboard,
                                  },
                                  {
                                    href: `/${locale}/admin/products`,
                                    labelKey: 'products',
                                    icon: Package,
                                  },
                                  {
                                    href: `/${locale}/admin/orders`,
                                    labelKey: 'orders',
                                    icon: ShoppingCart,
                                  },
                                  {
                                    href: `/${locale}/admin/users`,
                                    labelKey: 'users',
                                    icon: Users,
                                  },
                                  {
                                    href: `/${locale}/admin/skateparks`,
                                    labelKey: 'findParks',
                                    icon: MapPin,
                                  },
                                  {
                                    href: `/${locale}/admin/reviews`,
                                    labelKey: 'reviews',
                                    icon: Star,
                                  },
                                  {
                                    href: `/${locale}/admin/events`,
                                    labelKey: 'events',
                                    icon: Calendar,
                                  },
                                  {
                                    href: `/${locale}/admin/event-signups`,
                                    labelKey: 'eventSignups',
                                    icon: ClipboardList,
                                  },
                                  {
                                    href: `/${locale}/admin/trainers`,
                                    labelKey: 'findCoaches',
                                    icon: UserCircle,
                                  },
                                  {
                                    href: `/${locale}/admin/guides`,
                                    labelKey: 'guides',
                                    icon: BookOpen,
                                  },
                                  {
                                    href: `/${locale}/admin/forms`,
                                    labelKey: 'forms',
                                    icon: TestTubeDiagonal,
                                  },
                                  {
                                    href: `/${locale}/admin/metrics`,
                                    labelKey: 'metrics',
                                    icon: BarChart2,
                                  },
                                  {
                                    href: `/${locale}/admin/newsletter`,
                                    labelKey: 'newsletter',
                                    icon: ClipboardList,
                                  },
                                  {
                                    href: `/${locale}/admin/settings`,
                                    labelKey: 'settings',
                                    icon: SettingsIcon,
                                  },
                                ].map((item) => {
                                  const isActive =
                                    pathname === item.href ||
                                    (item.href !== `/${locale}/admin` &&
                                      pathname.startsWith(item.href));
                                  const IconComponent = item.icon;

                                  return (
                                    <Button
                                      key={item.href}
                                      variant={isActive ? 'info' : 'none'}
                                      size="sm"
                                      asChild
                                      className={`!px-4 w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                      <Link href={item.href}>
                                        <IconComponent
                                          className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-blue dark:text-blue-dark' : 'text-gray/75 dark:text-gray-dark/75'}`}
                                        />
                                        <span
                                          className={
                                            isActive ? '' : 'text-text dark:text-text-dark/90'
                                          }
                                        >
                                          {tMobileNav(item.labelKey)}
                                        </span>
                                      </Link>
                                    </Button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </>
                      )}

                      {/* Logout Button */}
                      {loginEnabled && session && (
                        <>
                          <Separator className="bg-popover-border dark:bg-popover-border-dark" />
                          <Button
                            variant="none"
                            size="sm"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={`!px-6 w-full flex gap-2 font-medium justify-start border border-transparent hover:border-red-border dark:hover:border-red-border-dark hover:bg-red-bg dark:hover:bg-red-bg-dark text-red dark:text-red-dark hover:text-red dark:hover:text-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {isLoggingOut ? (
                              <div className="flex items-center gap-2">
                                <LoadingSpinner
                                  size={16}
                                  variant="error"
                                  className="animate-fadeIn"
                                />
                                <span>{tCommon('logout') || 'Logout'}</span>
                              </div>
                            ) : (
                              <>
                                <Icon name="logoutBold" className="w-4 h-4" />
                                <span>{tCommon('logout') || 'Logout'}</span>
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal - colors match MobileSidebar; height never exceeds viewport */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 dark:bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 md:pt-24 transition-colors duration-200"
          style={{ height: '100dvh' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          }}
        >
          <div
            className="w-full max-w-2xl m-4 rounded-2xl shadow-2xl overflow-hidden transition-colors duration-200 flex flex-col bg-sidebar dark:bg-sidebar-dark border border-border dark:border-border-dark"
            style={{ maxHeight: 'calc(95dvh - 6rem)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: same as MobileSidebar header area */}
            <div className="flex-shrink-0 border-b border-border dark:border-border-dark bg-header dark:bg-header-dark">
              <div className="relative flex items-center gap-3 p-4">
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="flex-shrink-0 p-2 text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0 pe-12">
                  <SearchInput
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                    placeholder={tSearch('popup.placeholder') || tCommon('search') || 'Search...'}
                    className="w-full !max-w-full"
                    variant="default"
                  />
                </div>
              </div>
            </div>

            {/* Loading bar (same as MobileSidebar) */}
            {searchLoading && (
              <div className="w-full h-[1px] -mt-px bg-sidebar-hover dark:bg-sidebar-hover-dark overflow-hidden relative flex-shrink-0">
                <div className="bg-sidebar-text-brand dark:bg-sidebar-text-brand-dark loading-bar w-full h-full" />
              </div>
            )}

            {/* Content: recent/quick when empty, results when query */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-sidebar dark:bg-sidebar-dark">
              {searchQuery.trim() === '' ? (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-4 border-b border-border dark:border-border-dark">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-text dark:text-text-dark">
                          {tSearch('popup.recentSearches')}
                        </h3>
                        <button
                          onClick={() => {
                            setRecentSearches([]);
                            localStorage.removeItem('recentSearches');
                          }}
                          className="text-xs text-sidebar-text-brand dark:text-sidebar-text-brand-dark hover:underline"
                        >
                          {tSearch('popup.clear')}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearchQuery(search)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-sidebar-hover dark:bg-sidebar-hover-dark rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            <span className="text-sidebar-text dark:text-sidebar-text-dark">
                              {search}
                            </span>
                            <SearchIcon className="w-4 h-4 text-sidebar-text dark:text-sidebar-text-dark" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular: 5 most clicked search results (from analytics); only show when we have at least one */}
                  {popularClicks.length > 0 ? (
                    <div className="p-4 border-b border-border dark:border-border-dark">
                      <div className="w-full flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-text dark:text-text-dark">
                          {locale === 'he' ? 'חיפושים נפוצים:' : 'Popular Searches:'}
                        </h3>
                        <Link
                          href={`/${locale}/search`}
                          onClick={() => setIsSearchOpen(false)}
                          className="flex items-center gap-1 py-1 px-2 rounded-md text-sidebar-text-brand dark:text-sidebar-text-brand-dark hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                        >
                          <h3 className="text-sm font-semibold">
                            {locale === 'he' ? 'חיפוש מתקדם' : 'Advanced Search'}
                          </h3>
                          <Icon name="sparksBold" className="w-3 h-3" />
                        </Link>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {popularClicks.map((item) => {
                          const pathPrefix =
                            item.resultType === 'products' ? 'shop' : item.resultType;
                          const href = `/${locale}/${pathPrefix}/${item.resultSlug}`;
                          const label = item.name ?? item.resultSlug.replace(/-/g, ' ');
                          return (
                            <Link
                              key={`${item.resultType}-${item.resultSlug}`}
                              href={href}
                              onClick={() => {
                                trackSearchClick({
                                  query: label,
                                  resultType: item.resultType,
                                  resultSlug: item.resultSlug,
                                  href,
                                  source: 'header',
                                  locale,
                                  skipTracking: skipAnalyticsTracking,
                                });
                                setIsSearchOpen(false);
                              }}
                              className="px-3 py-1.5 text-sm bg-sidebar-hover dark:bg-sidebar-hover-dark hover:bg-black/5 dark:hover:bg-white/5 border border-border dark:border-border-dark rounded-full transition-colors text-sidebar-text dark:text-sidebar-text-dark"
                            >
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {/* Loading */}
                  {searchLoading && (
                    <div className="p-4 text-center text-sm text-sidebar-text dark:text-sidebar-text-dark transition-colors duration-200">
                      {tCommon('loading') || 'Loading...'}
                    </div>
                  )}

                  {/* Grouped results (like MobileSidebar) */}
                  {!searchLoading && Object.keys(groupedResults).length > 0 && (
                    <div className="p-4 space-y-6">
                      {Object.entries(groupedResults)
                        .sort(([a], [b]) => {
                          const indexA = categoryOrder.indexOf(a);
                          const indexB = categoryOrder.indexOf(b);
                          if (indexA === -1 && indexB === -1) return 0;
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          return indexA - indexB;
                        })
                        .map(([category, results]) => {
                          const displayResults = results.slice(0, maxResultsPerGroup);
                          return (
                            <div key={category} className="space-y-2">
                              <h3 className="text-sm font-bold text-text dark:text-text-dark uppercase tracking-wider transition-colors duration-200">
                                {category === 'skateparks' && searchArea
                                  ? tSearch('skateparksInArea', {
                                      area: tSkateparks(`search.area.${searchArea}`),
                                    })
                                  : categoryLabels[category] || category}
                              </h3>
                              <div className="space-y-0.5">
                                {displayResults.map((result) => {
                                  let imageUrl = '';
                                  let name = '';
                                  let href = '';
                                  if (result.type === 'skateparks') {
                                    const s = result as SkateparkResult;
                                    imageUrl = s.imageUrl || '';
                                    name =
                                      typeof s.name === 'string'
                                        ? s.name
                                        : (s.name?.[locale as 'en' | 'he'] ??
                                          s.name?.en ??
                                          s.name?.he ??
                                          '');
                                    href = `/${locale}/skateparks/${s.slug}`;
                                  } else if (result.type === 'products') {
                                    const p = result as ProductResult;
                                    imageUrl = p.images?.[0]?.url || '';
                                    name =
                                      typeof p.name === 'string'
                                        ? p.name
                                        : (p.name?.[locale as 'en' | 'he'] ??
                                          p.name?.en ??
                                          p.name?.he ??
                                          '');
                                    href = `/${locale}/shop/${p.slug}`;
                                  } else if (result.type === 'guides') {
                                    const g = result as GuideResult;
                                    imageUrl = g.coverImage || '';
                                    name = g.title || '';
                                    href = `/${locale}/guides/${g.slug}`;
                                  } else if (result.type === 'trainers') {
                                    const tr = result as TrainerResult;
                                    imageUrl = tr.profileImage || '';
                                    name = tr.name || '';
                                    href = `/${locale}/trainers/${tr.slug}`;
                                  } else if (result.type === 'events') {
                                    const ev = result as EventResult;
                                    imageUrl = ev.image || '';
                                    name = ev.title || '';
                                    href = `/${locale}/events/${ev.slug}`;
                                  }
                                  return (
                                    <Link
                                      key={result.id}
                                      href={href}
                                      onClick={() => {
                                        trackSearchClick({
                                          query: searchQuery,
                                          resultType: result.type,
                                          resultId: result.id,
                                          resultSlug: result.slug,
                                          href,
                                          source: 'header',
                                          locale,
                                          skipTracking: skipAnalyticsTracking,
                                        });
                                        setIsSearchOpen(false);
                                      }}
                                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-bg dark:hover:bg-white/[2.5%] transition-colors duration-200 group"
                                    >
                                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-card dark:bg-card-dark flex items-center justify-center transition-colors duration-200">
                                        {imageUrl ? (
                                          <Image
                                            src={imageUrl}
                                            alt={name}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <Icon
                                            name={
                                              result.type === 'skateparks'
                                                ? 'treesBold'
                                                : result.type === 'products'
                                                  ? 'shopBold'
                                                  : result.type === 'guides'
                                                    ? 'bookBold'
                                                    : result.type === 'trainers'
                                                      ? 'trainersBold'
                                                      : 'calendarBold'
                                            }
                                            className="w-6 h-6 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200"
                                          />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-sidebar-text dark:text-sidebar-text-dark line-clamp-2 group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200">
                                          {highlightMatch(name, searchQuery)}
                                        </p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark flex-shrink-0 rtl:rotate-180 transition-colors duration-200" />
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      <Link
                        href={`/${locale}/search?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="block w-full text-center py-3 text-sm font-medium text-sidebar-text-brand dark:text-sidebar-text-brand-dark hover:underline"
                      >
                        {tSearch('popup.viewAllResults')}
                      </Link>
                    </div>
                  )}

                  {/* No results */}
                  {!searchLoading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                    <div className="p-8 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sidebar-hover dark:bg-sidebar-hover-dark mb-4">
                        <SearchIcon className="w-7 h-7 text-sidebar-text-brand dark:text-sidebar-text-brand-dark" />
                      </div>
                      <h3 className="text-lg font-semibold text-text dark:text-text-dark mb-2">
                        {tSearch('popup.noResultsFound')}
                      </h3>
                      <p className="text-sm text-sidebar-text dark:text-sidebar-text-dark mb-4">
                        {tSearch('popup.noResultsHint')}
                      </p>

                      <Link
                        href={`/${locale}/search`}
                        onClick={() => setIsSearchOpen(false)}
                        className="w-fit mx-auto flex items-center gap-1 text-sm font-medium text-sidebar-text-brand dark:text-sidebar-text-brand-dark py-1 px-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                      >
                        {tSearch('popup.goToFullSearch')}
                        <Icon name="sparksBold" className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
