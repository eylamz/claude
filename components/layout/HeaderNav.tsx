'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  Settings,
  User,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { Icon } from '@/components/icons/Icon';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTheme } from '@/context/ThemeProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  useCartStore, 
  useCartItemCount, 
  useCartItems, 
  useCartTotals,
  type CartItem 
} from '@/stores/cartStore';
import { Input } from '@/components/ui';

interface NavItem {
  href: string;
  label: string;
}

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const tCommon = useTranslations('common');
  const tShop = useTranslations('shop');
  const tEvents = useTranslations('events');
  const tAdmin = useTranslations('admin');
  const { theme } = useTheme();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const itemCount = useCartItemCount();
  const items = useCartItems();
  const totals = useCartTotals();
  const { updateQuantity, removeItem } = useCartStore();
  
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

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

  // Handle logout - works like next-auth's internal signOut
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Use callbackUrl like next-auth's signOut does (defaults to window.location.href if not provided)
      const callbackUrl = `/${locale}/login`;
      
      // Call signOut with redirect enabled (default behavior, like next-auth)
      await signOut({ 
        callbackUrl,
        redirect: true 
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
      setIsLoggingOut(false);
      // Fallback: redirect manually if signOut fails (similar to next-auth's behavior)
      const fallbackUrl = `/${locale}/login`;
      window.location.href = fallbackUrl;
      // If URL contains a hash, reload manually (like next-auth does)
      if (fallbackUrl.includes('#')) {
        window.location.reload();
      }
    }
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

  // Navigation items
  const navItems: NavItem[] = [
    { href: `/${locale}/trainers`, label: tAdmin('trainers') },
    { href: `/${locale}/skateparks`, label: tAdmin('skateparks') },
    { href: `/${locale}/events`, label: tEvents('title') },
    { href: `/${locale}/guides`, label: tAdmin('guides') },
    { href: `/${locale}/shop`, label: tShop('title') },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  const isAdmin = session?.user?.role === 'admin';

  return (
    <>
      {/* Desktop Header Navigation */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-[50] px-3 select-none transition-all duration-200 ease text-white backdrop-blur-sm shadow-lg bg-[linear-gradient(to_right,transparent_0%,#ffffffd4_10%,#ffffff_50%,#ffffffd4_90%,transparent_100%)] dark:bg-[linear-gradient(to_right,transparent_0%,#101317b3_10%,#101317_50%,#101317b3_90%,transparent_100%)]">
        <div className="mx-auto  border-b border-border/50 dark:border-border-dark w-full max-w-7xl px-2 overflow-visible text-header-text-dark dark:text-header-text">
          <div className=" flex items-center justify-between h-14">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <Icon name="logo" className="text-brand-main w-[124px] h-[39px] sm:w-[128px] sm:h-[24px]" />
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2 py-2 rounded-lg transition-all duration-200 font-medium ${
                      active
                        ? 'underline-offset-4 decoration-[1px] underline scale-105 text-black dark:text-white'
                        : 'text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-1">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 h-9 text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white transition-all duration-200"
                aria-label="Open search"
              >
                <Icon name="search" className="w-5 h-5" />
              </button>

              {/* Cart Menu */}
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="relative h-9 p-2 text-black/80 hover:text-black dark:text-white/80 hover:scale-105 dark:hover:text-white transition-all duration-200"
                      aria-label={`Shopping cart with ${itemCount} items`}
                    >
                      <Icon name="cart" className="w-5 h-5" />
                      {itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {itemCount > 9 ? '9+' : itemCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0 !right-0 !left-auto max-h-[600px] overflow-y-auto">
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
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
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

              {/* Settings Menu */}
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="h-9 p-2 text-black/80 dark:text-white/70 hover:scale-105 hover:rotate-[270deg] hover:text-black dark:hover:text-white transition-all duration-200"
                      aria-label="Settings"
                    >
                      <Icon name="settings" className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-56 p-2 ${locale === 'he' ? '!left-0 !right-auto' : '!right-0 !left-auto'}`}>
                  <div className={locale === 'he' ? 'flex flex-col-reverse gap-1' : 'space-y-1'}>
                    {/* Theme Toggle */}
                    <div className="px-2 py-1.5">
                      <ThemeToggle className={`w-full ${locale === 'he' ? 'justify-end' : 'justify-start'}`} />
                    </div>

                    {/* Language Switcher */}
                    <div className="px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
                      <div className="w-full">
                        <LanguageSwitcher className={`w-full ${locale === 'he' ? 'justify-end' : 'justify-start'}`} />
                      </div>
                    </div>

                    {/* Login Button */}
                    {!session && (
                      <Link
                        href={`/${locale}/login`}
                        className={`flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${locale === 'he' ? 'flex-row-reverse' : ''}`}
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{tCommon('login') || 'Login'}</span>
                      </Link>
                    )}

                    {/* User Profile Link */}
                    {session && (
                      <Link
                        href={`/${locale}/account`}
                        className={`flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${locale === 'he' ? 'flex-row-reverse' : ''}`}
                      >
                        <User className="w-4 h-4" />
                        <span>{tCommon('profile')}</span>
                      </Link>
                    )}

                    {/* Admin Link */}
                    {isAdmin && (
                      <Link
                        href={`/${locale}/admin`}
                        className={`flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${locale === 'he' ? 'flex-row-reverse' : ''}`}
                      >
                        <Shield className="w-4 h-4" />
                        <span>Admin</span>
                      </Link>
                    )}

                    {/* Logout Button */}
                    {session && (
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${locale === 'he' ? 'flex-row-reverse' : ''}`}
                      >
                        {isLoggingOut ? (
                          <LoadingSpinner size={16} variant="error" />
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            <span>{tCommon('logout') || 'Logout'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-start justify-center pt-20 md:pt-32"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          }}
        >
          <div className="w-full max-w-2xl mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Close search"
              >
                <Icon name="search" className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(searchQuery);
                    }
                  }}
                  placeholder="Search products, events, parks..."
                  className="w-full"
                  autoFocus
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
                      onClick={() => handleSearch(search)}
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
            {searchQuery.trim() === '' && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSearch('skateboarding')}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Skateboarding
                    </span>
                  </button>
                  <button
                    onClick={() => handleSearch('BMX')}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      BMX
                    </span>
                  </button>
                  <button
                    onClick={() => handleSearch('events')}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Events
                    </span>
                  </button>
                  <button
                    onClick={() => handleSearch('skateparks')}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Skateparks
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Search Results Placeholder */}
            {searchQuery.trim() !== '' && (
              <div className="p-4">
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                  Search for &quot;{searchQuery}&quot;
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
