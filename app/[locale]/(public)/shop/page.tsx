// nextjs-app/app/[locale]/(public)/shop/page.tsx
'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard } from '@/components/shop';
import { Accordion, Checkbox, Slider, Drawer, Button, SelectWrapper, Skeleton } from '@/components/ui';
import { 
  Filter, 
  X, 
  ShoppingBag, 
  Tag,
  Sparkles,
  Grid3x3,
  List,
} from 'lucide-react';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';

interface Product {
  id: string;
  slug: string;
  name: string;
  image: string;
  images: any[];
  price: number;
  discountPrice?: number;
  hasDiscount?: boolean;
  category?: string;
  variants?: any[];
}

interface CategoriesData {
  categories: string[];
  sports: string[];
}

function ShopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('shop');
  const ecommerceEnabled = isEcommerceEnabled();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoriesData>({ categories: [], sports: [] });
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  );
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get('sports')?.split(',').filter(Boolean) || []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get('sizes')?.split(',').filter(Boolean) || []
  );
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Sort
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'new');
  const [page, setPage] = useState(1);
  
  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Scroll state for sticky header
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, [locale]);
  
  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [selectedCategories, selectedSports, priceRange, selectedSizes, sortBy, page, locale]);
  
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/products/categories?locale=${locale}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        setPriceRange([0, 1000]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('categories', selectedCategories.join(','));
      params.set('sports', selectedSports.join(','));
      params.set('minPrice', priceRange[0].toString());
      params.set('maxPrice', priceRange[1].toString());
      params.set('sizes', selectedSizes.join(','));
      params.set('sort', sortBy);
      params.set('page', page.toString());
      params.set('locale', locale);
      
      const response = await fetch(`/api/products?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setTotalResults(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
    if (selectedSports.length > 0) params.set('sports', selectedSports.join(','));
    if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
    if (sortBy && sortBy !== 'new') params.set('sort', sortBy);
    
    router.push(`/${locale}/shop?${params.toString()}`);
  }, [selectedCategories, selectedSports, selectedSizes, sortBy, locale, router]);
  
  const handleCategoryToggle = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPage(1);
  };
  
  const handleSportToggle = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
    setPage(1);
  };
  
  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
    setPage(1);
  };
  
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedSports([]);
    setSelectedSizes([]);
    setPriceRange([0, 1000]);
    setPage(1);
  };
  
  // Translation helper
  const getTranslatedCategory = (category: string) => {
    return t(`categoryLabels.${category}`, { defaultValue: category });
  };
  
  const getTranslatedSport = (sport: string) => {
    return t(`sportLabels.${sport}`, { defaultValue: sport });
  };
  
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    setPage(1);
    updateURL();
  };
  
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || 
    selectedSports.length > 0 || 
    selectedSizes.length > 0 ||
    (priceRange[0] !== 0 || priceRange[1] !== 1000);
  
  // Count active filters
  const activeFiltersCount = selectedCategories.length + selectedSports.length + selectedSizes.length;
  
  const sidebarContent = (
    <div className="space-y-4 pt-4">
      {/* Categories */}
      <Accordion title={t('categories')} defaultOpen>
        <div className="space-y-1">
          {categories.categories.map((cat) => (
            <Checkbox
              key={cat}
              id={`category-${cat}`}
              checked={selectedCategories.includes(cat)}
              onChange={() => handleCategoryToggle(cat)}
              label={getTranslatedCategory(cat)}
            />
          ))}
        </div>
      </Accordion>
      
      {/* Related Sports */}
      {categories.sports.length > 0 && (
        <Accordion title={t('relatedSports')}>
          <div className="space-y-1">
            {categories.sports.map((sport) => (
              <Checkbox
                key={sport}
                id={`sport-${sport}`}
                checked={selectedSports.includes(sport)}
                onChange={() => handleSportToggle(sport)}
                label={getTranslatedSport(sport)}
              />
            ))}
          </div>
        </Accordion>
      )}
      
      {/* Price Range */}
      <Accordion title={t('filterBy.priceRange')}>
        <div className="py-2">
          <Slider
            min={0}
            max={1000}
            values={priceRange}
            onChange={setPriceRange}
            step={10}
          />
        </div>
      </Accordion>
      
      {/* Sizes */}
      <Accordion title={t('sizes')}>
        <div className="grid grid-cols-3 gap-2 py-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeToggle(size)}
              className={`p-3 border rounded-lg text-sm font-medium transition-all ${
                selectedSizes.includes(size)
                  ? 'border-brand-main bg-brand-main/10 dark:bg-brand-main/20 text-brand-main'
                  : 'border-border dark:border-border-dark bg-black/5 dark:bg-black/30 text-header-text-dark dark:text-header-text hover:border-brand-main/50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Accordion>
      
      {/* Clear Filters */}
      {hasActiveFilters && (
        <div className="pt-2">
          <Button onClick={handleClearFilters} variant="outline" className="w-full">
            <X className="w-4 h-4 mr-2" />
            {t('clearFilters')}
          </Button>
        </div>
      )}
    </div>
  );
  
  // Show "Page in construction" if ecommerce is disabled
  if (!ecommerceEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <ShoppingBag className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'דף בבנייה' : 'Page in Construction'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {locale === 'he' 
              ? 'החנות זמינה בקרוב. אנא נסו מאוחר יותר.'
              : 'The shop is coming soon. Please check back later.'
            }
          </p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="brand"
            className="px-6 py-3"
          >
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Homepage'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      
      {/* ========================================
          HERO SECTION - Brand Messaging
      ======================================== */}
      <div className="relative pt-14 bg-gradient-to-br from-green-500/10 via-transparent to-brand-main/10 dark:from-green-500/5 dark:to-brand-main/5 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {t('title') || 'Shop'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {locale === 'he' 
                ? 'ציוד, אופנה וכל מה שאתה צריך לרכיבה'
                : 'Gear up for your next session. Quality products for riders.'
              }
            </p>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-600 dark:text-gray-400">
                  {totalResults} {totalResults === 1 ? t('product') : t('products')}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {locale === 'he' ? 'מבצעים חמים' : 'Hot Deals'}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {locale === 'he' ? 'משלוח חינם מעל ₪200' : 'Free Shipping'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          STICKY FILTER BAR
      ======================================== */}
      <div 
        className={cn(
          'sticky top-16 md:top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 transition-all duration-300',
          isScrolled ? 'shadow-md py-3' : 'py-4'
        )}
      >
        <div className="max-w-6xl mx-auto px-4">
          {/* Main Controls Row */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Filter Button (Mobile) + View Toggle */}
            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Button
                onClick={() => setIsDrawerOpen(true)}
                variant="outline"
                size="xl"
                className="md:hidden rounded-full"
              >
                <Filter className="w-5 h-5" />
                {activeFiltersCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-brand-main text-white text-xs font-bold rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {/* View Mode Toggle (Desktop) */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-full transition-colors',
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                  aria-label="Grid view"
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
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Sort */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
                {locale === 'he' ? 'מיין לפי:' : 'Sort by:'}
              </span>
              <SelectWrapper
                value={sortBy}
                onChange={(e) => handleSortChange(e as React.ChangeEvent<HTMLSelectElement>)}
                options={[
                  { value: 'popular', label: t('popular') || 'Popular' },
                  { value: 'new', label: t('new') || 'Newest' },
                  { value: 'price-asc', label: t('sort.priceLow') || 'Price: Low to High' },
                  { value: 'price-desc', label: t('sort.priceHigh') || 'Price: High to Low' },
                ]}
                className="min-w-[150px]"
              />
            </div>
          </div>

          {/* ========================================
              ACTIVE FILTERS BADGES
          ======================================== */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                {/* Results Count Badge */}
                {!loading && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 rounded-full border border-green-500/20 dark:border-green-500/30">
                    <ShoppingBag className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {products.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {locale === 'he' ? 'מתוך' : 'of'} {totalResults}
                    </span>
                  </div>
                )}

                {/* Category Badges */}
                {selectedCategories.map((cat) => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    <Icon name="shop" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getTranslatedCategory(cat)}
                    </span>
                    <button
                      onClick={() => handleCategoryToggle(cat)}
                      className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ))}

                {/* Sport Badges */}
                {selectedSports.map((sport) => (
                  <div
                    key={sport}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getTranslatedSport(sport)}
                    </span>
                    <button
                      onClick={() => handleSportToggle(sport)}
                      className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ))}

                {/* Size Badges */}
                {selectedSizes.map((size) => (
                  <div
                    key={size}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-full border border-teal-200 dark:border-teal-800"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {locale === 'he' ? `מידה ${size}` : `Size ${size}`}
                    </span>
                    <button
                      onClick={() => handleSizeToggle(size)}
                      className="p-0.5 hover:bg-teal-100 dark:hover:bg-teal-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ))}

                {/* Price Range Badge */}
                {(priceRange[0] !== 0 || priceRange[1] !== 1000) && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ₪{priceRange[0]} - ₪{priceRange[1]}
                    </span>
                    <button
                      onClick={() => setPriceRange([0, 1000])}
                      className="p-0.5 hover:bg-green-100 dark:hover:bg-green-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                )}

                {/* Clear All Button */}
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  {locale === 'he' ? 'נקה הכל' : 'Clear All'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT
      ======================================== */}
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        <div className="flex gap-8">
          
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-32">
              {sidebarContent}
            </div>
          </aside>
          
          {/* Mobile Drawer */}
          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={t('filters')}>
            {sidebarContent}
          </Drawer>
          
          {/* Products */}
          <main className="flex-1">
            {loading ? (
              <div className={cn(
                'grid gap-6',
                viewMode === 'grid'
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-1'
              )}>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className={cn(
                'grid gap-6',
                viewMode === 'grid'
                  ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  : 'grid-cols-1'
              )}>
                {products.map((product) => (
                  <ProductCard key={product.id} {...product} view={viewMode} />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-4">
                  <ShoppingBag className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {locale === 'he' ? 'לא נמצאו מוצרים' : 'No products found'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {locale === 'he' 
                    ? 'נסה לשנות את הפילטרים או המיון'
                    : 'Try adjusting your filters or sort options'
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="brand" onClick={handleClearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    {locale === 'he' ? 'נקה את כל הפילטרים' : 'Clear All Filters'}
                  </Button>
                )}
              </div>
            )}
            
            {/* Pagination */}
            {products.length > 0 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                >
                  {t('previous') || (locale === 'he' ? 'הקודם' : 'Previous')}
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center">
                  {t('page') || (locale === 'he' ? 'עמוד' : 'Page')} {page}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={products.length < 12}
                  variant="outline"
                >
                  {t('next') || (locale === 'he' ? 'הבא' : 'Next')}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-6xl">
            <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
