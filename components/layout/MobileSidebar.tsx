// nextjs-app/components/layout/MobileSidebar.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { SearchInput } from '@/components/common/SearchInput';
import Image from 'next/image';
import { isEcommerceEnabled, isTrainersEnabled, isLoginEnabled } from '@/lib/utils/ecommerce';
import { Separator } from '@/components/ui/separator';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavCard {
  href: string;
  icon: IconName;
  label: string;
  description: string;
  comingSoon?: boolean;
}

interface MiniCard {
  href: string;
  icon: IconName;
  label: string;
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

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
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

  // 1. Navigation Configuration (Grid Cards)
  const navCards: NavCard[] = [
    {
      href: `/${locale}`,
      icon: 'home',
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
      icon: 'books',
      label: tMobileNav('guides'),
      description: tMobileNav('guidesDesc'),
    },
    {
      href: `/${locale}/events`,
      icon: 'calendarBold',
      label: tMobileNav('events'),
      description: tMobileNav('eventsDesc'),
    },
    ...(ecommerceEnabled ? [{
      href: `/${locale}/shop`,
      icon: 'shopBold' as IconName,
      label: tMobileNav('shop'),
      description: tMobileNav('shopDesc'),
    }] : []),
    
    {
      href: `/${locale}/about`,
      icon: 'targetBold',
      label: tCommon('about'),
      description: tCommon('aboutDesc'),
    },
    ...(trainersEnabled ? [{
      href: `/${locale}/trainers`,
      icon: 'trainersBold' as IconName,
      label: tMobileNav('findCoaches'),
      description: tMobileNav('findCoaches') || '',
    }] : []),
  ];

  // 2. Secondary Links (Mini Cards)
  const miniCards: MiniCard[] = [
    { href: `/${locale}/contact`, icon: 'messages', label: tCommon('contact') },
    { href: `/${locale}/terms`, icon: 'termsBold', label: tMobileNav('termsAndConditions') },
    { href: `/${locale}/accessibility`, icon: 'accessibilityBold', label: tMobileNav('accessibility') },
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

  // Auto-focus search input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      // Small delay to ensure the input is visible before focusing
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350); // Increased delay to match transition duration
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  // Weighted search scoring function
  const calculateSearchScore = (result: SearchResult, query: string): number => {
    const q = query.toLowerCase().trim();
    if (!q) return 0;

    let score = 0;
    const queryLower = q.toLowerCase();

    // Field weights
    const WEIGHTS = {
      name: 1.0,        // Highest priority - exact name matches
      title: 1.0,       // Highest priority - exact title matches
      category: 0.7,    // Type/category matches
      area: 0.5,        // Area matches (north, center, south)
      description: 0.5, // Description matches
      tags: 0.5,        // Tags/related sports
    };

    // Check name/title (weight 1.0)
    const displayName = (result.name || result.title || '').toLowerCase();
    if (displayName.includes(queryLower)) {
      if (displayName.startsWith(queryLower)) {
        score += WEIGHTS.name * 2; // Bonus for startsWith
      } else {
        score += WEIGHTS.name;
      }
    }

    // Check category/type (weight 0.7)
    const categoryMap: Record<string, string> = {
      skateparks: 'skatepark',
      products: 'product',
      events: 'event',
      guides: 'guide',
      trainers: 'trainer',
    };
    const categoryName = categoryMap[result.type] || '';
    if (categoryName && queryLower.includes(categoryName)) {
      score += WEIGHTS.category;
    }

    // Check area (weight 0.5) - for skateparks and trainers
    if (result.area) {
      const areaMap: Record<string, string> = {
        north: 'north',
        center: 'center',
        south: 'south',
      };
      const areaName = areaMap[result.area] || '';
      if (areaName && queryLower.includes(areaName)) {
        score += WEIGHTS.area;
      }
    }

    // Check description (weight 0.5)
    if (result.description) {
      const descLower = result.description.toLowerCase();
      if (descLower.includes(queryLower)) {
        score += WEIGHTS.description;
      }
    }

    // Check related sports/tags (weight 0.5)
    if (result.relatedSports && Array.isArray(result.relatedSports)) {
      const hasMatch = result.relatedSports.some(sport => 
        sport.toLowerCase().includes(queryLower)
      );
      if (hasMatch) {
        score += WEIGHTS.tags;
      }
    }

    return score;
  };

