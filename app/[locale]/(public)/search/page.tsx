'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard, SkateparkCard, TrainerCard, GuideCard } from '@/components/shop';
import { Button, Card, CardContent, Input, Select, Drawer, Checkbox, Slider, Skeleton } from '@/components/ui';

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

  // Query and UI state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<CategoryTab>((searchParams.get('tab') as CategoryTab) || 'all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));

  // Filters
  const [filterTypes, setFilterTypes] = useState<CategoryTab[]>(
    (searchParams.get('types')?.split(',').filter(Boolean) as CategoryTab[]) || []
  );
  const [eventDateRange, setEventDateRange] = useState<{ start: string; end: string }>(
    { start: searchParams.get('startDate') || '', end: searchParams.get('endDate') || '' }
  );
  const [productPriceRange, setProductPriceRange] = useState<[number, number]>([0, 1000]);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const tabs: { key: CategoryTab; label: string }[] = useMemo(
    () => [
      { key: 'all', label: t('tabs.all') },
      { key: 'products', label: t('tabs.products') },
      { key: 'skateparks', label: t('tabs.skateparks') },
      { key: 'events', label: t('tabs.events') },
      { key: 'guides', label: t('tabs.guides') },
      { key: 'trainers', label: t('tabs.trainers') },
    ],
    [t]
  );

  const toggleType = (type: CategoryTab) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
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
          />
        );
      }
      case 'skateparks': {
        const s = item as SkateparkResult;
        return (
          <SkateparkCard
            key={s.id}
            park={{
              id: s.id,
              slug: s.slug,
              name: typeof s.name === 'string' ? { en: s.name, he: s.name } : s.name,
              imageUrl: s.imageUrl,
              area: s.area,
              rating: s.rating || 0,
              totalReviews: 0,
            } as any}
            locale={String(locale)}
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
          <Card key={ev.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <a href={`/${locale}/events/${ev.slug}`} className="font-semibold hover:underline">
                  {ev.title}
                </a>
                <span className="text-sm text-gray-500">{new Date(ev.startDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen ">
      {/* Header with search */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder={t('placeholder')}
              className="flex-1"
            />
            <Button onClick={() => setPage(1)} disabled={!query}>
              {t('search')}
            </Button>
          </div>

          {/* Tabs and count */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('results')}: {total}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('filters.types')}</h3>
                <div className="space-y-2">
                  {(['products','skateparks','events','guides','trainers'] as CategoryTab[]).map((ct) => (
                    <Checkbox
                      key={ct}
                      id={`type-${ct}`}
                      checked={filterTypes.includes(ct)}
                      onChange={() => toggleType(ct)}
                      label={t(`tabs.${ct}` as any)}
                    />
                  ))}
                </div>
              </div>

              {/* Events date range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('filters.dateRange')}</h3>
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={eventDateRange.start}
                    onChange={(e) => { setEventDateRange({ ...eventDateRange, start: e.target.value }); setPage(1); }}
                  />
                  <Input
                    type="date"
                    value={eventDateRange.end}
                    onChange={(e) => { setEventDateRange({ ...eventDateRange, end: e.target.value }); setPage(1); }}
                  />
                </div>
              </div>

              {/* Products price range */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('filters.priceRange')}</h3>
                <Slider
                  min={0}
                  max={1000}
                  values={productPriceRange}
                  onChange={(vals) => { setProductPriceRange(vals as [number, number]); setPage(1); }}
                  step={10}
                />
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <span>₪{productPriceRange[0]}</span>
                  <span>₪{productPriceRange[1]}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((item) => renderCard(item))}
                </div>
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={results.length === 0}>
                    {t('loadMore')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-700 dark:text-gray-300 text-lg mb-2">{t('noResults.title')}</p>
                <p className="text-gray-500 dark:text-gray-400">{t('noResults.suggestion')}</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}



