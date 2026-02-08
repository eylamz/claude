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
  ChevronRight,
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
  Clock,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { Icon } from '@/components/icons/Icon';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';
import { hasConsent } from '@/lib/utils/cookie-consent';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { 
  useCartStore, 
  useCartItemCount, 
  useCartItems, 
  useCartTotals,
  type CartItem 
} from '@/stores/cartStore';
import { Input, Card, CardContent, Skeleton } from '@/components/ui';
import { ProductCard, SkateparkCard, TrainerCard, GuideCard } from '@/components/shop';
import { isEcommerceEnabled, isTrainersEnabled, isLoginEnabled, isGrowthLabEnabled, isCommunityEnabled } from '@/lib/utils/ecommerce';
import { cn } from '@/lib/utils/cn';
import { searchFromCache, type SearchResultFromCache } from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';

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
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchFilterTab, setSearchFilterTab] = useState<SearchResultType | 'all'>('all');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
  const [scrollY, setScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

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

  // Set query from recent/quick action (results show in popup)
  const handleSearchQuery = useCallback((query: string) => {
    if (!query.trim()) return;
    saveSearch(query);
    setSearchQuery(query);
  }, [saveSearch]);

  // Filter tabs for popup (respect .env: products only if ecommerce, trainers only if trainers)
  const searchFilterTabs = useMemo(() => {
    const tabs: { key: SearchResultType | 'all'; label: string; icon: typeof MapPin }[] = [
      { key: 'all', label: tSearch('tabs.all') || 'All', icon: Sparkles },
      { key: 'skateparks', label: tSearch('tabs.skateparks') || 'Parks', icon: MapPin },
      { key: 'events', label: tSearch('tabs.events') || 'Events', icon: Calendar },
      { key: 'guides', label: tSearch('tabs.guides') || 'Guides', icon: BookOpen },
    ];
    if (ecommerceEnabled) {
      tabs.splice(1, 0, { key: 'products', label: tSearch('tabs.products') || 'Products', icon: ShoppingBag });
    }
    if (trainersEnabled) {
      tabs.push({ key: 'trainers', label: tSearch('tabs.trainers') || 'Trainers', icon: Users });
    }
    return tabs;
  }, [ecommerceEnabled, trainersEnabled, tSearch]);

  // Cache-backed categories: search localStorage first; if missing, fetch and cache then search
  const cacheCategories = useMemo((): ('skateparks' | 'events' | 'guides')[] => {
    if (searchFilterTab === 'all') return ['skateparks', 'events', 'guides'];
    if (searchFilterTab === 'skateparks' || searchFilterTab === 'events' || searchFilterTab === 'guides') {
      return [searchFilterTab];
    }
    return [];
  }, [searchFilterTab]);

  // API-only categories (no localStorage cache in app)
  const apiCategories = useMemo((): ('products' | 'trainers')[] => {
    if (searchFilterTab === 'all') {
      const list: ('products' | 'trainers')[] = [];
      if (ecommerceEnabled) list.push('products');
      if (trainersEnabled) list.push('trainers');
      return list;
    }
    if (searchFilterTab === 'products' && ecommerceEnabled) return ['products'];
    if (searchFilterTab === 'trainers' && trainersEnabled) return ['trainers'];
    return [];
  }, [searchFilterTab, ecommerceEnabled, trainersEnabled]);

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

  // Fetch search results: cache-first for skateparks/events/guides, then API for products/trainers
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const controller = new AbortController();
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results: SearchResult[] = [];

        // 1) Search localStorage caches (skateparks_cache, events_cache, guides_cache); fill cache if missing
        if (cacheCategories.length > 0) {
          const cacheResults = await searchFromCache(searchQuery, locale, cacheCategories);
          results.push(...cacheResults.map(mapCacheResultToSearchResult));
        }

        // 2) Fetch from API for products/trainers (no app cache for these)
        if (apiCategories.length > 0) {
          const params = new URLSearchParams();
          params.set('q', searchQuery);
          params.set('locale', locale);
          params.set('types', apiCategories.join(','));
          const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
          if (res.ok) {
            const data = await res.json();
            const apiResults = (data.results || []) as SearchResult[];
            results.push(...apiResults);
          }
        }

        if (!ecommerceEnabled) {
          const filtered = results.filter((r) => r.type !== 'products');
          setSearchResults(filtered);
        } else {
          setSearchResults(results);
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      controller.abort();
    };
  }, [searchQuery, searchFilterTab, locale, ecommerceEnabled, cacheCategories, apiCategories, mapCacheResultToSearchResult]);

  // Render a single search result card (matches search page)
  const renderSearchCard = useCallback((item: SearchResult) => {
    switch (item.type) {
      case 'products': {
        const p = item as ProductResult;
        return (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              slug: p.slug,
              name: p.name as { en: string; he: string },
              price: p.price,
              discountPrice: p.discountPrice,
              images: p.images,
              variants: p.variants,
              totalStock: p.totalStock,
            }}
            view="grid"
            highlightQuery={searchQuery}
          />
        );
      }
      case 'skateparks': {
        const s = item as SkateparkResult;
        const nameStr = typeof s.name === 'string' ? s.name : (s.name[locale as 'en' | 'he'] || s.name.en || s.name.he);
        return (
          <SkateparkCard
            key={s.id}
            slug={s.slug}
            name={nameStr}
            image={s.imageUrl}
            area={s.area}
            highlightQuery={searchQuery}
          />
        );
      }
      case 'guides': {
        const g = item as GuideResult;
        return (
          <GuideCard
            key={g.id}
            slug={g.slug}
            title={g.title}
            description={g.description}
            image={g.coverImage}
            rating={g.rating}
            ratingCount={g.ratingCount}
            readTime={g.readTime}
            sports={g.relatedSports}
            highlightQuery={searchQuery}
          />
        );
      }
      case 'trainers': {
        const tr = item as TrainerResult;
        return (
          <TrainerCard
            key={tr.id}
            slug={tr.slug}
            name={tr.name}
            image={tr.profileImage}
            area={tr.area}
            sports={tr.relatedSports}
            rating={tr.rating}
            reviewCount={tr.totalReviews}
            highlightQuery={searchQuery}
          />
        );
      }
      case 'events': {
        const ev = item as EventResult;
        return (
          <Card key={ev.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/${locale}/events/${ev.slug}`}
                    onClick={() => setIsSearchOpen(false)}
                    className="font-semibold text-gray-900 dark:text-white hover:text-brand-main dark:hover:text-brand-main transition-colors line-clamp-2"
                  >
                    {highlightMatch(ev.title, searchQuery)}
                  </Link>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{new Date(ev.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }
      default:
        return null;
    }
  }, [locale, searchQuery]);

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

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

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
        <div className={`mx-auto  border-header-border dark:border-header-border-dark w-full max-w-6xl px-2 overflow-visible text-header-text-dark dark:text-header-text transition-colors duration-200`}>
          <div className="flex items-center justify-between h-16">
            {/* LEFT: Logo*/}
            <div className="flex items-center gap-4">
              <Link href={`/${locale}`} className="flex flex-col items-start gap-0.5">
                {/* Logo */}
                <Icon name="logo" className="text-brand-main dark:text-brand-dark w-[124px] h-[39px] sm:w-[128px] sm:h-[24px]" />

              </Link>
            </div>

            {/* CENTER: Main Navigation (Action-Oriented) */}
            <nav className="hidden md:flex items-center gap-1">
              {/* Skateparks */}
              <Link
                href={`/${locale}/skateparks`}
                className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/skateparks`) ? 'text-black dark:text-white' : ''
                }`}
              >
                {tAdmin('skateparks')}
              </Link>

              {/* Trainers */}
              {trainersEnabled && (
                <Link
                  href={`/${locale}/trainers`}
                  className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white relative ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/trainers`) ? 'text-black dark:text-white' : ''
                  }`}
                >
                  {tAdmin('trainers')}
                  {/* "Featured" badge for premium trainers */}
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  </span>
                </Link>
              )}

              {/* Events */}
              <Link
                href={`/${locale}/events`}
                className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/events`) ? 'text-black dark:text-white' : ''
                }`}
              >
                {tEvents('title')}
              </Link>

              {/* Guides */}
              <Link
                href={`/${locale}/guides`}
                className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/guides`) ? 'text-black dark:text-white' : ''
                }`}
              >
                {tAdmin('guides')}
              </Link>

              {/* Growth Lab */}
              {growthLabEnabled && (
                <Link
                  href={`/${locale}/growth-lab`}
                  className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/growth-lab`) ? 'text-black dark:text-white' : ''
                  }`}
                >
                  {locale === 'en' ? 'Growth Lab' : 'המרחב'}
                </Link>
              )}

              {/* Join Community (drive registration) */}
              {communityEnabled && (
                <Link
                  href={`/${locale}/community`}
                  className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/community`) ? 'text-black dark:text-white' : ''
                  }`}
                >
                  {tHomepage('community')}
                </Link>
              )}

              {/* About */}
              <Link
                href={`/${locale}/about`}
                className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                  isActive(`/${locale}/about`) ? 'text-black dark:text-white' : ''
                }`}
              >
                {tCommon('about')}
              </Link>

              {/* Shop */}
              {ecommerceEnabled && (
                <Link
                  href={`/${locale}/shop`}
                  className={`px-2 lg:px-3 py-2 rounded-lg transition-all duration-200  text-black/80 dark:text-white/70 hover:scale-105 hover:text-black dark:hover:text-white relative ${locale === 'he' ? 'font-semibold' : 'font-medium'} ${
                    isActive(`/${locale}/shop`) ? 'text-black dark:text-white' : ''
                  }`}
                >
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
                  <Icon name="searchBold" className="w-4 h-4" />
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
                      
                        <Icon name="backpackBold" className="w-5 h-5" />
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
                        
                        <Icon name="emptyBackpack" className="w-full h-auto  mx-auto mb-4 transition-colors duration-200" />
                        <p className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Your bag is empty</p>
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
                                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
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
                                      
                                      <span className={`min-w-[1.5rem] text-center text-sm font-medium text-gray-900 dark:text-white transition-colors duration-200 ${
                                        isUpdating ? 'opacity-50' : ''
                                      }`}>
                                        {item.quantity}
                                      </span>
                                      
                                      <button
                                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                        disabled={item.quantity >= item.maxStock || isUpdating || isRemoving}
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
                              <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Subtotal:</span>
                              <span className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                                ${totals.subtotal.toFixed(2)}
                              </span>
                            </div>
                            {totals.discount > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Discount:</span>
                                <span className="font-medium text-green-600 dark:text-green-400 transition-colors duration-200">
                                  -${totals.discount.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400 transition-colors duration-200">Tax:</span>
                              <span className="font-medium text-gray-900 dark:text-white transition-colors duration-200">
                                ${totals.tax.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
                              <span className="text-gray-900 dark:text-white transition-colors duration-200">Total:</span>
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
                        <Icon name="settingsBold" className="w-5 h-5 group-hover:rotate-[46deg] transition-transform duration-500" />
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-fit p-2 ${locale === 'he' ? '!left-0 !right-auto' : '!right-0 !left-auto'}`}>
                    <div className="space-y-2">
                      {/* Theme Toggle */}
                      <Button
                        variant="none"
                        size="sm"
                        onClick={() => {
                          if (!hasConsent('essential')) {
                            toast({
                              title: tCommon('cookieConsent.functionalConsentRequired'),
                              description: tCommon('cookieConsent.functionalConsentMessage'),
                              action: (
                                <Button
                                  size="sm"
                                  variant="blue"
                                  className="!px-4 w-fit"
                                  onClick={() => {
                                    if (typeof window !== 'undefined') {
                                      const event = new CustomEvent('showCookieSettings');
                                      window.dispatchEvent(event);
                                    }
                                  }}
                                >
                                  {tCommon('cookieConsent.openCookieSettings')}
                                </Button>
                              ),
                              variant: 'default',
                            });
                            return;
                          }
                          toggleTheme();
                        }}
                        className={`!px-6 group w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                        aria-label={theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}
                      >
                        {theme === 'dark' ? (
                          <Icon name="sunBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-yellow-500" />
                        ) : (
                          <Icon name="moonBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-blue" />
                        )}
                        <span className="text-text dark:text-text-dark/90">{theme === 'dark' ? tCommon('light_mode') : tCommon('dark_mode')}</span>
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
                          <Icon name="hebrewBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-brand-main" />
                        ) : (
                          <Icon name="englishBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:text-brand-main" />
                        )}
                        <span className="text-text dark:text-text-dark/90">{locale === 'en' ? 'עברית' : 'English'}</span>
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
                              <Icon name="accountBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200" />
                              <span className="text-text dark:text-text-dark/90">{tCommon('login') || 'Login'}</span>
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
                              <Icon name="accountBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200" />
                              <span className="text-text dark:text-text-dark/90">{tCommon('profile')}</span>
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
                                variant="none"
                                size="sm"
                                className={`group !px-6 w-full flex items-center justify-between font-medium hover:!bg-blue-bg dark:hover:!bg-blue-bg-dark  hover:!border-blue-border dark:hover:!border-blue-border-dark ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                              >
                                <div className={`flex items-center gap-2 ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <Icon name="adminBold" className="w-4 h-4 text-gray/75 dark:text-gray-dark/75 transition-all duration-200 group-hover:!text-blue dark:group-hover:!text-blue-dark" />
                                  <span className="flex-1 text-text dark:text-text-dark/90 group-hover:!text-blue dark:group-hover:!text-blue-dark">{tCommon('admin') || 'Admin'}</span>
                                </div>
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
                                    href: `/${locale}/admin/settings`,
                                    labelKey: 'settings',
                                    icon: SettingsIcon,
                                  },
                                ].map((item) => {
                                  const isActive = pathname === item.href || (item.href !== `/${locale}/admin` && pathname.startsWith(item.href));
                                  const IconComponent = item.icon;
                                  
                                  return (
                                    <Button
                                      key={item.href}
                                      variant={isActive ? "info" : "none"}
                                      size="sm"
                                      asChild
                                      className={`!px-4 w-full flex gap-2 font-medium justify-start ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                      <Link href={item.href}>
                                        <IconComponent className={`w-4 h-4 transition-all duration-200 ${isActive ? 'text-blue dark:text-blue-dark' : 'text-gray/75 dark:text-gray-dark/75'}`} />
                                        <span className={isActive ? '' : 'text-text dark:text-text-dark/90'}>{tMobileNav(item.labelKey)}</span>
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
                              <LoadingSpinner size={16} variant="error" className='animate-fadeIn'/>
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

      {/* Search Modal - gradient + results in popup (like search page) */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-start justify-center pt-20 md:pt-32 transition-colors duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsSearchOpen(false);
              setSearchQuery('');
              setSearchFilterTab('all');
            }
          }}
        >
          <div 
            className="w-full max-w-2xl mx-4 rounded-2xl shadow-xl overflow-hidden transition-colors duration-200 flex flex-col max-h-[85vh] bg-white dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gradient header + search bar (like search page hero) */}
            <div className="relative bg-gradient-to-br from-purple-500/10 via-transparent to-brand-main/10 dark:from-purple-500/5 dark:to-brand-main/5 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]" />
              <div className="relative flex items-center gap-3 p-4">
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setSearchFilterTab('all');
                  }}
                  className="flex-shrink-0 p-2 text-sidebar-text dark:text-sidebar-text-dark hover:text-black/80 dark:hover:text-white/80 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={tSearch('popup.placeholder')}
                    className="w-full pl-12 pr-12 py-3.5 text-base bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-brand-main dark:focus:border-brand-main focus:ring-4 focus:ring-brand-main/20 dark:focus:ring-brand-main/30 outline-none transition-all shadow-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter tabs (when user has typed) - respect env flags */}
            {searchQuery.trim() !== '' && (
              <div className="flex-shrink-0 px-4 pb-3 pt-1 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex flex-wrap gap-2">
                  {searchFilterTabs.map((tab) => {
                    const isActive = searchFilterTab === tab.key;
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSearchFilterTab(tab.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all',
                          isActive
                            ? 'bg-brand-main dark:bg-brand-main text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content: recent/quick when empty, results when query */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {searchQuery.trim() === '' ? (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {tSearch('popup.recentSearches')}
                        </h3>
                        <button
                          onClick={() => {
                            setRecentSearches([]);
                            localStorage.removeItem('recentSearches');
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {tSearch('popup.clear')}
                        </button>
                      </div>
                      <div className="space-y-2">
                        {recentSearches.map((search, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearchQuery(search)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <span className="text-gray-900 dark:text-white">{search}</span>
                            <SearchIcon className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      {tSearch('popup.quickSearch')}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['skateboarding', 'BMX', 'events', 'skateparks'].map((term) => (
                        <button
                          key={term}
                          onClick={() => handleSearchQuery(term)}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-brand-main/30 dark:hover:border-brand-main/30"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Loading */}
                  {searchLoading && (
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-2xl" />
                      ))}
                    </div>
                  )}

                  {/* Results */}
                  {!searchLoading && searchResults.length > 0 && (
                    <div className="p-4 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {searchResults.length} {tSearch('popup.results')}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {searchResults.slice(0, 12).map((item) => (
                          <div key={item.id} onClickCapture={() => setIsSearchOpen(false)}>
                            {renderSearchCard(item)}
                          </div>
                        ))}
                      </div>
                      <Link
                        href={`/${locale}/search?q=${encodeURIComponent(searchQuery)}${searchFilterTab !== 'all' ? `&tab=${searchFilterTab}` : ''}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="block w-full text-center py-3 text-sm font-medium text-brand-main dark:text-brand-main hover:underline"
                      >
                        {tSearch('popup.viewAllResults')}
                      </Link>
                    </div>
                  )}

                  {/* No results */}
                  {!searchLoading && searchQuery.trim() !== '' && searchResults.length === 0 && (
                    <div className="p-8 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/10 to-brand-main/10 dark:from-purple-500/20 dark:to-brand-main/20 mb-4">
                        <SearchIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {tSearch('popup.noResultsFound')}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {tSearch('popup.noResultsHint')}
                      </p>
                      <Link
                        href={`/${locale}/search`}
                        onClick={() => setIsSearchOpen(false)}
                        className="text-sm font-medium text-brand-main dark:text-brand-main hover:underline"
                      >
                        {tSearch('popup.goToFullSearch')}
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
