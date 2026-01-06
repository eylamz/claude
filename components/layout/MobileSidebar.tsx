// nextjs-app/components/layout/MobileSidebar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { SearchInput } from '@/components/common/SearchInput';
import Image from 'next/image';
import { isEcommerceEnabled, isTrainersEnabled } from '@/lib/utils/ecommerce';

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

  // 1. Navigation Configuration (Grid Cards)
  const navCards: NavCard[] = [
    {
      href: `/${locale}/skateparks`,
      icon: 'trees',
      label: tMobileNav('findParks'),
      description: tMobileNav('findParksDesc'),
    },
    {
      href: `/${locale}/events`,
      icon: 'calendarBold',
      label: tMobileNav('events'),
      description: tMobileNav('eventsDesc'),
    },
    {
      href: `/${locale}/shop`,
      icon: 'shopBold',
      label: tMobileNav('shop'),
      description: tMobileNav('shopDesc'),
      comingSoon: !ecommerceEnabled,
    },
    {
      href: `/${locale}/guides`,
      icon: 'books',
      label: tMobileNav('guides'),
      description: tMobileNav('guidesDesc'),
    },
    {
      href: `/${locale}/trainers`,
      icon: 'trainersBold',
      label: tMobileNav('findCoaches'),
      description: tMobileNav('comingSoon'),
      comingSoon: !trainersEnabled,
    },
  ];

  // 2. Secondary Links (Mini Cards)
  const miniCards: MiniCard[] = [
    { href: `/${locale}/contact`, icon: 'messages', label: tCommon('contact') },
    { href: `/${locale}/about`, icon: 'targetBold', label: tCommon('about') },
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
        setSearchResults(data.results || []);
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

  // Group results by category
  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const categoryLabels: Record<string, string> = {
    skateparks: tMobileNav('findParks') || 'Skateparks',
    products: tMobileNav('shop') || 'Products',
    events: tMobileNav('events') || 'Events',
    guides: tMobileNav('guides') || 'Guides',
    trainers: tMobileNav('findCoaches') || 'Trainers',
  };

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
        className={`sidebar h-full fixed inset-0 z-[61] w-full max-w-[500px] bg-sidebar dark:bg-sidebar-dark shadow-2xl  ease-out transition-all duration-200 flex flex-col`}
        style={{ 
          height: '100dvh',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' 
        }}
      >
        
        {/* === HEADER === */}
        <div className="flex-none border-b border-border dark:border-border-dark bg-header dark:bg-header-dark transition-colors duration-200">
          {/* Header */}
          <div className="flex flex-row-reverse items-start justify-between pb-2 mx-2 pt-6 flex-shrink-0">
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
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                aria-label={isSearchOpen ? "Close Search" : "Open Search"}
              >
                <Icon name={isSearchOpen ? "searchClose" : "searchBold"} className="w-4 h-4" />
                <span>{tCommon('search') || 'Search'}</span>
              </button>

              {/* Login Button */}
              {!session && (
                <Link
                  href={`/${locale}/login`}
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                  onClick={onClose}
                >
                  <Icon name="accountBold" className="w-4 h-4" />
                  <span>{tCommon('login') || 'Login'}</span>
                </Link>
              )}

              {/* User Profile Link */}
              {session && !isAdmin && (
                <Link
                  href={`/${locale}/account`}
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                  onClick={onClose}
                >
                  <Icon name="accountBold" className="w-4 h-4" />
                  <span>{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

          {session && isAdmin && (
                <Link
                  href={`/${locale}/account`}
                  className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                  onClick={onClose}
                >
                  <Icon name="adminBold" className="w-5 h-5" />
                  <span className="-mt-0.5">{tCommon('profile') || 'Profile'}</span>
                </Link>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={handleThemeToggle}
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                aria-label={theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
              >
                {theme === 'dark' ? (
                  <Icon name="sunBold" className={`w-4 h-4 ${shouldAnimate ? 'animate-pop' : ''}`} />
                ) : (
                  <Icon name="moonBold" className={`w-4 h-4 ${shouldAnimate ? 'animate-pop' : ''}`} />
                )}
                <span>{theme === 'dark' ? tCommon('light_mode') || 'Light Mode' : tCommon('dark_mode') || 'Dark Mode'}</span>
              </button>

              {/* Language Switcher Button */}
              <button
                onClick={handleLanguageToggle}
                className="p-2 flex flex-col items-center gap-3 text-xs text-sidebar-text dark:text-sidebar-text-dark hover:text-sidebar-brand dark:hover:text-sidebar-brand-dark transition-colors duration-200"
                aria-label={tCommon('toggle_language') || 'Toggle language'}
              >
                {locale === 'en' ? (
                  <Icon name="hebrewBold" className="w-4 h-4" />
                ) : (
                  <Icon name="englishBold" className="w-4 h-4" />
                )}
                <span>{locale === 'en' ? 'עברית' : 'English'}</span>
              </button>

              {/* Logout Button */}
              {session && (
                <button
                  onClick={() => {
                    handleLogout();
                    onClose();
                  }}
                  className="flex flex-col items-center justify-between gap-3 px-3 py-2 text-xs text-error/70 dark:text-error-dark/70 hover:text-error dark:hover:text-error-dark transition-colors duration-200"
                >
                  <Icon name="logoutBold" className="w-4 h-4" />
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
              <div className="bg-sidebar-text-brand/30 dark:bg-sidebar-text-brand-dark/30 loading-bar w-full h-full" />
            </div>
          )}
        </div>

        {/* === SCROLLABLE CONTENT === */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-sidebar dark:bg-sidebar-dark transition-colors duration-200">
          {isSearching ? (
            // Search Results
            <div className="space-y-6">
              {searchLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  {tCommon('loading') || 'Loading...'}
                </div>
              ) : Object.keys(groupedResults).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  {tCommon('noResults') || 'No results found'}
                </div>
              ) : (
                Object.entries(groupedResults).map(([category, results]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold text-text dark:text-text-dark uppercase tracking-wider transition-colors duration-200">
                      {categoryLabels[category] || category}
                    </h3>
                    <div className="space-y-1">
                      {results.map((result) => {
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
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors duration-200 group"
                          >
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-colors duration-200">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={name}
                                  width={180}
                                  height={180}
                                  quality={50}
                                  className="w-full h-full object-cover saturate-125"
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
                                {name}
                              </p>
                            </div>
                            {/* Arrow */}
                            <ChevronRight className="rtl:rotate-180 w-4 h-4 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-text dark:group-hover:text-text-dark flex-shrink-0 transition-colors duration-200" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Regular Navigation Content
            <>
          
          {/* Main Navigation - GRID LAYOUT */}
          <div className="grid grid-cols-2 gap-2 mb-6">
             {navCards.map((card) => {
                const isActive = pathname === card.href || (card.href !== `/${locale}` && pathname.startsWith(card.href));
                
                return (
                  <Link
                    key={card.href}
                    href={card.comingSoon ? '#' : card.href}
                    onClick={(e) => {
                      if (card.comingSoon) e.preventDefault();
                      else onClose();
                    }}
                    className={`block relative group h-full ${card.comingSoon ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className={` 
                      relative overflow-hidden rounded-xl bg-card dark:bg-card-dark border
                       transition-colors duration-200 p-3 h-full flex flex-col gap-2 items-start
                      ${isActive 
                        ? 'border !bg-[#defce0] dark:!bg-[#1452174d] border-[#85ef8a] dark:border-[#1452174d]' 
                        : card.comingSoon
                          ? 'border-transparent bg-card/60 dark:bg-card-dark/40'
                          : 'border-transparent hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark'
                      }
                    `}>

                      {/* Icon Box */}
                      <div className="w-full flex justify-between items-start relative">
                        <div className={`${card.comingSoon ? 'opacity-50' : ''}
                          w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200
                          ${isActive 
                            ? 'bg-[#16641a] dark:bg-[#85ef8a] text-[#defce0] dark:text-[#145217] shadow-sm ' 
                            : 'bg-sidebar-hover dark:bg-black/20 text-sidebar-text dark:text-sidebar-text-dark group-hover:bg-sidebar/50 dark:group-hover:bg-sidebar-dark/50'
                          }
                        `}>
                          <Icon name={card.icon} className="w-4 h-4" />
                        </div>
                        <div className="h-full flex items-start justify-end">
                      {card.comingSoon && (
                          <span className="inline-block text-xs xsm:text-sm font-semibold px-1.5 py-0.5 bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark rounded">
                            {card.href.includes('/trainers') 
                              ? (locale === 'he' ? 'בשלבי סיום' : 'Almost Done')
                              : card.href.includes('/shop')
                              ? (locale === 'he' ? 'מסדרים מדפים' : 'Restocking')
                              : (locale === 'he' ? 'בקרוב' : 'Coming soon!')
                            }
                          </span>
                        )}
                        </div>
                        
                      </div>

                      {/* Text Content */}
                      <div className={`w-full ${card.comingSoon ? 'opacity-50' : ''}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className={`font-bold text-base leading-tight transition-colors duration-200 ${isActive ? 'text-[#16641a] dark:text-[#85ef8a]' : 'text-sidebar-text dark:text-sidebar-text-dark'}`}>
                            {card.label}
                          </h3>
                        </div>
                        
                          <p className={`text-xs xsm:text-sm  line-clamp-2 leading-tight transition-colors duration-200 ${isActive ? 'text-[#16641a] dark:text-[#4fb154]' : 'text-sidebar-text dark:text-sidebar-text-dark'}`}>
                            {card.description}
                          </p>
                      </div>
                      
                    </div>
                  </Link>
                );
             })}
          </div>

          {/* Admin Management Links */}
          {isAdmin && (
            <div className="mb-4">
              <h4 className="px-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                {tMobileNav('adminManagement') || "Admin Management"}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    href: `/${locale}/admin`,
                    labelKey: 'dashboard',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/products`,
                    labelKey: 'products',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/orders`,
                    labelKey: 'orders',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/users`,
                    labelKey: 'users',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/skateparks`,
                    labelKey: 'findParks',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/reviews`,
                    labelKey: 'reviews',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/events`,
                    labelKey: 'events',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/trainers`,
                    labelKey: 'findCoaches',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/guides`,
                    labelKey: 'guides',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    ),
                  },
                  {
                    href: `/${locale}/admin/settings`,
                    labelKey: 'settings',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                  },
                ].map((item) => {
                  const isActive = pathname === item.href || (item.href !== `/${locale}/admin` && pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-1 p-3 rounded-xl bg-card dark:bg-card-dark hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors duration-200 group ${
                        isActive ? 'bg-sidebar-hover-brand dark:bg-sidebar-hover-brand-dark' : ''
                      }`}
                    >
                      <div className="flex-none flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200">
                        <span className={`overflow-visible transition-colors duration-200 ${
                          isActive 
                            ? 'text-sidebar-text-brand dark:text-sidebar-text-brand-dark' 
                            : 'text-sidebar-text dark:text-sidebar-text-dark group-hover:text-sidebar-brand dark:group-hover:text-sidebar-brand-dark'
                        }`}>
                          {item.icon}
                        </span>
                      </div>
                      <span className={`overflow-visible text-sm font-semibold transition-colors duration-200 ${
                        isActive 
                          ? 'text-sidebar-text-brand dark:text-sidebar-text-brand-dark' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {tMobileNav(item.labelKey)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mini Cards (Info & Support) */}
          <div className="mb-4">
            <h4 className="px-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              {tMobileNav('infoSupport') || "Support"}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {miniCards.map((card) => (
                <Link
                  key={card.href}
                  href={card.comingSoon ? '#' : card.href}
                  onClick={card.comingSoon ? (e) => e.preventDefault() : onClose}
                  className="flex items-center gap-1 p-3 rounded-xl bg-card dark:bg-card-dark hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors duration-200 group"
                >
                  <div className=" flex-none flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200">
                     <Icon name={card.icon} className="w-4 h-4 overflow-visible text-sidebar-text dark:text-sidebar-text-dark group-hover:text-sidebar-brand dark:group-hover:text-sidebar-brand-dark transition-colors duration-200" />
                  </div>
                  <span className="overflow-visible  text-md font-semibold text-gray-700 dark:text-gray-300 transition-colors duration-200">
                    {card.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
            </>
          )}
        </div>

       
      </div>
    </>
  );
}