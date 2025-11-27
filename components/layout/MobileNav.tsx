'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { X, Search, ShoppingBag, User, Settings, LogOut, Heart } from 'lucide-react';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { useCartItemCount } from '@/stores/cartStore';

interface NavCard {
  href: string;
  icon: IconName;
  label: string;
  description: string;
  color: string; // Gradient color classes
  badge?: number;
  comingSoon?: boolean;
}

export default function MobileNavModern() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tMobileNav = useTranslations('common.mobileNav');
  const { theme, toggleTheme } = useTheme();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const itemCount = useCartItemCount();

  // Card-based navigation items
  const navCards: NavCard[] = [
    {
      href: `/${locale}/skateparks`,
      icon: 'trees',
      label: tMobileNav('findParks'),
      description: tMobileNav('findParksDesc'),
      color: 'from-teal-500 to-cyan-500', // Brand teal
    },
    {
      href: `/${locale}/events`,
      icon: 'calendarBold',
      label: tMobileNav('events'),
      description: tMobileNav('eventsDesc'),
      color: 'from-cyan-500 to-blue-500',
    },
    {
      href: `/${locale}/shop`,
      icon: 'shopBold',
      label: tMobileNav('shop'),
      description: tMobileNav('shopDesc'),
      color: 'from-green-500 to-emerald-500', // Brand green accent
    },
    {
      href: `/${locale}/guides`,
      icon: 'books',
      label: tMobileNav('guides'),
      description: tMobileNav('guidesDesc'),
      color: 'from-purple-500 to-pink-500',
    },
    // TRAINERS - Coming Soon badge
    {
      href: `/${locale}/trainers`,
      icon: 'account',
      label: tMobileNav('findCoaches'),
      description: tMobileNav('comingSoon'),
      color: 'from-orange-500 to-red-500',
      comingSoon: true,
    },
  ];

  // Mini cards for contact/about and more
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

  return (
    <>
      {/* ========================================
          MOBILE HEADER - Minimal & Clean
      ======================================== */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[50] backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4">
          
          {/* Left: Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Center: Logo + Tagline */}
          <Link href={`/${locale}`} className="flex flex-col items-center">
            <Icon name="logo-hostage3" className="w-20 h-6 text-brand-main" />
            <span className="text-[9px] font-medium text-brand-main/70 tracking-wide mt-0.5">
              Feel the Joy
            </span>
          </Link>

          {/* Right: Cart Button */}
          <Link
            href={`/${locale}/cart`}
            className="relative p-2 -mr-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={`Cart with ${itemCount} items`}
          >
            <ShoppingBag className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-500 rounded-full">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>


      {/* ========================================
          FULL-SCREEN MENU - Card-Based Navigation
      ======================================== */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 animate-in fade-in duration-200">
          
          {/* Header Section with Brand Messaging */}
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-main/10 to-transparent dark:from-brand-main/5" />
            
            <div className="relative px-6 pt-8 pb-6">
              {/* Close Button */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full transition-all"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Brand Message */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {tMobileNav('whereToNext')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tMobileNav('togetherWeRide')}
                </p>
              </div>

              {/* Search Bar */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSearchOpen(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-brand-main dark:hover:border-brand-main transition-colors"
              >
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">
                  {tMobileNav('searchPlaceholder')}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Cards Grid */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <div className="grid grid-cols-2 gap-4 mb-6">
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
                        // Could show a toast here
                      } else {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`relative group ${card.comingSoon ? 'cursor-not-allowed' : ''}`}
                  >
                    {/* Card Container */}
                    <div className={`
                      relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 
                      border-2 transition-all duration-300
                      ${isActive 
                        ? 'border-brand-main shadow-lg shadow-brand-main/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-main/50 hover:shadow-md'
                      }
                      ${card.comingSoon ? 'opacity-60' : ''}
                    `}>
                      
                      {/* Gradient Background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10 dark:opacity-5 group-hover:opacity-15 transition-opacity`} />
                      
                      {/* Content */}
                      <div className="relative p-5">
                        {/* Icon */}
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} mb-3 shadow-lg`}>
                          <Icon name={card.icon} className="w-6 h-6 text-white" />
                        </div>

                        {/* Text */}
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                          {card.label}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {card.description}
                        </p>

                        {/* Coming Soon Badge */}
                        {card.comingSoon && (
                          <div className="absolute top-3 right-3">
                            <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full shadow-md">
                              {tMobileNav('soon')}
                            </span>
                          </div>
                        )}

                        {/* Active Indicator */}
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-main to-green-500" />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mini Cards Section - Contact/About & More */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">
                {tMobileNav('infoSupport')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
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
                      relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 
                      border transition-all duration-300 p-4
                      ${miniCard.comingSoon 
                        ? 'opacity-60 border-gray-200 dark:border-gray-700' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-main/50 hover:shadow-md'
                      }
                    `}>
                      {/* Icon */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                          <Icon name={miniCard.icon} className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {miniCard.label}
                          </p>
                        </div>
                      </div>

                      {/* Coming Soon Badge */}
                      {miniCard.comingSoon && (
                        <div className="absolute top-2 right-2">
                          <span className="px-1.5 py-0.5 text-[9px] font-bold text-white bg-gradient-to-r from-orange-500 to-pink-500 rounded-full">
                            {tMobileNav('soon')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Secondary Actions - Clean List */}
            <div className="space-y-2 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              
              {/* User Account */}
              {session ? (
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
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
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tMobileNav('signIn')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tMobileNav('joinCommunity')}
                    </p>
                  </div>
                </Link>
              )}

              {/* Favorites (if logged in) */}
              {session && (
                <Link
                  href={`/${locale}/favorites`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
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
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
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
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-400">
                  <Icon name={locale === 'en' ? 'israelFlag' : 'usaFlag'} className="w-6 h-6" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {locale === 'en' ? 'עברית' : 'English'}
                </span>
              </button>

              {/* Admin (if admin) */}
              {isAdmin && (
                <Link
                  href={`/${locale}/admin`}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {tMobileNav('adminDashboard')}
                  </span>
                </Link>
              )}

              {/* Logout (if logged in) */}
              {session && (
                <button
                  onClick={async () => {
                    await signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="font-medium">
                    {tMobileNav('signOut')}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ========================================
          SEARCH MODAL - Simple & Fast
      ======================================== */}
      {isSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-gray-900">
          <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <input
                type="text"
                placeholder={tCommon('search')}
                autoFocus
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-brand-main"
              />
            </div>

            {/* Search Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
                {tMobileNav('startTypingToSearch')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}