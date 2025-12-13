// nextjs-app/components/layout/MobileNav.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { X, Search, ShoppingBag, User, Settings, LogOut, Heart, Menu, PanelLeft } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useCartItemCount } from '@/stores/cartStore';
import MobileSidebar from './MobileSidebar';

interface NavCard {
  href: string;
  icon: IconName;
  label: string;
  description: string;
  badge?: number;
  comingSoon?: boolean;
}

export default function MobileNavMinimal() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
  const { theme, toggleTheme } = useTheme();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);
  const itemCount = useCartItemCount();

  // MINIMAL PALETTE - Only green + neutrals
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
    // TRAINERS - Coming Soon
    {
      href: `/${locale}/trainers`,
      icon: 'account',
      label: tMobileNav('findCoaches'),
      description: tMobileNav('comingSoon'),
      comingSoon: true,
    },
  ];

  interface MiniCard {
    href: string;
    icon: IconName;
    label: string;
    comingSoon?: boolean;
  }

  const miniCards: MiniCard[] = [
    {
      href: `/${locale}/contact`,
      icon: 'messages',
      label: tCommon('contact'),
    },
    {
      href: `/${locale}/about`,
      icon: 'infoBold',
      label: tCommon('about'),
    },
    {
      href: `/${locale}/help`,
      icon: 'questionMark',
      label: tCommon('account.help'),
      comingSoon: true,
    },
    {
      href: `/${locale}/faq`,
      icon: 'info',
      label: tMobileNav('faq'),
      comingSoon: true,
    },
  ];

  const isAdmin = session?.user?.role === 'admin';

  // Check if on skateparks page
  const isSkateparksPage = pathname.includes('/skateparks');
  
  // Determine border class based on page and scroll
  const getBorderClass = () => {
    if (isSkateparksPage) {
      // On skateparks page: border-b when not scrolled, border-b-2 when scrolled
      return scrollY > 0 ? 'border-b-2' : 'border-b';
    } else {
      // On all other pages: always border-b-2
      return 'border-b-2';
    }
  };

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Scroll detection for header visibility
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

  return (
    <>
      {/* ========================================
          MOBILE HEADER - MINIMAL & REFINED
          Green accent only on active/hover states
      ======================================== */}
      <header 
        className={`[@media_(min-width:820px)]:hidden fixed top-0 left-0 right-0 z-[50] bg-header dark:bg-header-dark ${getBorderClass()} border-header-border dark:border-header-border-dark shadow-sm transition-all duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          
          {/* Left: Menu Button and Sidebar Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2.5 -ml-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" strokeWidth={2} />
            </button>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95"
              aria-label="Open sidebar"
            >
              <PanelLeft className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>

          {/* Center: Logo */}
          <Link href={`/${locale}`} className="flex flex-col items-center group">
            <Icon 
              name="logo-hostage3" 
              className="w-[124px] h-[39px] sm:w-[128px] sm:h-[24px] text-brand-main dark:text-brand-dark transition-opacity group-hover:opacity-80" 
            />
          </Link>

          {/* Right: Cart Button - Minimal Badge */}
          <Link
            href={`/${locale}/cart`}
            className="relative p-2.5 -mr-2 text-header-icon dark:text-header-icon-dark hover:text-brand-main dark:hover:text-brand-main hover:bg-gray-100 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 active:scale-95 group"
            aria-label={`Cart with ${itemCount} items`}
          >
            <ShoppingBag className="w-6 h-6" strokeWidth={2} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-brand-main rounded-full shadow-lg ring-2 ring-white dark:ring-gray-900">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>


      {/* ========================================
          FULL-SCREEN MENU - MINIMAL GREEN PALETTE
          No multi-color gradients, only green accents
      ======================================== */}
      {isMenuOpen && (
        <div className="[@media_(min-width:820px)]:hidden fixed inset-0 z-[60] bg-white dark:bg-gray-950 animate-in fade-in duration-200">
          
          {/* Header Section - Clean & Minimal */}
          <div className="relative border-b border-gray-200 dark:border-gray-800">
            <div className="relative px-5 pt-6 pb-5">
              {/* Close Button */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-5 right-5 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" strokeWidth={2} />
              </button>

              {/* Brand Message - Refined Typography */}
              <div className="mb-5 pr-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
                  {tMobileNav('whereToNext')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {tMobileNav('togetherWeRide')}
                </p>
              </div>

              {/* Search Bar - Minimal Green Accent */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSearchOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-main/50 dark:hover:border-brand-main/50 transition-all group"
              >
                <Search className="w-5 h-5 text-gray-400 group-hover:text-brand-main transition-colors" strokeWidth={2} />
                <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                  {tMobileNav('searchPlaceholder')}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Cards Grid - MINIMAL DESIGN */}
          <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {navCards.map((card) => {
                const isActive = pathname === card.href || 
                  (card.href !== `/${locale}` && pathname.startsWith(card.href));

                return (
                  <Link
                    key={card.href}
                    href={card.comingSoon ? '#' : card.href}
                    onClick={(e) => {
                      if (card.comingSoon) {
                        e.preventDefault();
                      } else {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`relative group ${card.comingSoon ? 'cursor-not-allowed' : ''}`}
                  >
                    {/* Card Container - Clean with Green Accent */}
                    <div className={`
                      relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900
                      border-2 transition-all duration-300
                      ${isActive 
                        ? 'border-brand-main shadow-lg shadow-brand-main/10 dark:shadow-brand-main/20' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-brand-main/30 dark:hover:border-brand-main/30'
                      }
                      ${card.comingSoon ? 'opacity-50' : ''}
                    `}>
                      
                      {/* Subtle Green Glow on Active */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-main/5 to-transparent pointer-events-none" />
                      )}
                      
                      {/* Content */}
                      <div className="relative p-4">
                        {/* Icon - Green only on active/hover */}
                        <div className={`
                          inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 transition-all duration-300
                          ${isActive 
                            ? 'bg-brand-main shadow-md shadow-brand-main/20' 
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-brand-main/30 group-hover:bg-brand-main/5'
                          }
                        `}>
                          <Icon 
                            name={card.icon} 
                            className={`w-6 h-6 transition-colors ${
                              isActive 
                                ? 'text-white' 
                                : 'text-gray-700 dark:text-gray-300 group-hover:text-brand-main'
                            }`}
                          />
                        </div>

                        {/* Text */}
                        <h3 className={`font-bold text-sm mb-1 transition-colors ${
                          isActive 
                            ? 'text-brand-main' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {card.label}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
                          {card.description}
                        </p>

                        {/* Coming Soon Badge - Orange gradient for visibility */}
                        {card.comingSoon && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full shadow-sm">
                              {tMobileNav('soon')}
                            </span>
                          </div>
                        )}

                        {/* Active Indicator - Clean Line */}
                        {isActive && !card.comingSoon && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-main" />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mini Cards Section - Simplified */}
            <div className="mb-5">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
                {tMobileNav('infoSupport')}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {miniCards.map((miniCard) => (
                  <Link
                    key={miniCard.href}
                    href={miniCard.comingSoon ? '#' : miniCard.href}
                    onClick={(e) => {
                      if (miniCard.comingSoon) {
                        e.preventDefault();
                      } else {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`relative group ${miniCard.comingSoon ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className={`
                      relative overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-900 
                      border transition-all duration-300 p-3.5
                      ${miniCard.comingSoon 
                        ? 'opacity-50 border-gray-200 dark:border-gray-800' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-brand-main/30 dark:hover:border-brand-main/30 hover:bg-white dark:hover:bg-gray-800'
                      }
                    `}>
                      <div className="flex items-center gap-2.5">
                        {/* Icon - Minimal Gray Circle */}
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-800 group-hover:bg-brand-main/10 transition-colors">
                          <Icon 
                            name={miniCard.icon} 
                            className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-brand-main transition-colors" 
                          />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {miniCard.label}
                        </p>
                      </div>

                      {/* Coming Soon Badge */}
                      {miniCard.comingSoon && (
                        <div className="absolute top-2 right-2">
                          <span className="px-1.5 py-0.5 text-[8px] font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full">
                            {tMobileNav('soon')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Secondary Actions - Clean List with Minimal Green Accents */}
            <div className="space-y-1 bg-gray-50 dark:bg-gray-900 rounded-2xl p-3 border border-gray-200 dark:border-gray-800">
              
              {/* User Account */}
              {session ? (
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-main shadow-sm">
                    <User className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {session.user?.name || tMobileNav('myAccount')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tMobileNav('viewProfileSettings')}
                    </p>
                  </div>
                </Link>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-brand-main/10 transition-colors">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-brand-main transition-colors" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {tMobileNav('signIn')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tMobileNav('joinCommunity')}
                    </p>
                  </div>
                </Link>
              )}

              {/* Favorites */}
              {session && (
                <Link
                  href={`/${locale}/favorites`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                    <Heart className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-500 transition-colors" strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {tMobileNav('favorites')}
                  </span>
                </Link>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/20 transition-colors">
                  <Icon 
                    name={theme === 'dark' ? 'sun' : 'moon'} 
                    className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" 
                  />
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {theme === 'dark' ? tMobileNav('lightMode') : tMobileNav('darkMode')}
                </span>
              </button>

              {/* Language Toggle */}
              <button
                onClick={async () => {
                  const newLang = locale === 'en' ? 'he' : 'en';
                  const segments = pathname.split('/');
                  segments[1] = newLang;
                  await router.push(segments.join('/'));
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800">
                  <Icon name={locale === 'en' ? 'israelFlag' : 'usaFlag'} className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {locale === 'en' ? 'עברית' : 'English'}
                </span>
              </button>

              {/* Admin */}
              {isAdmin && (
                <Link
                  href={`/${locale}/admin`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/20 transition-colors">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {tMobileNav('adminDashboard')}
                  </span>
                </Link>
              )}

              {/* Logout */}
              {session && (
                <button
                  onClick={async () => {
                    await signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <LogOut className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-sm text-red-600 dark:text-red-400">
                    {tMobileNav('signOut')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ========================================
          SEARCH MODAL - Minimal & Clean
      ======================================== */}
      {isSearchOpen && (
        <div className="[@media_(min-width:820px)]:hidden fixed inset-0 z-[60] bg-white dark:bg-gray-950 animate-in fade-in duration-200">
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              >
                <X className="w-6 h-6" strokeWidth={2} />
              </button>
              <input
                type="text"
                placeholder={tCommon('search')}
                autoFocus
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-brand-main border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder:text-gray-500"
              />
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-center text-gray-500 dark:text-gray-400 mt-12 text-sm">
                {tMobileNav('startTypingToSearch')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      <MobileSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
    </>
  );
}