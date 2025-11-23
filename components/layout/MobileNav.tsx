'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Trash2,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { Icon } from '@/components/icons/Icon';
import { useTheme } from '@/context/ThemeProvider';
import { Button } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  useCartStore, 
  useCartItemCount, 
  useCartItems, 
  useCartTotals,
  type CartItem 
} from '@/stores/cartStore';

interface NavItem {
  href: string;
  iconName: string;
  label: string;
  badge?: number;
}

interface MobileNavProps {
  userId?: string;
}

export default function MobileNav({ userId }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tShop = useTranslations('shop');
  const tEvents = useTranslations('events');
  const tAdmin = useTranslations('admin');
  const { theme, toggleTheme } = useTheme();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Cart state
  const itemCount = useCartItemCount();
  const items = useCartItems();
  const totals = useCartTotals();
  const { updateQuantity, removeItem } = useCartStore();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Gesture state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Save search to recent searches
  const saveSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  }, [recentSearches]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    saveSearch(query);
    setIsSearchOpen(false);
    setSearchQuery('');
    router.push(`/${locale}/search?q=${encodeURIComponent(query)}`);
  }, [locale, router, saveSearch]);


  // Handle theme toggle
  const handleThemeToggle = () => {
    setShouldAnimate(true);
    toggleTheme();
  };

  // Handle language toggle
  const handleLanguageToggle = async () => {
    const newLang = locale === 'en' ? 'he' : 'en';
    const segments = pathname.split('/');
    segments[1] = newLang;
    await router.push(segments.join('/'));
  };

  // Handle quantity update
  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.maxStock) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));
    
    try {
      await updateQuantity(item.id, newQuantity);
    } catch (err) {
      console.error('Failed to update quantity:', err);
    } finally {
      setTimeout(() => {
        setUpdatingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 300);
    }
  };

  // Handle item removal
  const handleRemoveItem = async (item: CartItem) => {
    setRemovingItems(prev => new Set(prev).add(item.id));
    
    try {
      await removeItem(item.id);
    } catch (err) {
      console.error('Failed to remove item:', err);
      setRemovingItems(prev => {
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

  // Navigation items for hamburger menu
  const navItems: NavItem[] = [
    { href: `/${locale}`, iconName: 'homeBold', label: tCommon('home') },
    { href: `/${locale}/shop`, iconName: 'shopBold', label: tShop('title') },
    { href: `/${locale}/skateparks`, iconName: 'trees', label: tAdmin('skateparks') },
    { href: `/${locale}/events`, iconName: 'calendarBold', label: tEvents('title') },
    { href: `/${locale}/trainers`, iconName: 'accounts', label: tAdmin('trainers') },
    { href: `/${locale}/guides`, iconName: 'books', label: tAdmin('guides') },
    { href: `/${locale}/contact`, iconName: 'messages', label: tCommon('contact') },
    { href: `/${locale}/about`, iconName: 'info', label: tCommon('about') },
  ];

  const isAdmin = session?.user?.role === 'admin';

  // Swipe to close menu
  const handleTouchStart = (e: React.TouchEvent, type: 'menu' | 'search') => {
    if (type === 'menu' && !isMenuOpen) return;
    if (type === 'search' && !isSearchOpen) return;
    
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
    setSwipeDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent, type: 'menu' | 'search') => {
    if (!touchStart) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStart.x;
    const diffY = currentY - touchStart.y;

    // Check if horizontal swipe (threshold 45 degrees)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      // For menu: swipe right to close
      if (type === 'menu' && diffX > 0) {
        setSwipeDistance(diffX);
      }
      // For search: swipe down to close
      if (type === 'search' && diffY > 0) {
        setSwipeDistance(diffY);
      }
    }
  };

  const handleTouchEnd = (type: 'menu' | 'search') => {
    if (!touchStart) return;
    
    const threshold = 100;
    if (swipeDistance > threshold) {
      if (type === 'menu') setIsMenuOpen(false);
      if (type === 'search') setIsSearchOpen(false);
    }
    
    setTouchStart(null);
    setSwipeDistance(0);
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen && !isSearchOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen, isSearchOpen]);

  // Prevent body scroll when menu/search is open
  useEffect(() => {
    if (isMenuOpen || isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen, isSearchOpen]);

  // Handle theme toggle animation
  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 300); // Match the animation duration
      return () => clearTimeout(timer);
    }
  }, [shouldAnimate]);

  // Handle Enter key for search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (searchInputRef.current?.contains(document.activeElement) || searchInputRef.current === document.activeElement)) {
        e.preventDefault();
        handleSearch(searchQuery);
      }
    };

    if (isMenuOpen || isSearchOpen) {
      const inputElement = searchInputRef.current;
      if (inputElement) {
        inputElement.addEventListener('keydown', handleKeyDown as any);
        return () => inputElement.removeEventListener('keydown', handleKeyDown as any);
      }
    }
  }, [isMenuOpen, isSearchOpen, searchQuery, handleSearch]);

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

  return (
    <>
      {/* Mobile Header */}
      <header className=" md:hidden fixed top-0 left-0 right-0 z-[50] px-3 select-none transition-all duration-200 ease-in-out text-white backdrop-blur-sm shadow-lg bg-[linear-gradient(to_right,transparent_0%,#ffffffd4_10%,#ffffff_50%,#ffffffd4_90%,transparent_100%)] dark:bg-[linear-gradient(to_right,transparent_0%,#101317b3_10%,#101317_50%,#101317b3_90%,transparent_100%)]">
        <div className="mx-auto border-b border-border/50 dark:border-border-dark w-full px-2 overflow-visible text-header-text-dark dark:text-header-text">
          <div className="flex items-center justify-between h-14">
            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 text-text dark:text-text-dark hover:text-black dark:hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>

            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <Icon name="logo-hostage3" className="w-24 h-8 text-header-text dark:text-header-text-dark" />
            </Link>

            {/* Cart Button */}
            <div className="relative">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="relative p-2 text-text dark:text-text-dark hover:text-black dark:hover:text-white transition-colors"
                    aria-label={`Shopping cart with ${itemCount} items`}
                  >
                    <Icon name="cart" className="w-6 h-6" />
                    {itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {itemCount > 9 ? '9+' : itemCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-0 !right-0 !left-auto max-h-[600px] overflow-y-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Shopping Cart
                    </h3>
                    {itemCount > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    )}
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center">
                      <Icon name="cart" className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Your cart is empty</p>
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
                                className="relative flex-shrink-0 w-16 h-16 bg-white dark:bg-gray-700 rounded-lg overflow-hidden hover:opacity-75 transition-opacity"
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
                                    className="font-medium text-sm text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors line-clamp-2 flex-1"
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
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                      ${currentPrice.toFixed(2)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                        ${item.price.toFixed(2)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Quantity Selector */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                      disabled={item.quantity <= 1 || isUpdating || isRemoving}
                                      className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      aria-label="Decrease quantity"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="w-3 h-3 text-gray-600 dark:text-gray-300 animate-spin" />
                                      ) : (
                                        <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                      )}
                                    </button>
                                    
                                    <span className={`min-w-[1.5rem] text-center text-sm font-medium text-gray-900 dark:text-white ${
                                      isUpdating ? 'opacity-50' : ''
                                    }`}>
                                      {item.quantity}
                                    </span>
                                    
                                    <button
                                      onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                      disabled={item.quantity >= item.maxStock || isUpdating || isRemoving}
                                      className="p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                      aria-label="Increase quantity"
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="w-3 h-3 text-gray-600 dark:text-gray-300 animate-spin" />
                                      ) : (
                                        <Plus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
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
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
                        {/* Totals */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${totals.subtotal.toFixed(2)}
                            </span>
                          </div>
                          {totals.discount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                -${totals.discount.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ${totals.tax.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-900 dark:text-white">Total:</span>
                            <span className="text-gray-900 dark:text-white">
                              ${totals.total.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                          onClick={handleCheckout}
                          className="w-full px-4 py-2.5 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 rounded-lg transition-colors font-medium text-sm"
                        >
                          Checkout
                        </button>

                        {/* View Cart Link */}
                        <Link
                          href={`/${locale}/cart`}
                          className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View full cart
                        </Link>
                      </div>
                    </>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Overlay */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="h-screen md:hidden fixed inset-0 z-50 backdrop-blur-md bg-background dark:bg-background-dark transition-all duration-100 flex flex-col animate-bounchInDown"
          style={{
            transform: swipeDistance > 0 ? `translateX(${swipeDistance}px)` : 'translateX(0)',
            transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none',
          }}
          onTouchStart={(e) => handleTouchStart(e, 'menu')}
          onTouchMove={(e) => handleTouchMove(e, 'menu')}
          onTouchEnd={() => handleTouchEnd('menu')}
        >
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between pb-2 mx-2 border-b border-border dark:border-border-dark pt-6 flex-shrink-0">
          <button
              onClick={() => setIsMenuOpen(false)}
              className="h-14 p-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              aria-label="Close menu"
            >
              <Icon name="X" className="w-10 h-10" />
            </button>
            <div className="flex flex-wrap items-center gap-2 top-0 ">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setIsSearchOpen(true);
              }}
              className="p-2 flex flex-col items-center gap-3 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              aria-label="Open Search"
            >
              <Icon name="search" className="w-5 h-5 md:w-6 md:h-6" />
              <span>{tCommon('search') || 'Search'}</span>
            </button>
           
                              {/* Login Button */}
            {!session && (
              <Link
                href={`/${locale}/login`}
                className="p-2 flex flex-col items-center gap-3 text-xs text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon name="account" className="w-5 h-5 md:w-6 md:h-6" />
                <span>{tCommon('login') || 'Login'}</span>
              </Link>
            )}

            {/* User Profile Link */}
            {session && (
              <Link
                href={`/${locale}/account`}
                className="p-2 flex flex-col items-center gap-3 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon name="account" className="w-5 h-5 md:w-6 md:h-6" />
                <span>{tCommon('profile') || 'Profile'}</span>

              </Link>
            )}

            

            {/* Theme Toggle Button */}
            <button
              onClick={handleThemeToggle}
              className="p-2 flex flex-col items-center gap-3 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              aria-label={theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
            >
              {theme === 'dark' ? (
                <Icon name="sun" className={`w-5 h-5 md:w-6 md:h-6 ${shouldAnimate ? 'animate-pop' : ''}`} />
              ) : (
                <Icon name="moon" className={`w-5 h-5 md:w-6 md:h-6 ${shouldAnimate ? 'animate-pop' : ''}`} />
              )}
              <span>{theme === 'dark' ? tCommon('light_mode') || 'Light Mode' : tCommon('dark_mode') || 'Dark Mode'}</span>
            </button>

            {/* Language Switcher Button */}
            <button
              onClick={handleLanguageToggle}
              className="p-2 flex flex-col items-center gap-3 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              aria-label={tCommon('toggle_language') || 'Toggle language'}
            >
              {locale === 'en' ? (
                <Icon name="israelFlag" className="w-5 h-5 md:w-6 md:h-6" />
              ) : (
                <Icon name="usaFlag" className="w-5 h-5 md:w-6 md:h-6" />
              )}
              <span>{locale === 'en' ? 'עברית' : 'English'}</span>
            </button>


{/* Admin Link */}
            {isAdmin && (
              <Link
                href={`/${locale}/admin`}
                className="p-2 flex flex-col text-xs items-center gap-3 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors duration-200"
              >
                <Icon name="adminBold" className="w-5 h-5 md:w-6 md:h-6" />
                <span>{tCommon('admin') || 'Admin'}</span>

              </Link>
            )}

            {/* Logout Button */}
            {session && (
              <button
                onClick={async () => {
                  setIsLoggingOut(true);
                  try {
                    await signOut();
                  } catch (error) {
                    console.error('Failed to sign out:', error);
                  }
                }}
                disabled={isLoggingOut}
                className={`flex flex-col items-center justify-between gap-3 px-3 py-2 text-xs text-error/70 dark:text-error-dark/70 hover:text-error dark:hover:text-error-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoggingOut ? (
                  <LoadingSpinner size={28} variant="error" />
                ) : (
                  <>
                    <Icon name="logout" className="w-5 h-5 md:w-6 md:h-6" />
                    <span>{tCommon('logout') || 'Logout'}</span>
                  </>
                )}
              </button>
            )}
                  </div>
         
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto pt-4 min-h-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== `/${locale}` && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 px-6 py-3 text-3xl ${
                    isActive
                      ? 'bg-brand-main/20 dark:bg-brand-main/5 text-header-text-dark dark:text-brand-main ltr:border-l-4 rtl:border-r-4 border-brand-main'
                      : 'text-black/80 dark:text-white/90'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-white/10 text-white text-m px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          ref={searchRef}
          className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 safe-area-inset-top safe-area-inset-bottom"
          style={{
            transform: swipeDistance > 0 ? `translateY(${swipeDistance}px)` : 'translateY(0)',
            transition: swipeDistance === 0 ? 'transform 0.3s ease-out' : 'none',
          }}
          onTouchStart={(e) => handleTouchStart(e, 'search')}
          onTouchMove={(e) => handleTouchMove(e, 'search')}
          onTouchEnd={() => handleTouchEnd('search')}
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-2 border-b border-border dark:border-border-dark pt-6">
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Close search"
            >
              <Icon name="X" className="w-6 h-6" />
            </button>
            <div className="flex-1">
              <SearchInput
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search products, events, parks..."
                className="w-full sm:max-w-none"
              />
            </div>
          </div>

          {/* Recent Searches */}
          {searchQuery.trim() === '' && recentSearches.length > 0 && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Recent Searches
                </h3>
                <button
                  onClick={() => {
                    setRecentSearches([]);
                    localStorage.removeItem('recentSearches');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(search);
                      handleSearch(search);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-gray-900 dark:text-white">{search}</span>
                    <Icon name="search" className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleSearch('skateboarding')}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon name="shop" className="w-5 h-5 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Skateboarding
                </span>
              </button>
              <button
                onClick={() => handleSearch('BMX')}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon name="trees" className="w-5 h-5 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  BMX
                </span>
              </button>
              <button
                onClick={() => handleSearch('events')}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon name="calendar" className="w-5 h-5 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Events
                </span>
              </button>
              <button
                onClick={() => handleSearch('skateparks')}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Icon name="trees" className="w-5 h-5 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Skateparks
                </span>
              </button>
            </div>
          </div>

          {/* Search Results Placeholder */}
          {searchQuery.trim() !== '' && (
            <div className="flex-1 overflow-y-auto p-4">
              <Button
                onClick={() => handleSearch(searchQuery)}
                className="w-full"
                variant="primary"
              >
                Search for &quot;{searchQuery}&quot;
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
