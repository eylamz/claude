'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ProductCard, ViewToggle } from '@/components/shop';
import { Accordion, Checkbox, Slider, Drawer, Button, Select, Skeleton } from '@/components/ui';

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

export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('shop');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoriesData>({ categories: [], sports: [] });
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get('sports')?.split(',').filter(Boolean) || []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    searchParams.get('sizes')?.split(',').filter(Boolean) || []
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get('colors')?.split(',').filter(Boolean) || []
  );
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStockOnly') === 'true');
  
  // View and sort
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'new');
  const [page, setPage] = useState(1);
  
  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, [locale]);
  
  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [category, selectedSports, priceRange, selectedSizes, selectedColors, inStockOnly, sortBy, page, locale]);
  
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/products/categories?locale=${locale}`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Set max price based on products (simplified)
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
      params.set('category', category);
      params.set('sports', selectedSports.join(','));
      params.set('minPrice', priceRange[0].toString());
      params.set('maxPrice', priceRange[1].toString());
      params.set('inStockOnly', inStockOnly.toString());
      params.set('sizes', selectedSizes.join(','));
      params.set('colors', selectedColors.join(','));
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
    if (category) params.set('category', category);
    if (selectedSports.length > 0) params.set('sports', selectedSports.join(','));
    if (selectedSizes.length > 0) params.set('sizes', selectedSizes.join(','));
    if (selectedColors.length > 0) params.set('colors', selectedColors.join(','));
    if (inStockOnly) params.set('inStockOnly', 'true');
    if (sortBy && sortBy !== 'new') params.set('sort', sortBy);
    
    router.push(`/${locale}/shop?${params.toString()}`);
  }, [category, selectedSports, selectedSizes, selectedColors, inStockOnly, sortBy, locale, router]);
  
  const handleCategoryChange = (cat: string) => {
    setCategory(cat === category ? '' : cat);
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
  
  const handleColorToggle = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
    setPage(1);
  };
  
  const handleClearFilters = () => {
    setCategory('');
    setSelectedSports([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange([0, 1000]);
    setInStockOnly(false);
    setPage(1);
  };
  
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortBy(value);
    setPage(1);
    updateURL();
  };
  
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  
  const allAvailableColors = products
    .flatMap((p) => p.variants || [])
    .map((v) => v.color)
    .filter((c, i, arr) => arr.findIndex((x) => x.hex === c.hex) === i);
  
  const sidebarContent = (
    <div className="space-y-6">
      {/* Categories */}
      <Accordion title={t('categories')} defaultOpen>
        <div className="space-y-2">
          {categories.categories.map((cat) => (
            <Checkbox
              key={cat}
              id={`category-${cat}`}
              checked={category === cat}
              onChange={() => handleCategoryChange(cat)}
              label={cat}
            />
          ))}
        </div>
      </Accordion>
      
      {/* Related Sports */}
      {categories.sports.length > 0 && (
        <Accordion title={t('relatedSports')}>
          <div className="space-y-2">
            {categories.sports.map((sport) => (
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
      
      {/* Price Range */}
      <Accordion title={t('filterBy.priceRange')}>
        <Slider
          min={0}
          max={1000}
          values={priceRange}
          onChange={setPriceRange}
          step={10}
        />
      </Accordion>
      
      {/* Sizes */}
      <Accordion title={t('sizes')}>
        <div className="grid grid-cols-3 gap-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeToggle(size)}
              className={`p-2 border rounded text-sm ${
                selectedSizes.includes(size)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </Accordion>
      
      {/* Colors */}
      {allAvailableColors.length > 0 && (
        <Accordion title={t('colors')}>
          <div className="flex flex-wrap gap-2">
            {allAvailableColors.slice(0, 10).map((color) => (
              <button
                key={color.hex}
                onClick={() => handleColorToggle(color.hex)}
                className={`w-10 h-10 rounded-full border-2 ${
                  selectedColors.includes(color.hex)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name?.en || color.name}
              />
            ))}
          </div>
        </Accordion>
      )}
      
      {/* In Stock Only */}
      <Checkbox
        id="inStockOnly"
        checked={inStockOnly}
        onChange={setInStockOnly}
        label={t('inStockOnly')}
      />
      
      {/* Clear Filters */}
      <Button onClick={handleClearFilters} variant="outline" className="w-full">
        {t('clearFilters')}
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
                {totalResults} {totalResults === 1 ? t('product') : t('products')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('filters')}
              </button>
              {/* Sort */}
              <Select
                value={sortBy}
                onChange={handleSortChange}
                options={[
                  { value: 'popular', label: t('popular') },
                  { value: 'new', label: t('new') },
                  { value: 'price-asc', label: t('sort.priceLow') },
                  { value: 'price-desc', label: t('sort.priceHigh') },
                ]}
              />
              {/* View Toggle */}
              <ViewToggle viewMode={viewMode} onViewChange={setViewMode} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            {sidebarContent}
          </aside>
          
          {/* Mobile Drawer */}
          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={t('filters')}>
            {sidebarContent}
          </Drawer>
          
          {/* Products */}
          <main className="flex-1">
            {loading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}>
                {products.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">{t('noProductsFound')}</p>
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
                  {t('previous')}
                </Button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {t('page')} {page}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={products.length < 12}
                  variant="outline"
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

