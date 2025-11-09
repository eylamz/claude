'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { GuideCard } from '@/components/shop';
import { Accordion, Checkbox, Slider, Drawer, Button, Select, Skeleton, Input } from '@/components/ui';
import type { GuideData, FiltersData } from '@/lib/api/guides';

interface Guide extends GuideData {}

interface GuidesPageProps {
  initialData?: {
    guides: Guide[];
    pagination: {
      currentPage: number;
      totalPages: number;
      total: number;
      limit: number;
    };
    filters: FiltersData;
  };
}

export default function GuidesPageClient({ initialData }: GuidesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('guides');
  
  const [guides, setGuides] = useState<Guide[]>(initialData?.guides || []);
  const [filtersData, setFiltersData] = useState<FiltersData>(
    initialData?.filters || { sports: [], difficulties: [] }
  );
  const [loading, setLoading] = useState(!initialData);
  const [totalResults, setTotalResults] = useState(initialData?.pagination?.total || 0);
  
  // Filters
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get('sports')?.split(',').filter(Boolean) || []
  );
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
  const [minRating, setMinRating] = useState(parseFloat(searchParams.get('minRating') || '0'));
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  
  // Sort
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(1);
  
  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch guides only when filters/pagination change (skip initial render if we have initialData)
  useEffect(() => {
    // Skip if we have initial data and this is the first render with default filters
    if (initialData && page === 1 && selectedSports.length === 0 && !difficulty && minRating === 0 && !searchQuery && sortBy === 'newest') {
      return;
    }
    fetchGuides();
  }, [selectedSports, difficulty, minRating, searchQuery, sortBy, page, locale]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('sports', selectedSports.join(','));
      params.set('difficulty', difficulty);
      params.set('minRating', minRating.toString());
      params.set('search', searchQuery);
      params.set('sort', sortBy);
      params.set('page', page.toString());
      params.set('locale', locale);
      // Include filters on first page or when filters haven't been loaded yet
      if (page === 1 || filtersData.sports.length === 0) {
        params.set('includeFilters', 'true');
      }

      const response = await fetch(`/api/guides?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides);
        setTotalResults(data.pagination?.total || 0);
        // Update filters if provided
        if (data.filters) {
          setFiltersData(data.filters);
        }
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedSports.length > 0) params.set('sports', selectedSports.join(','));
    if (difficulty) params.set('difficulty', difficulty);
    if (minRating > 0) params.set('minRating', minRating.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy && sortBy !== 'newest') params.set('sort', sortBy);
    
    router.push(`/${locale}/guides?${params.toString()}`);
  }, [selectedSports, difficulty, minRating, searchQuery, sortBy, locale, router]);

  const handleSportToggle = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
    setPage(1);
  };

  const handleClearFilters = () => {
    setSelectedSports([]);
    setDifficulty('');
    setMinRating(0);
    setSearchQuery('');
    setPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    setPage(1);
    updateURL();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateURL();
  };

  const sidebarContent = (
    <div className="space-y-6">
      {/* Related Sports */}
      {filtersData.sports.length > 0 && (
        <Accordion title={t('filters.sports')} defaultOpen>
          <div className="space-y-2">
            {filtersData.sports.map((sport) => (
              <Checkbox
                key={sport}
                id={`sport-${sport}`}
                checked={selectedSports.includes(sport)}
                onChange={() => handleSportToggle(sport)}
                label={sport}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Difficulty Level */}
      {filtersData.difficulties.length > 0 && (
        <Accordion title={t('filters.difficulty')}>
          <div className="space-y-2">
            {filtersData.difficulties.map((diff) => (
              <Checkbox
                key={diff}
                id={`difficulty-${diff}`}
                checked={difficulty === diff}
                onChange={() => {
                  setDifficulty(difficulty === diff ? '' : diff);
                  setPage(1);
                }}
                label={diff}
              />
            ))}
          </div>
        </Accordion>
      )}

      {/* Rating Minimum */}
      <Accordion title={t('filters.minRating')}>
        <div className="space-y-4">
          <Slider
            min={0}
            max={5}
            values={[minRating]}
            onChange={(values) => {
              setMinRating(values[0]);
              setPage(1);
            }}
            step={0.5}
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('filters.rating')}</span>
            <span className="font-medium">{minRating > 0 ? minRating.toFixed(1) : t('filters.any')}</span>
          </div>
        </div>
      </Accordion>

      {/* Clear Filters */}
      <Button onClick={handleClearFilters} variant="outline" className="w-full">
        {t('filters.clear')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {totalResults} {totalResults === 1 ? t('guide') : t('guides')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('filters.title')}
              </button>
              {/* Sort */}
              <Select
                value={sortBy}
                onChange={handleSortChange}
                options={[
                  { value: 'newest', label: t('sort.newest') },
                  { value: 'rating', label: t('sort.rating') },
                  { value: 'views', label: t('sort.views') },
                  { value: 'title', label: t('sort.alphabetical') },
                ]}
              />
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1"
              />
              <Button type="submit" variant="primary">
                {t('search.button')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            {sidebarContent}
          </aside>
          
          {/* Mobile Drawer */}
          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={t('filters.title')}>
            {sidebarContent}
          </Drawer>
          
          {/* Guides Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                ))}
              </div>
            ) : guides.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    slug={guide.slug}
                    title={guide.title}
                    description={guide.description}
                    image={guide.coverImage}
                    views={guide.viewsCount}
                    rating={guide.rating}
                    ratingCount={guide.ratingCount}
                    readTime={guide.readTime}
                    sports={guide.relatedSports}
                    difficulty={guide.difficulty}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">{t('noGuidesFound')}</p>
              </div>
            )}
            
            {/* Pagination */}
            {guides.length > 0 && totalResults > 12 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                >
                  {t('pagination.previous')}
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('pagination.page')} {page}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={guides.length < 12}
                  variant="outline"
                >
                  {t('pagination.next')}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}




