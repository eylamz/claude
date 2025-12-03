// nextjs-app/app/[locale]/(public)/search/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard, SkateparkCard, TrainerCard, GuideCard } from '@/components/shop';
import { Button, Card, CardContent, Input, Drawer, Slider, Skeleton } from '@/components/ui';
import { 
  Search as SearchIcon, 
  X,
  Filter,
  TrendingUp,
  Grid3x3,
  List,
  Calendar,
  MapPin,
  ShoppingBag,
  Users,
  BookOpen,
  Sparkles,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type CategoryTab = 'all' | 'products' | 'skateparks' | 'events' | 'guides' | 'trainers';

interface SearchResultBase {
  id: string;
  type: CategoryTab;
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

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('search');
  const isHebrew = locale === 'he';

  // Query and UI state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<CategoryTab>((searchParams.get('tab') as CategoryTab) || 'all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [filterTypes, setFilterTypes] = useState<CategoryTab[]>(
    (searchParams.get('types')?.split(',').filter(Boolean) as CategoryTab[]) || []
  );
  const [eventDateRange, setEventDateRange] = useState<{ start: string; end: string }>(
    { start: searchParams.get('startDate') || '', end: searchParams.get('endDate') || '' }
  );
  const [productPriceRange, setProductPriceRange] = useState<[number, number]>([0, 1000]);

  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Scroll state
  const [isScrolled, setIsScrolled] = useState(false);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (activeTab && activeTab !== 'all') params.set('tab', activeTab);
    if (page > 1) params.set('page', String(page));
    if (filterTypes.length > 0) params.set('types', filterTypes.join(','));
    if (eventDateRange.start) params.set('startDate', eventDateRange.start);
    if (eventDateRange.end) params.set('endDate', eventDateRange.end);
    params.set('locale', String(locale));
    router.replace(`/${locale}/search?${params.toString()}`);
  }, [query, activeTab, page, filterTypes, eventDateRange, locale, router]);

  // Fetch results
  useEffect(() => {
    if (!query) {
      setResults([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const run = async () => {
      try {
        const params = new URLSearchParams();
        params.set('q', query);
        if (activeTab !== 'all') params.set('category', activeTab);
        if (filterTypes.length > 0) params.set('types', filterTypes.join(','));
        if (eventDateRange.start) params.set('startDate', eventDateRange.start);
        if (eventDateRange.end) params.set('endDate', eventDateRange.end);
        params.set('minPrice', String(productPriceRange[0]));
        params.set('maxPrice', String(productPriceRange[1]));
        params.set('page', String(page));
        params.set('locale', String(locale));
        const res = await fetch(`/api/search?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch (e) {
        if ((e as any).name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [query, activeTab, filterTypes, eventDateRange, productPriceRange, page, locale]);

  // Debounced input handler
  const handleQueryChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const next = e.target.value;
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
  };

  const handleClearSearch = () => {
    setQuery('');
    setPage(1);
    inputRef.current?.focus();
  };

  const tabs: { key: CategoryTab; label: string; icon: any; color: string }[] = useMemo(
    () => [
      { key: 'all', label: t('tabs.all') || 'All', icon: Sparkles, color: 'purple' },
      { key: 'products', label: t('tabs.products') || 'Products', icon: ShoppingBag, color: 'green' },
      { key: 'skateparks', label: t('tabs.skateparks') || 'Parks', icon: MapPin, color: 'blue' },
      { key: 'events', label: t('tabs.events') || 'Events', icon: Calendar, color: 'orange' },
      { key: 'guides', label: t('tabs.guides') || 'Guides', icon: BookOpen, color: 'teal' },
      { key: 'trainers', label: t('tabs.trainers') || 'Trainers', icon: Users, color: 'pink' },
    ],
    [t]
  );

  const toggleType = (type: CategoryTab) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilterTypes([]);
    setEventDateRange({ start: '', end: '' });
    setProductPriceRange([0, 1000]);
    setPage(1);
  };

  const hasActiveFilters = 
    filterTypes.length > 0 || 
    eventDateRange.start || 
    eventDateRange.end ||
    (productPriceRange[0] !== 0 || productPriceRange[1] !== 1000);

  // Get color classes for tab
  const getTabColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      purple: { 
        bg: 'bg-purple-500 dark:bg-purple-600', 
        text: 'text-purple-600 dark:text-purple-400', 
        border: 'border-purple-500 dark:border-purple-600' 
      },
      green: { 
        bg: 'bg-green-500 dark:bg-green-600', 
        text: 'text-green-600 dark:text-green-400', 
        border: 'border-green-500 dark:border-green-600' 
      },
      blue: { 
        bg: 'bg-blue-500 dark:bg-blue-600', 
        text: 'text-blue-600 dark:text-blue-400', 
        border: 'border-blue-500 dark:border-blue-600' 
      },
      orange: { 
        bg: 'bg-orange-500 dark:bg-orange-600', 
        text: 'text-orange-600 dark:text-orange-400', 
        border: 'border-orange-500 dark:border-orange-600' 
      },
      teal: { 
        bg: 'bg-brand-main dark:bg-brand-main', 
        text: 'text-brand-main', 
        border: 'border-brand-main' 
      },
      pink: { 
        bg: 'bg-pink-500 dark:bg-pink-600', 
        text: 'text-pink-600 dark:text-pink-400', 
        border: 'border-pink-500 dark:border-pink-600' 
      },
    };
    return colors[color] || colors.purple;
  };

  const renderCard = (item: SearchResult) => {
    switch (item.type) {
      case 'products': {
        const p = item as ProductResult;
        return (
          <ProductCard
            key={p.id}
            product={{
              id: p.id,
              slug: p.slug,
              name: p.name as any,
              price: p.price,
              discountPrice: p.discountPrice,
              images: p.images,
              variants: p.variants,
              totalStock: p.totalStock,
            }}
            view={viewMode}
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
                  <a 
                    href={`/${locale}/events/${ev.slug}`} 
                    className="font-semibold text-gray-900 dark:text-white hover:text-brand-main dark:hover:text-brand-main transition-colors line-clamp-2"
                  >
                    {ev.title}
                  </a>
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
  };

  const sidebarContent = (
    <div className="space-y-6">
      {/* Filter Types */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
          {t('filters.types') || 'Content Type'}
        </h3>
        <div className="space-y-2">
          {(['products','skateparks','events','guides','trainers'] as CategoryTab[]).map((ct) => {
            const tab = tabs.find(t => t.key === ct);
            const IconComponent = tab?.icon || Sparkles;
            return (
              <label
                key={ct}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                  filterTypes.includes(ct)
                    ? 'bg-brand-main/10 dark:bg-brand-main/20 border-2 border-brand-main'
                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                )}
              >
                <input
                  type="checkbox"
                  checked={filterTypes.includes(ct)}
                  onChange={() => toggleType(ct)}
                  className="w-4 h-4 rounded border-gray-300 text-brand-main focus:ring-brand-main"
                />
                <IconComponent className={cn(
                  'w-4 h-4',
                  filterTypes.includes(ct) ? 'text-brand-main' : 'text-gray-600 dark:text-gray-400'
                )} />
                <span className={cn(
                  'text-sm font-medium',
                  filterTypes.includes(ct) 
                    ? 'text-brand-main' 
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {t(`tabs.${ct}` as any)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Events Date Range */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
          {t('filters.dateRange') || 'Date Range'}
        </h3>
        <div className="space-y-2">
          <Input
            type="date"
            value={eventDateRange.start}
            onChange={(e) => { setEventDateRange({ ...eventDateRange, start: e.target.value }); setPage(1); }}
            placeholder="Start date"
            className="w-full"
          />
          <Input
            type="date"
            value={eventDateRange.end}
            onChange={(e) => { setEventDateRange({ ...eventDateRange, end: e.target.value }); setPage(1); }}
            placeholder="End date"
            className="w-full"
          />
        </div>
      </div>

      {/* Products Price Range */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
          {t('filters.priceRange') || 'Price Range'}
        </h3>
        <Slider
          min={0}
          max={1000}
          values={productPriceRange}
          onChange={(vals) => { setProductPriceRange(vals as [number, number]); setPage(1); }}
          step={10}
        />
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mt-3">
          <span className="font-medium">₪{productPriceRange[0]}</span>
          <span className="font-medium">₪{productPriceRange[1]}</span>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button onClick={handleClearFilters} variant="outline" className="w-full">
          <X className="w-4 h-4 mr-2" />
          {isHebrew ? 'נקה פילטרים' : 'Clear Filters'}
        </Button>
      )}
    </div>
  );

  const tr = (en: string, he: string) => (isHebrew ? he : en);

  return (
    <div 
      className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      
      {/* ========================================
          HERO SECTION - Search Bar
      ======================================== */}
      <div className="relative bg-gradient-to-br from-purple-500/10 via-transparent to-brand-main/10 dark:from-purple-500/5 dark:to-brand-main/5 border-b border-gray-200 dark:border-gray-800">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-12 lg:py-16">
          <div className="text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {tr('Powered by Smart Search', 'מופעל על ידי חיפוש חכם')}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Find Anything', 'מצא כל דבר')}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Search parks, products, events, guides, and trainers all in one place',
                'חפש פארקים, מוצרים, אירועים, מדריכים ומאמנים במקום אחד'
              )}
            </p>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <SearchIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder={tr('Search for anything...', 'חפש כל דבר...')}
                  className="w-full pl-12 pr-20 py-4 text-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-brand-main dark:focus:border-brand-main focus:ring-4 focus:ring-brand-main/20 dark:focus:ring-brand-main/30 outline-none transition-all shadow-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {query && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Popular Searches */}
              {!query && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tr('Popular:', 'פופולרי:')}
                  </span>
                  {['skateboard', 't-shirt', 'bmx', 'helmet'].map((term) => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1 text-sm bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          CATEGORY TABS
      ======================================== */}
      {query && (
        <div className={cn(
          'sticky top-16 md:top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-all duration-300',
          isScrolled ? 'shadow-md py-3' : 'py-4'
        )}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between gap-4">
              
              {/* Tabs */}
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 min-w-max">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const colorClasses = getTabColorClasses(tab.color);
                    const IconComponent = tab.icon;
                    
                    return (
                      <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setPage(1); }}
                        className={cn(
                          'inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm transition-all',
                          isActive
                            ? `${colorClasses.bg} text-white shadow-lg`
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <Button
                  onClick={() => setIsDrawerOpen(true)}
                  variant="outline"
                  size="xl"
                  className="md:hidden rounded-full"
                >
                  <Filter className="w-5 h-5" />
                  {filterTypes.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-brand-main text-white text-xs font-bold rounded-full">
                      {filterTypes.length}
                    </span>
                  )}
                </Button>

                {/* View Toggle (Desktop) */}
                <div className="hidden md:flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-2 rounded-full transition-colors',
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            {!loading && query && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {total > 0 ? (
                  <span>
                    {tr('Found', 'נמצאו')} <strong className="text-gray-900 dark:text-white">{total}</strong> {tr('results', 'תוצאות')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================
          MAIN CONTENT
      ======================================== */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {query ? (
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 shrink-0">
              <div className="sticky top-32">
                {sidebarContent}
              </div>
            </aside>

            {/* Mobile Drawer */}
            <Drawer 
              isOpen={isDrawerOpen} 
              onClose={() => setIsDrawerOpen(false)} 
              title={tr('Filters', 'פילטרים')}
            >
              {sidebarContent}
            </Drawer>

            {/* Results */}
            <main className="flex-1">
              {loading ? (
                <div className={cn(
                  'grid gap-6',
                  viewMode === 'grid'
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
                    : 'grid-cols-1'
                )}>
                  {[...Array(9)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl" />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <>
                  <div className={cn(
                    'grid gap-6',
                    viewMode === 'grid'
                      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'
                      : 'grid-cols-1'
                  )}>
                    {results.map((item) => renderCard(item))}
                  </div>
                  
                  {/* Load More */}
                  <div className="mt-8 flex justify-center">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => setPage((p) => p + 1)} 
                      disabled={results.length === 0}
                    >
                      {tr('Load More', 'טען עוד')}
                    </Button>
                  </div>
                </>
              ) : (
                /* Empty State */
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/10 to-brand-main/10 dark:from-purple-500/20 dark:to-brand-main/20 mb-6">
                    <SearchIcon className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {tr('No Results Found', 'לא נמצאו תוצאות')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {tr(
                      'Try adjusting your search or filters to find what you\'re looking for',
                      'נסה לשנות את החיפוש או הפילטרים כדי למצוא את מה שאתה מחפש'
                    )}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="brand" onClick={handleClearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      {tr('Clear All Filters', 'נקה את כל הפילטרים')}
                    </Button>
                  )}
                </div>
              )}
            </main>
          </div>
        ) : (
          /* Initial State - Before Search */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {tr('Start Your Search', 'התחל לחפש')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {tr('Explore our collection of parks, products, events, and more', 'גלה את האוסף שלנו של פארקים, מוצרים, אירועים ועוד')}
              </p>
            </div>

            {/* Category Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.slice(1).map((tab) => {
                const IconComponent = tab.icon;
                const colorClasses = getTabColorClasses(tab.color);
                
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="p-6 text-center bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-brand-main dark:hover:border-brand-main hover:shadow-xl transition-all group"
                  >
                    <div className={cn(
                      'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors',
                      `bg-${tab.color}-500/10 dark:bg-${tab.color}-500/20 group-hover:bg-${tab.color}-500 dark:group-hover:bg-${tab.color}-600`
                    )}>
                      <IconComponent className={cn(
                        'w-8 h-8 transition-colors',
                        colorClasses.text,
                        'group-hover:text-white'
                      )} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {tab.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tr('Browse all', 'עיין בכל')} {tab.label.toLowerCase()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