  // Highlight matches in text (handles case-insensitive matching)
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim() || !text) return text;

    const queryLower = query.toLowerCase().trim();
    const textLower = text.toLowerCase();
    const index = textLower.indexOf(queryLower);

    if (index === -1) return text;

    // Preserve original case for display
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);

    return (
      <>
        {before}
        <mark className="bg-transparent font-bold text-brand-main dark:text-brand-dark">
          {match}
        </mark>
        {after}
      </>
    );
  };

  // Fetch search results
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
        const params = new URLSearchParams();
        params.set('q', searchQuery);
        params.set('locale', locale);
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error('Search failed');
        
        const data = await res.json();
        const rawResults = data.results || [];
        const q = searchQuery.toLowerCase().trim();

        // Calculate scores and sort by weighted relevance
        type ScoredResult = SearchResult & { _score: number };
        const scoredResults: ScoredResult[] = rawResults.map((result: SearchResult) => ({
          ...result,
          _score: calculateSearchScore(result, searchQuery),
        }));

        // Sort: Higher score first, then by startsWith, then alphabetically
        const improvedResults = scoredResults.sort((a: ScoredResult, b: ScoredResult) => {
          // First sort by score (descending)
          if (b._score !== a._score) {
            return b._score - a._score;
          }

          // If scores are equal, prioritize startsWith
          const aName = (a.name || a.title || '').toLowerCase();
          const bName = (b.name || b.title || '').toLowerCase();
          
          if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
          if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
          
          // Finally, alphabetical
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
  }, [searchQuery, locale]);

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
          <div className="flex flex-row-reverse items-start justify-between pb-2 mx-2 pt-2 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-1 top-0">
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
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                aria-label={isSearchOpen ? "Close Search" : "Open Search"}
              >
                <Icon name={isSearchOpen ? "searchClose" : "search"} className="w-4 h-4" />
                <span>{tCommon('search') || 'Search'}</span>
              </button>

              {/* Login Button */}
              {loginEnabled && !session && (
                <Link
                  href={`/${locale}/login`}
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
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
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={onClose}
                >
                  <Icon name="account" className="w-4 h-4" />
                  <span>{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

          {loginEnabled && session && isAdmin && (
                <Link
                  href={`/${locale}/account`}
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                  onClick={onClose}
                >
                  <Icon name="admin" className="w-5 h-5" />
                  <span className="-mt-0.5">{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
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
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors duration-200"
                aria-label={tCommon('toggle_language') || 'Toggle language'}
              >
                {locale === 'en' ? (
                  <Icon name="hebrew" className="w-4 h-4" />
                ) : (
                  <Icon name="english" className="w-4 h-4" />
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
                  className="flex flex-col items-center justify-between gap-3 px-3 py-2 text-xs text-error/70 dark:text-error-dark/70 hover:text-error dark:hover:text-error-dark hover:bg-red-bg/50 dark:hover:bg-red-bg-dark/50 rounded-lg transition-colors duration-200"
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
        <div className="flex-1 overflow-y-auto px-2 py-6 bg-sidebar dark:bg-sidebar-dark transition-colors duration-200">
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
                          {categoryLabels[category] || category}
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
                                        result.type === 'skateparks' ? 'trees' :
                                        result.type === 'products' ? 'shopBold' :
                                        result.type === 'guides' ? 'books' :
                                        result.type === 'trainers' ? 'trainersBold' :
                                        'calendarBold'
                                      }
                                      className="w-6 h-6 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200"
                                    />
                                  )}
                                </div>
                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-sidebar-text dark:text-sidebar-text-dark line-clamp-1 group-hover:text-text dark:group-hover:text-text-dark transition-colors duration-200">
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
                <div className="rounded overflow-hidden">
                <Link
                  key={card.href}
                  href={card.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-2 py-3 text-3xl ${
                    isActive
                      ? 'ps-3 bg-brand-main/20 dark:bg-brand-main/5 text-brand-main dark:text-brand-main ltr:border-l-4 rtl:border-r-4 border-brand-main'
                      : 'ms-2 text-black/80 dark:text-white/90'
                  }`}
                >
                  <span className="font-medium">{card.label}</span>
                </Link>
                </div>
              );
            })}
          </nav>



          

          {/* Separator between navCards and miniCards */}
          <Separator className="my-6 !w-[60%]" />

          {/* Mini Cards (Info & Support) - nav.body-4 structure */}
          <nav className="text-base mt-12 px-6 transition-colors duration-200">
            <ul className="flex flex-col items-start gap-4">
              {miniCards.map((card) => {
                const isActive = pathname === card.href || (card.href !== `/${locale}` && pathname.startsWith(card.href));
                
                return (
                  <li key={card.href}>
                    <Link
                      href={card.comingSoon ? '#' : card.href}
                      onClick={card.comingSoon ? (e) => e.preventDefault() : onClose}
                      className={`block transition-colors duration-200 ${
                        card.comingSoon 
                          ? 'cursor-not-allowed opacity-50 text-sidebar-text dark:text-sidebar-text-dark' 
                          : isActive
                            ? 'text-[#16641a] dark:text-[#85ef8a] font-semibold'
                            : 'text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark'
                      }`}
                    >
                      {card.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
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
                      <Icon name="taskBold" className="w-4 h-4" />
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
                      <Icon name="trees" className="w-4 h-4" />
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