// nextjs-app/components/layout/MobileSidebar.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { SearchInput } from '@/components/common/SearchInput';
import Image from 'next/image';
import { isEcommerceEnabled, isTrainersEnabled, isLoginEnabled, isGrowthLabEnabled } from '@/lib/utils/ecommerce';
import { flipLanguage } from '@/lib/utils/transliterate';
import { searchFromCache, getAreaFromQuery, queryMatchesCategory, type SearchResultFromCache } from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';
import { Separator } from '@/components/ui/separator';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, open the sidebar with the search panel expanded (e.g. when user taps search icon in MobileNav). */
  openWithSearch?: boolean;
}

interface NavCard {
  href: string;
  icon: IconName;
  label: string;
  description: string;
  comingSoon?: boolean;
}



interface SearchResult {
  id: string;
  type: 'skateparks' | 'products' | 'events' | 'guides' | 'trainers';
  slug: string;
  name?: string;
  title?: string;
  imageUrl?: string;
  image?: string;
  images?: Array<{ url: string }>;
  area?: 'north' | 'center' | 'south';
  /** When set to 'area', result matched by area only (north/south/center); show last. */
  matchBy?: 'name' | 'area';
  price?: number;
  discountPrice?: number;
  variants?: any[];
  totalStock?: number;
  startDate?: string;
  description?: string;
  coverImage?: string;
  profileImage?: string;
  rating?: number;
  ratingCount?: number;
  totalReviews?: number;
  readTime?: number;
  relatedSports?: string[];
}

