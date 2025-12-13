// nextjs-app/components/layout/MobileSidebar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { X, LogOut, User, Settings, ChevronRight } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { SearchInput } from '@/components/common/SearchInput';
import Image from 'next/image';

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
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = session?.user?.role === 'admin';

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
      comingSoon: true,
    },
  ];

  // 2. Secondary Links (Mini Cards)
  const miniCards: MiniCard[] = [
    { href: `/${locale}/contact`, icon: 'messages', label: tCommon('contact') },
    { href: `/${locale}/about`, icon: 'infoBold', label: tCommon('about') },
    { href: `/${locale}/terms`, icon: 'info', label: tMobileNav('termsAndConditions'), comingSoon: true },
    { href: `/${locale}/accessibility`, icon: 'info', label: tMobileNav('accessibility'), comingSoon: true },
];

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset search when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

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

  // Handle Swipe Gestures (Swipe left to close)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const diffX = e.touches[0].clientX - touchStart.x;
    const diffY = e.touches[0].clientY - touchStart.y;

    // Only allow horizontal swipe if vertical movement is minimal
    if (Math.abs(diffX) > 10 && Math.abs(diffY) < 50) {
      if (diffX < 0) { // Swiping Left
        setSwipeDistance(diffX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeDistance < -100) onClose(); // Close threshold
    setTouchStart(null);
    setSwipeDistance(0);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <div 
        className={`sidebar fixed top-0 left-0 bottom-0 z-[61] w-full max-w-[500px] bg-sidebar dark:bg-sidebar-dark shadow-2xl transition-transform duration-300 ease-out border-r border-header-border dark:border-header-border-dark flex flex-col`}
        style={{ 
          transform: isOpen ? `translateX(${swipeDistance}px)` : 'translateX(-100%)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* === HEADER === */}
        <div className="flex-none px-5 pt-6 pb-4 border-b border-header-border dark:border-header-border-dark bg-header dark:bg-header-dark">
          <div className="flex items-center justify-between mb-6">
            <Link href={`/${locale}`} onClick={onClose}>
                <Icon name="logo-hostage3" className="w-28 h-auto text-brand-main" />
            </Link>
            <button 
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder={tMobileNav('searchPlaceholder') || "Search..."}
              className="w-full !max-w-full focus-within:!outline-transparent focus-visible:!outline-red-500"
              variant="default"
            />
          </div>
        </div>

        {/* === SCROLLABLE CONTENT === */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-sidebar dark:bg-sidebar-dark">
          {isSearching ? (
            // Search Results
            <div className="space-y-6">
              {searchLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {tCommon('loading') || 'Loading...'}
                </div>
              ) : Object.keys(groupedResults).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {tCommon('noResults') || 'No results found'}
                </div>
              ) : (
                Object.entries(groupedResults).map(([category, results]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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
                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors group"
                          >
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
                                    result.type === 'skateparks' ? 'trees' :
                                    result.type === 'products' ? 'shopBold' :
                                    result.type === 'guides' ? 'books' :
                                    result.type === 'trainers' ? 'trainersBold' :
                                    'calendarBold'
                                  }
                                  className="w-6 h-6 text-gray-400 dark:text-gray-500"
                                />
                              )}
                            </div>
                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-brand-main dark:group-hover:text-brand-main transition-colors">
                                {name}
                              </p>
                            </div>
                            {/* Arrow */}
                            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
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
          <div className="grid grid-cols-2 gap-3 mb-8">
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
                    className={`block relative group h-full ${card.comingSoon ? 'cursor-not-allowed opacity-40 ' : ''}`}
                  >
                    <div className={` 
                      relative overflow-hidden rounded-2xl bg-card dark:bg-card-dark border border-card-border dark:border-sidebar-border-brand
                       transition-all duration-200 p-4 h-full flex flex-col items-start
                      ${isActive 
                        ? 'border-sidebar-border-brand dark:border-sidebar-border-brand-dark bg-sidebar-hover-brand dark:bg-sidebar-hover-brand-dark' 
                        : card.comingSoon
                          ? 'border-transparent'
                          : 'border-transparent hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark'
                      }
                    `}>

                      {/* Icon Box */}
                      <div className={`
                        mb-3 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200
                        ${isActive 
                          ? 'bg-sidebar-icon-brand dark:bg-sidebar-icon-brand-dark text-[#e8fae9] dark:text-black/85 shadow-sm border border-sidebar-hover-brand dark:border-sidebar-hover-brand-dark' 
                          : 'bg-sidebar-hover dark:bg-black/20 text-sidebar-text dark:text-sidebar-text-dark'
                        }
                      `}>
                         <Icon name={card.icon} className="w-5 h-5" />
                      </div>

                      {/* Text Content */}
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-sm leading-tight ${isActive ? ' text-sidebar-text-brand dark:text-sidebar-text-brand-dark' : 'text-sidebar-text dark:text-sidebar-text-dark'}`}>
                            {card.label}
                          </h3>
                        </div>
                        
                        {card.comingSoon ? (
                             <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-500 mt-1">
                              SOON
                            </span>
                        ) : (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight">
                            {card.description}
                            </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
             })}
          </div>

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
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-sidebar dark:bg-sidebar-dark hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-all group"
                >
                  <div className="flex-none flex items-center justify-center w-6 h-6 rounded-full  transition-colors">
                     <Icon name={card.icon} className="w-3 h-3 text-sidebar-text dark:text-sidebar-text-dark group-hover:text-sidebar-brand dark:group-hover:text-sidebar-brand-dark" />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {card.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
            </>
          )}
        </div>

        {/* === FOOTER === */}
        <div className="flex-none p-4 bg-header dark:bg-header-dark border-t border-header-border dark:border-header-border-dark">
          
          {/* User Profile */}
          {session ? (
            <div className="flex items-center gap-2 mb-3">
              <Link href={`/${locale}/account`} onClick={onClose} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-colors group flex-1">
                 <div className="w-9 h-9 rounded-full bg-brand-main text-white flex items-center justify-center shadow-sm">
                   <User className="w-5 h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{session.user?.name || "My Account"}</p>
                   <p className="text-[10px] text-gray-500">View profile settings</p>
                 </div>
                 <Settings className="w-4 h-4 text-gray-400 group-hover:text-brand-main transition-colors" />
              </Link>
              {isAdmin && (
                <Link 
                  href={`/${locale}/admin`} 
                  onClick={onClose} 
                  className="flex items-center justify-center p-2.5 rounded-xl hover:bg-white dark:hover:bg-header-hover-dark transition-colors group border border-gray-200 dark:border-gray-700"
                  aria-label="Admin Panel"
                >
                  <Icon name="adminBold" className="w-4 h-4 text-gray-400 group-hover:text-brand-main transition-colors" />
                </Link>
              )}
            </div>
          ) : (
             <Link href={`/${locale}/login`} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity mb-4 shadow-md">
               <User className="w-4 h-4" />
               <span className="text-sm font-bold flex-1 text-center">{tMobileNav('signIn')}</span>
            </Link>
          )}

          {/* Bottom Controls */}
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-brand-main/30 transition-all">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5" />
              <span>{theme === 'dark' ? tMobileNav('lightMode') : tMobileNav('darkMode')}</span>
            </button>
            
            <button 
              onClick={async () => {
                const newLang = locale === 'en' ? 'he' : 'en';
                const segments = pathname.split('/');
                segments[1] = newLang;
                await router.push(segments.join('/'));
                onClose();
              }} 
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-brand-main/30 transition-all"
            >
              <Icon name={locale === 'en' ? 'israelFlag' : 'usaFlag'} className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'Hebrew' : 'English'}</span>
            </button>

            {session && (
              <button 
                onClick={() => { signOut(); onClose(); }} 
                className="flex-none p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
                aria-label={tMobileNav('signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}