export default function MobileSidebar({ isOpen, onClose, openWithSearch = false }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
  const tSearch = useTranslations('search');
  const tSkateparks = useTranslations('skateparks');
  const { theme, toggleTheme } = useTheme();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = session?.user?.role === 'admin';
  const ecommerceEnabled = isEcommerceEnabled();
  const trainersEnabled = isTrainersEnabled();
  const loginEnabled = isLoginEnabled();
  const growthLabEnabled = isGrowthLabEnabled();

  // 1. Navigation Configuration (Grid Cards) - icons: Home, trees, guideBold, calendarBold, targetBold
  const navCards: NavCard[] = [
    {
      href: `/${locale}`,
      icon: 'house',
      label: tMobileNav('home'),
      description: tMobileNav('homeDesc'),
    },
    {
      href: `/${locale}/skateparks`,
      icon: 'trees',
      label: tMobileNav('findParks'),
      description: tMobileNav('findParksDesc'),
    },
    {
      href: `/${locale}/guides`,
      icon: 'book',
      label: tMobileNav('guides'),
      description: tMobileNav('guidesDesc'),
    },
    {
      href: `/${locale}/events`,
      icon: 'calendar',
      label: tMobileNav('events'),
      description: tMobileNav('eventsDesc'),
    },
    ...(ecommerceEnabled ? [{
      href: `/${locale}/shop`,
      icon: 'shop' as IconName,
      label: tMobileNav('shop'),
      description: tMobileNav('shopDesc'),
    }] : []),
    ...(growthLabEnabled ? [{
      href: `/${locale}/growth-lab`,
      icon: 'plantBold' as IconName,
      label: tMobileNav('forms'),
      description: tMobileNav('growthLabDesc'),
    }] : []),
    {
      href: `/${locale}/about`,
      icon: 'targetBold',
      label: tCommon('about'),
      description: tCommon('aboutDesc'),
    },
    { 
      href: `/${locale}/contact`, 
      icon: 'messages', 
      label: tCommon('contact'), 
      description: tMobileNav('findCoaches') || '',
    },
    ...(trainersEnabled ? [{
      href: `/${locale}/trainers`,
      icon: 'trainersBold' as IconName,
      label: tMobileNav('findCoaches'),
      description: tMobileNav('findCoaches') || '',
    }] : []),
  ];



  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup: restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isOpen]);

  // Reset search when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setIsSearchOpen(false);
    }
  }, [isOpen]);

  // When opened via "search" from MobileNav, open the search panel
  useEffect(() => {
    if (isOpen && openWithSearch) {
      setIsSearchOpen(true);
    }
  }, [isOpen, openWithSearch]);

  // Auto-focus search input when search opens (including when opened from MobileNav search icon)
  useEffect(() => {
    if (isSearchOpen && isOpen) {
      // 150ms is enough for the sidebar to start appearing
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          // Hand off the focus from the trigger input to the actual input
          searchInputRef.current.focus();
          
          // Optional: on some versions of iOS, a second click helps
          searchInputRef.current.click();
        }
      }, 150); 
      
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen, isOpen]);

  // Resolve display name/title for search (locale-aware; handles name as object)
  const getResultDisplayName = (result: SearchResult): string => {
    const raw = result.name ?? result.title ?? '';
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object' && 'en' in raw && 'he' in raw) {
      const loc = locale === 'he' ? 'he' : 'en';
      return (raw as { en?: string; he?: string })[loc] ?? (raw as { en?: string; he?: string }).en ?? (raw as { en?: string; he?: string }).he ?? '';
    }
    return String(raw);
  };

  // Weighted search scoring: original query matches score higher than flipped (keyboard-layout) matches.
  // Flipped match at start scores higher than flipped match in middle, but both use .includes() so middle matches appear.
  const calculateSearchScore = (
    result: SearchResult,
    query: string,
    flippedQuery: string | null
  ): number => {
    const q = query.toLowerCase().trim();
    if (!q) return 0;

    const queryLower = q.toLowerCase();
    const flippedLower = flippedQuery ? flippedQuery.toLowerCase().trim() : null;

    // Field weights; flipped matches use a discount so original-query matches rank higher
    const WEIGHTS = {
      name: 1.0,
      title: 1.0,
      category: 0.7,
      area: 0.5,
      description: 0.5,
      tags: 0.5,
    };
    const FLIPPED_DISCOUNT = 0.9; // flipped matches score slightly lower than direct
    const FLIPPED_MIDDLE_DISCOUNT = 0.8; // flipped match in middle slightly lower than at start, but still high enough to appear

    let score = 0;
    const displayName = getResultDisplayName(result).toLowerCase();

    // Name/title: prefer original match, then flipped. Use .includes() so middle/end matches count.
    if (displayName.includes(queryLower)) {
      score += displayName.startsWith(queryLower) ? WEIGHTS.name * 2 : WEIGHTS.name;
    } else if (flippedLower && displayName.includes(flippedLower)) {
      // Flipped match: start = higher score, middle/end = slightly lower but still in results
      const base = displayName.startsWith(flippedLower) ? WEIGHTS.name * 2 : WEIGHTS.name;
      const discount = displayName.startsWith(flippedLower) ? FLIPPED_DISCOUNT : FLIPPED_MIDDLE_DISCOUNT;
      score += base * discount;
    }

    // Category/type
    const categoryMap: Record<string, string> = {
      skateparks: 'skatepark',
      products: 'product',
      events: 'event',
      guides: 'guide',
      trainers: 'trainer',
    };
    const categoryName = categoryMap[result.type] || '';
    if (categoryName && (queryLower.includes(categoryName) || (flippedLower?.includes(categoryName)))) {
      score += WEIGHTS.category;
    }

    // Area
    if (result.area) {
      const areaMap: Record<string, string> = {
        north: 'north',
        center: 'center',
        south: 'south',
      };
      const areaName = areaMap[result.area] || '';
      if (areaName && (queryLower.includes(areaName) || (flippedLower?.includes(areaName)))) {
        score += WEIGHTS.area;
      }
    }

    // Description
    if (result.description) {
      const descLower = result.description.toLowerCase();
      if (descLower.includes(queryLower)) {
        score += WEIGHTS.description;
      } else if (flippedLower && descLower.includes(flippedLower)) {
        score += WEIGHTS.description * FLIPPED_DISCOUNT;
      }
    }

    // Related sports/tags
    if (result.relatedSports && Array.isArray(result.relatedSports)) {
      const hasMatch = result.relatedSports.some((sport) => {
        const s = sport.toLowerCase();
        return s.includes(queryLower) || (flippedLower != null && s.includes(flippedLower));
      });
      if (hasMatch) {
        score += WEIGHTS.tags;
      }
    }

    return score;
  };

  // Cache-backed categories: search localStorage first; only call API for products/trainers
  const cacheCategories = useMemo((): ('skateparks' | 'events' | 'guides')[] => {
    return ['skateparks', 'events', 'guides'];
  }, []);

  const apiCategories = useMemo((): ('products' | 'trainers')[] => {
    const list: ('products' | 'trainers')[] = [];
    if (ecommerceEnabled) list.push('products');
    if (trainersEnabled) list.push('trainers');
    return list;
  }, [ecommerceEnabled, trainersEnabled]);

  // Map SearchResultFromCache to SearchResult (same shape as API); preserve matchBy so area matches show last
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
  };

  // Fetch search results: cache first (localStorage), then API only for products/trainers
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchLoading(false);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const flippedQuery = flipLanguage(searchQuery);
        const q = searchQuery.toLowerCase().trim();
        const flippedLower = flippedQuery ? flippedQuery.toLowerCase().trim() : null;
        const rawResults: SearchResult[] = [];

        // 1) Search cache first: localStorage (skateparks_cache, events_cache, guides_cache)
        if (cacheCategories.length > 0) {
          const cacheResults = await searchFromCache(searchQuery, locale, cacheCategories);
          rawResults.push(...cacheResults.map(mapCacheResultToSearchResult));
        }

        // 2) Only then: fetch from API for products/trainers (no cache for these)
        if (apiCategories.length > 0) {
          const params = new URLSearchParams();
          params.set('q', searchQuery);
          if (flippedQuery && flippedQuery !== searchQuery) {
            params.set('flippedQ', flippedQuery);
          }
          params.set('locale', locale);
          params.set('types', apiCategories.join(','));
          const res = await fetch(`/api/search?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            rawResults.push(...(data.results || []));
          }
        }

        // When user types in Hebrew, display name may be in English (locale); cache/API already matched name.he — keep those results
        const queryContainsHebrew = /\p{Script=Hebrew}/u.test(searchQuery.trim());
        const matchesQueryOrFlipped = (result: SearchResult): boolean => {
          const name = getResultDisplayName(result).toLowerCase();
          if (result.matchBy === 'area') return true;
          // Category trigger: e.g. "אירועים", "events", "thrugho" → show all events; same for skateparks/guides (≥3 chars)
          if (result.type === 'events' && queryMatchesCategory(searchQuery, 'events')) return true;
          if (result.type === 'skateparks' && queryMatchesCategory(searchQuery, 'skateparks')) return true;
          if (result.type === 'guides' && queryMatchesCategory(searchQuery, 'guides')) return true;
          if (!name) return false;
          if (name.includes(q) || (flippedLower != null && flippedLower !== '' && name.includes(flippedLower))) return true;
          if (queryContainsHebrew) return true; // matched on name.he in cache/API; display name is locale (e.g. en)
          return false;
        };
        const filteredResults = rawResults.filter((r: SearchResult) => matchesQueryOrFlipped(r));

        // Calculate scores and sort by weighted relevance (original query matches rank higher)
        type ScoredResult = SearchResult & { _score: number };
        const scoredResults: ScoredResult[] = filteredResults.map((result: SearchResult) => ({
          ...result,
          _score: calculateSearchScore(result, searchQuery, flippedQuery),
        }));

        // Sort: area-matched results last (matchBy === 'area'), then higher score, then startsWith, then alphabetically
        const improvedResults = scoredResults.sort((a: ScoredResult, b: ScoredResult) => {
          const aAreaLast = a.matchBy === 'area' ? 1 : 0;
          const bAreaLast = b.matchBy === 'area' ? 1 : 0;
          if (aAreaLast !== bAreaLast) return aAreaLast - bAreaLast;
          if (b._score !== a._score) {
            return b._score - a._score;
          }

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
            // Tie-break: prefer includes(flipped) in middle over no match
            const aIncludesF = aName.includes(flippedLower);
            const bIncludesF = bName.includes(flippedLower);
            if (aIncludesF && !bIncludesF) return -1;
            if (!aIncludesF && bIncludesF) return 1;
          }
          return aName.localeCompare(bName);
        });

        // Remove the temporary _score property
        const finalResults: SearchResult[] = improvedResults
          .map((item: ScoredResult) => {
            const { _score, ...result } = item;
            return result;
          })
          // Filter out products if ecommerce is disabled
          .filter((result) => {
            if (result.type === 'products' && !ecommerceEnabled) {
              return false;
            }
            return true;
          });

        setSearchResults(finalResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, locale, cacheCategories, apiCategories]);

  // Group results by category (now consumes the sorted results)
  const groupedResults = useMemo(() => {
    return searchResults
      .filter((result) => {
        // Filter out products if ecommerce is disabled
        if (result.type === 'products' && !ecommerceEnabled) {
          return false;
        }
        return true;
      })
      .reduce((acc, result) => {
        if (!acc[result.type]) {
          acc[result.type] = [];
        }
        acc[result.type].push(result);
        return acc;
      }, {} as Record<string, SearchResult[]>);
  }, [searchResults, ecommerceEnabled]);

  // Calculate max results per group: 6 if multiple groups, unlimited if single group
  const maxResultsPerGroup = useMemo(() => {
    const groupCount = Object.keys(groupedResults).length;
    return groupCount > 1 ? 6 : Infinity;
  }, [groupedResults]);

  const categoryLabels: Record<string, string> = {
    skateparks: tMobileNav('findParks') || 'Skateparks',
    products: tMobileNav('shop') || 'Products',
    events: tMobileNav('events') || 'Events',
    guides: tMobileNav('guides') || 'Guides',
    trainers: tMobileNav('findCoaches') || 'Trainers',
  };

  // When search query is an area term (north/south/center or צפון/דרום/מרכז), show "Skateparks in X area" header
  const searchArea = useMemo(() => getAreaFromQuery(searchQuery), [searchQuery]);

  // Define category display order (skateparks before guides)
  // Only include products if ecommerce is enabled
  const categoryOrder = ecommerceEnabled 
    ? ['skateparks', 'products', 'events', 'guides', 'trainers']
    : ['skateparks', 'events', 'guides', 'trainers'];

  // Theme toggle handler with animation
  const handleThemeToggle = () => {
    setShouldAnimate(true);
    toggleTheme();
    setTimeout(() => setShouldAnimate(false), 300);
  };

  // Language toggle handler
  const handleLanguageToggle = async () => {
    const newLang = locale === 'en' ? 'he' : 'en';
    const segments = pathname.split('/');
    segments[1] = newLang;
    await router.push(segments.join('/'));
  };

  // Logout handler
  const handleLogout = () => {
    signOut();
  };

  
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-colors duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ height: '150vh' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <div 
        className={`sidebar h-full fixed ${locale === 'he' ? 'right-0' : 'left-0'} top-0 bottom-0 z-[61] w-full max-w-[500px] bg-sidebar dark:bg-sidebar-dark shadow-2xl  ease-out transition-all duration-300 flex flex-col`}
        style={{ 
          height: '100dvh',
          transform: isOpen 
            ? 'translateX(0)' 
            : locale === 'he' 
              ? 'translateX(100%)' 
              : 'translateX(-100%)'
        }}
      >
        
        {/* === HEADER === */}
        <div className="flex-none border-b border-border dark:border-border-dark bg-header dark:bg-header-dark transition-colors duration-200">
          {/* Header */}
          <div className="flex flex-row-reverse items-start justify-between pb-2 mx-2 pt-2 pe-2 flex-shrink-0">
            <div className="flex max-w-[260px] items-center top-0">
              <button
                onClick={() => {
                  if (isSearchOpen) {
                    // Close search and clear results
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearching(false);
                  } else {
                    // Open search and focus input
                    setIsSearchOpen(true);
                    // Immediately attempt to focus for mobile keyboard
                     searchInputRef.current?.focus();
                  }
                }}
                className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                aria-label={isSearchOpen ? "Close Search" : "Open Search"}
              >
                <Icon name={isSearchOpen ? "searchClose" : "search"} className="w-4 h-4" />
                <span>{tCommon('search') || 'Search'}</span>
              </button>

              {/* Login Button */}
              {loginEnabled && !session && (
                <Link
                  href={`/${locale}/login`}
                  className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                  onClick={onClose}
                >
                  <Icon name="account" className="w-4 h-4" />
                  <span>{tCommon('login') || 'Login'}</span>
                </Link>
              )}

              {/* User Profile Link */}
              {loginEnabled && session && !isAdmin && (
                <Link
                  href={`/${locale}/account`}
                  className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                  onClick={onClose}
                >
                  <Icon name="account" className="w-4 h-4" />
                  <span>{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

          {loginEnabled && session && isAdmin && (
                <Link
                  href={`/${locale}/account`}
                  className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                  onClick={onClose}
                >
                  <Icon name="admin" className="w-5 h-5" />
                  <span className="-mt-0.5">{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                aria-label={theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
              >
                {theme === 'dark' ? (
                  <Icon name="sun" className={`w-4 h-4 ${shouldAnimate ? 'animate-pop' : ''}`} />
                ) : (
                  <Icon name="moon" className={`w-4 h-4 ${shouldAnimate ? 'animate-pop' : ''}`} />
                )}
                <span>{theme === 'dark' ? tCommon('light_mode') || 'Light Mode' : tCommon('dark_mode') || 'Dark Mode'}</span>
              </button>

              {/* Language Switcher Button */}
              <button
                onClick={handleLanguageToggle}
                className={`p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                aria-label={tCommon('toggle_language') || 'Toggle language'}
              >
                {locale === 'en' ? (
                  <Icon name="hebrew" className="w-4 h-4 overflow-visible" />
                ) : (
                  <Icon name="english" className="w-4 h-4 overflow-visible" />
                )}
                <span>{locale === 'en' ? 'עברית' : 'English'}</span>
              </button>

              {/* Logout Button */}
              {loginEnabled && session && (
                <button
                  onClick={() => {
                    handleLogout();
                    onClose();
                  }}
                  className={`flex flex-col items-center justify-between gap-3 px-3 py-2 text-xs text-error/70 dark:text-error-dark/70 hover:text-error dark:hover:text-error-dark hover:bg-red-bg/50 dark:hover:bg-red-bg-dark/50 rounded-lg transition-colors duration-200 w-full ${locale === 'he' ? 'max-w-[58px]' : 'max-w-[65px]'}`}
                >
                  <Icon name="logout" className="w-4 h-4" />
                  <span>{tCommon('logout') || 'Logout'}</span>
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="h-14 p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              aria-label="Close menu"
            >
              <Icon name="X" className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar - shown when search icon is clicked */}
          <div 
            className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
              isSearchOpen 
                ? 'max-h-20 opacity-100 pb-4' 
                : 'max-h-0 opacity-0 pb-0'
            }`}
          >
            <div className="px-4">
              <SearchInput
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearching(false);
                }}
                placeholder={tMobileNav('searchPlaceholder') || "Search..."}
                className="w-full !max-w-full focus-within:!outline-transparent focus-visible:!outline-red-500"
                variant="default"
              />
            </div>
          </div>

          {/* Loading Bar Animation - shown when searching */}
          {searchLoading && (
            <div className="w-full h-[1px] -mt-1 bg-sidebar-hover dark:bg-sidebar-hover-dark overflow-hidden relative">
              <div className="bg-sidebar-text-brand dark:bg-sidebar-text-brand-dark loading-bar w-full h-full" />
            </div>
          )}
        </div>

        {/* === SCROLLABLE CONTENT === */}
        <div className="flex-1 overflow-y-auto me-4 py-6 bg-sidebar dark:bg-sidebar-dark transition-colors duration-200">
          {isSearching ? (
            // Search Results
            <div className="space-y-6 px-3">
              {searchLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  {tCommon('loading') || 'Loading...'}
                </div>
              ) : Object.keys(groupedResults).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  {tCommon('noResults') || 'No results found'}
                </div>
              ) : (
                Object.entries(groupedResults)
                  .sort(([a], [b]) => {
                    const indexA = categoryOrder.indexOf(a);
                    const indexB = categoryOrder.indexOf(b);
                    // If category not in order list, put it at the end
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                  })
                  .map(([category, results]) => {
                    // Limit results if there are multiple groups
                    const displayResults = results.slice(0, maxResultsPerGroup);
                    
                    return (
                      <div key={category} className="space-y-3">
                        <h3 className="text-sm font-bold text-text dark:text-text-dark uppercase tracking-wider transition-colors duration-200">
                          {category === 'skateparks' && searchArea
                            ? tSearch('skateparksInArea', { area: tSkateparks(`search.area.${searchArea}`) })
                            : (categoryLabels[category] || category)}
                        </h3>
                        <div className="space-y-1">
                          {displayResults.map((result) => {
                            // Get image URL based on type
                            let imageUrl = '';
                            let name = '';
                            let href = '';

                            if (result.type === 'skateparks') {
                              imageUrl = result.imageUrl || '';
                              name = typeof result.name === 'string' ? result.name : (result.name || '');
                              href = `/${locale}/skateparks/${result.slug}`;
                            } else if (result.type === 'products') {
                              imageUrl = result.images?.[0]?.url || '';
                              if (typeof result.name === 'string') {
                                name = result.name;
                              } else if (result.name && typeof result.name === 'object') {
                                name = (result.name as { en?: string; he?: string }).en || (result.name as { en?: string; he?: string }).he || '';
                              } else {
                                name = '';
                              }
                              href = `/${locale}/shop/${result.slug}`;
                            } else if (result.type === 'guides') {
                              imageUrl = result.coverImage || '';
                              name = result.title || '';
                              href = `/${locale}/guides/${result.slug}`;
                            } else if (result.type === 'trainers') {
                              imageUrl = result.profileImage || '';
                              name = result.name || '';
                              href = `/${locale}/trainers/${result.slug}`;
                            } else if (result.type === 'events') {
                              imageUrl = result.image || '';
                              name = result.title || '';
                              href = `/${locale}/events/${result.slug}`;
                            }

                            return (
                              <Link
                                key={result.id}
                                href={href}
                                onClick={onClose}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-bg dark:hover:bg-white/[2.5%] transition-colors duration-200 group"
                              >
                                {/* Thumbnail */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-card dark:bg-card-dark flex items-center justify-center transition-colors duration-200">
                                  {imageUrl ? (
                                    <Image
                                      src={imageUrl}
                                      alt={name}
                                      width={180}
                                      height={180}
                                      quality={50}
                                      className="w-full h-full object-cover saturate-150"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <Icon
                                      name={
                                        result.type === 'skateparks' ? 'treesBold' :
                                        result.type === 'products' ? 'shopBold' :
                                        result.type === 'guides' ? 'bookBold' :
                                        result.type === 'trainers' ? 'trainersBold' :
                                        'calendarBold'
                                      }
                                      className="w-6 h-6 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200"
                                    />
                                  )}
                                </div>
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                  <p className="w-full max-w-[75%] text-sm font-medium text-sidebar-text dark:text-sidebar-text-dark line-clamp-2 group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200">
                                    {highlightMatch(name, searchQuery)}
                                  </p>
                                </div>
                                {/* Arrow */}
                                <ChevronRight className="rtl:rotate-180 w-4 h-4 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark flex-shrink-0 transition-colors duration-200" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ) : (
            // Regular Navigation Content
            <>
          
          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto pt-4 min-h-0">
            {navCards.map((card) => {
              const isActive = pathname === card.href || 
                (card.href !== `/${locale}` && pathname.startsWith(card.href));

              return (
                <div key={card.href} className={`overflow-hidden min-w-fit w-3/4 ${locale === 'he' ? 'rounded-l-full' : 'rounded-r-full'}`}>
                <Link
                  href={card.href}
                  onClick={onClose}
                  className={`flex items-center gap-5 px-2 py-3 text-3xl ${
                    isActive
                      ? 'ps-4 pe-6 bg-brand-main/20 dark:bg-brand-main/5 text-brand-main dark:text-brand-main'
                      : 'ms-2 text-black/80 dark:text-white/90'
                  }`}
                >
                  <Icon
                    name={card.icon}
                    className={`flex-shrink-0 w-4 h-4 -mb-0.5 overflow-visible ${isActive ? 'text-brand-main dark:text-brand-main' : 'text-black/80 dark:text-white/90'}`}
                  />
                  <span className="font-medium">{card.label}</span>
                </Link>
                </div>
              );
            })}
          </nav>



          

          {/* Admin Management Links */}
          {loginEnabled && isAdmin && (
            <nav className="text-base mt-12 px-6 transition-colors duration-200">
            <Separator className="my-6 !w-[80%]" />
              <ul className="grid grid-cols-2 gap-4">
                {[
                  {
                    href: `/${locale}/admin`,
                    labelKey: 'dashboard',
                    icon: (
                      <Icon name="adminBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/products`,
                    labelKey: 'products',
                    icon: (
                      <Icon name="objectsBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/orders`,
                    labelKey: 'orders',
                    icon: (
                      <Icon name="shopBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/users`,
                    labelKey: 'users',
                    icon: (
                      <Icon name="accountBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/forms`,
                    labelKey: 'forms',
                    icon: (
                      <Icon name="plantBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/skateparks`,
                    labelKey: 'findParks',
                    icon: (
                      <Icon name="treesBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/reviews`,
                    labelKey: 'reviews',
                    icon: (
                      <Icon name="starWandBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/events`,
                    labelKey: 'events',
                    icon: (
                      <Icon name="calendarBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/event-signups`,
                    labelKey: 'eventSignups',
                    icon: (
                      <Icon name="taskBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/trainers`,
                    labelKey: 'findCoaches',
                    icon: (
                      <Icon name="trainersBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/guides`,
                    labelKey: 'guides',
                    icon: (
                      <Icon name="bookBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/metrics`,
                    labelKey: 'metrics',
                    icon: (
                      <Icon name="chartBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/newsletter`,
                    labelKey: 'newsletter',
                    icon: (
                      <Icon name="clipboardBold" className="w-4 h-4" />
                    ),
                  },
                  {
                    href: `/${locale}/admin/settings`,
                    labelKey: 'settings',
                    icon: (
                      <Icon name="settingsBold" className="w-4 h-4" />
                    ),
                  },
                ].map((item) => {
                  const isActive = pathname === item.href || (item.href !== `/${locale}/admin` && pathname.startsWith(item.href));
                  
                  
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`block transition-colors duration-200 ${
                          isActive
                            ? 'text-[#16641a] dark:text-[#85ef8a] font-semibold'
                            : 'text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`transition-colors duration-200 -mb-1 ${
                            isActive
                              ? 'text-[#16641a] dark:text-[#85ef8a]'
                              : 'text-sidebar-text dark:text-sidebar-text-dark'
                          }`}>
                            {item.icon}
                          </span>
                          <span>{tMobileNav(item.labelKey)}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
            </>
          )}
        </div>

       
      </div>
    </>
  );
}