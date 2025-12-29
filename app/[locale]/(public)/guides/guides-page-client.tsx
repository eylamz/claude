'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { X, TrendingUp } from 'lucide-react';
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { Icon } from '@/components/icons';
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

// Utility function to optimize image URLs
const getOptimizedImageUrl = (originalUrl: string): string | null => {
  if (!originalUrl || originalUrl.trim() === '') return null;
  
  if (originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      return `${urlParts[0]}/upload/w_800,c_fill,q_auto:good,f_auto/${urlParts[1]}`;
    }
  }
  return originalUrl;
};

// Memoized thumbnail component
const GuideThumbnail = memo(({ 
  photoUrl, 
  guideTitle, 
  onLoad,
  alwaysSaturated = false
}: { 
  photoUrl: string, 
  guideTitle: string,
  onLoad?: () => void,
  alwaysSaturated?: boolean
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [photoUrl]);
  
  // Check if image is already loaded (cached) after render
  useEffect(() => {
    const checkImageLoaded = () => {
      if (imgRef.current) {
        const img = imgRef.current;
        // Check if image is already complete (cached)
        if (img.complete && img.naturalHeight !== 0) {
          setIsLoaded(true);
          setHasError(false);
          onLoad?.();
          return true;
        } else if (img.complete && img.naturalHeight === 0) {
          // Image failed to load
          setIsLoaded(true);
          setHasError(true);
          return true;
        }
      }
      return false;
    };
    
    // Check immediately
    if (checkImageLoaded()) return;
    
    // Check after a small delay to allow ref to be set
    const timeout1 = setTimeout(() => {
      checkImageLoaded();
    }, 100);
    
    // Fallback: if image hasn't loaded after 3 seconds, hide spinner
    const timeout2 = setTimeout(() => {
      if (!isLoaded && !hasError && imgRef.current) {
        const img = imgRef.current;
        if (!img.complete || img.naturalHeight === 0) {
          setIsLoaded(true);
          setHasError(true);
        }
      }
    }, 3000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [photoUrl, onLoad]);
  
  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleImageError = () => {
    setIsLoaded(true); // Hide spinner even on error
    setHasError(true);
  };

  const optimizedUrl = photoUrl ? getOptimizedImageUrl(photoUrl) : null;

  return (
    <>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-background/20 dark:bg-background/20 flex items-center justify-center z-10">
          <LoadingSpinner />
        </div>
      )}
      {optimizedUrl ? (
        <img
          ref={imgRef}
          src={optimizedUrl}
          alt={guideTitle}
          className={`w-full h-full rounded-xl object-cover transition-all duration-200 select-none ${
            alwaysSaturated ? 'saturate-[1.75]' : 'saturate-150 group-hover:saturate-[1.75]'
          } ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="w-16 h-16 opacity-50 bg-card-muted dark:bg-card-muted-dark rounded" />
        </div>
      )}
    </>
  );
});
GuideThumbnail.displayName = 'GuideThumbnail';

/**
 * Guide Card Component
 */
const GuideCard = memo(({ 
  guide, 
  locale, 
  animationDelay = 0 
}: { 
  guide: Guide; 
  locale: string; 
  animationDelay?: number;
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showNameSection, setShowNameSection] = useState(false);
  const [showGuideName, setShowGuideName] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  // Show name section after 0.3s delay when card appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNameSection(true);
      // Show guide name with pop animation after height starts growing
      setTimeout(() => {
        setShowGuideName(true);
      }, 0); // Small delay to let height transition start
    }, 300 + animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);
    setTimeout(() => {
      window.location.href = `/${locale}/guides/${guide.slug}`;
    }, 300);
  }, [guide.slug, locale]);

  // Truncate description for display
  const truncateDescription = (text: string | undefined, maxLength: number = 80): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const description = guide.description ? truncateDescription(guide.description, 80) : '';

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={`h-fit shadow-lg shadow-[rgba(0,0,0,0.05)] hover:shadow-lg dark:hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''} `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={guide.title}
    >
      <div className="relative h-[10.5rem] overflow-hidden">
        {/* Sports Tags Overlay */}
        {guide.relatedSports && guide.relatedSports.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
            {guide.relatedSports.slice(0, 3).map((sport, idx) => (
              <div
                key={idx}
                className="flex items-center bg-black/45 backdrop-blur-sm px-2 py-1 rounded-lg"
              >
                <span className="text-xs font-medium text-white">{sport}</span>
              </div>
            ))}
            {guide.relatedSports.length > 3 && (
              <div className="flex items-center bg-black/45 backdrop-blur-sm px-2 py-1 rounded-lg">
                <span className="text-xs font-medium text-white">+{guide.relatedSports.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* Difficulty Badge */}
        {guide.difficulty && (
          <div className="absolute bottom-2 left-0 z-10">
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-500 dark:bg-purple-600 text-white text-xs md:text-sm font-semibold ps-1 md:ps-3 pe-1 md:pe-2 py-1 rounded-r-full shadow-lg">
              {guide.difficulty}
            </div>
          </div>
        )}

        <GuideThumbnail
          photoUrl={guide.coverImage || ''}
          guideTitle={guide.title}
        />

        {/* Hover Overlay - Only on non-touch devices */}
        {!isTouchDevice && (
          <div className={`absolute -bottom-1 z-20 pointer-events-none ${
            locale === 'he' ? 'right-0' : 'left-0'
          }`}>
            {/* Guide Name & Description Overlay */}
            <div className={`relative border border-transparent dark:border-[#686868] bg-card dark:bg-card-dark px-3 pt-2 pb-3 shadow-[-2px_1px_8px_3px_rgba(0,0,0,0.2)] max-w-[90%] ${
              locale === 'he'
                ? 'rounded-tl-lg opacity-0 group-hover:opacity-100 translate-x-[36%] translate-y-[22%] rotate-[-1deg] group-hover:translate-x-[3%] group-hover:translate-y-[3%] group-hover:rotate-[2deg]'
                : 'rounded-tr-xl opacity-0 group-hover:opacity-100 translate-x-[-6%] translate-y-[12%] rotate-[1deg] group-hover:translate-x-[-3%] group-hover:translate-y-[3%] group-hover:rotate-[-2deg]'
            } transition-[opacity,transform] duration-[200ms,300ms] ease-[cubic-bezier(0.76,0,0.24,1),cubic-bezier(0.76,0,0.24,1)]`}>
              <h3 className="text-sm font-semibold text-text dark:text-text-dark mb-1">
                {guide.title}
              </h3>
              {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Name Section - Only on touch devices */}
      {isTouchDevice && (
        <div 
          className="px-3 space-y-1 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showNameSection ? '200px' : '0',
            paddingTop: showNameSection ? '0.5rem' : '0',
            paddingBottom: showNameSection ? '0.5rem' : '0',
          }}
        >
          <h3 
            className={`text-sm font-semibold truncate ${showGuideName ? 'animate-fadeInDown animation-delay-[1s]' : 'opacity-0'}`}
          >
            {guide.title}
          </h3>
          {description && (
            <p className={`text-xs text-gray-600 dark:text-gray-400 line-clamp-2 ${showGuideName ? 'animate-fadeInDown animation-delay-[1.2s]' : 'opacity-0'}`}>
              {description}
            </p>
          )}
          <div className={`flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 gap-2 ${showGuideName ? 'opacity-0 animate-fadeInDown animation-delay-[1.4s]' : 'opacity-0'}`}>
            {guide.rating !== undefined && guide.rating > 0 && (
              <div className="flex items-center gap-1">
                <Icon name="star" className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium">{guide.rating.toFixed(1)}</span>
                {guide.ratingCount !== undefined && guide.ratingCount > 0 && (
                  <span className="text-gray-400">({guide.ratingCount})</span>
                )}
              </div>
            )}
            {guide.readTime !== undefined && guide.readTime > 0 && (
              <div className="flex items-center gap-1">
                <Icon name="clock" className="w-3.5 h-3.5" />
                <span>{guide.readTime} {tr('min', 'דק')}</span>
              </div>
            )}
            {guide.viewsCount !== undefined && (
              <div className="flex items-center gap-1">
                <Icon name="eye" className="w-3.5 h-3.5" />
                <span>{guide.viewsCount}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
GuideCard.displayName = 'GuideCard';

export default function GuidesPageClient({ initialData }: GuidesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('guides');
  
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);
  
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
  
  // UI State
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const prevScrollYRef = useRef(0);

  // Track scroll position for sticky header and header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;
      
      // Determine header visibility
      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        setIsHeaderVisible(false);
      }
      
      prevScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 260);
    };

    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);
    setIsScrolled(initialScrollY > 200);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch guides only when filters/pagination change
  useEffect(() => {
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
      if (page === 1 || filtersData.sports.length === 0) {
        params.set('includeFilters', 'true');
      }

      const response = await fetch(`/api/guides?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setGuides(data.guides);
        setTotalResults(data.pagination?.total || 0);
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

  const handleClearFilters = () => {
    setSelectedSports([]);
    setDifficulty('');
    setMinRating(0);
    setSearchQuery('');
    setPage(1);
  };

  // Calculate pagination info
  const totalPages = Math.ceil(totalResults / 12);
  const currentPage = page;
  const showingFrom = (currentPage - 1) * 12 + 1;
  const showingTo = Math.min(currentPage * 12, totalResults);

  const hasAnyFilter = selectedSports.length > 0 || difficulty || minRating > 0 || searchQuery.trim();

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      
      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div className="relative pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Discover guides to help you learn and improve. Join the community.',
                'גלה מדריכים שיעזרו לך ללמוד ולהשתפר. הצטרף לקהילה.'
              )}
            </p>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-main animate-pulse" />
                <span className="text-gray-600 dark:text-gray-400">
                  {totalResults} {totalResults === 1 ? t('guide') : t('guides')}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {tr('Updated Daily', 'מתעדכן יומי')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          STICKY FILTER BAR - Modern & Clean
      ======================================== */}
      <div 
        className={`sticky z-40 transition-all duration-300 border-b-2 border-transparent ${
          isHeaderVisible ? 'top-16 md:top-16' : 'top-0'
        } ${
          isScrolled 
            ? 'shadow-xl bg-header dark:bg-header-dark border-header-border dark:border-header-border-dark py-3' 
            : 'py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Main Filter Row */}
          <div className="flex flex-col xxs:flex-row items-stretch md:items-center gap-3">
            
            {/* Left: Search */}
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 min-w-0">
                <SearchInput
                  placeholder={tr('Search guides...', 'חפש מדריכים...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  className="w-full"
                />
              </div>
            </div>

            {/* Right: Filters + Sort */}
            <div className="flex items-center gap-0 xsm:gap-1">
              {/* Sports Filter */}
              {filtersData.sports.length > 0 && (
                <div className="flex-shrink-0">
                  <Select
                    value={selectedSports.length > 0 ? selectedSports[0] : 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setSelectedSports([]);
                      } else {
                        setSelectedSports([value]);
                      }
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={tr('All Sports', 'כל הספורט')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tr('All Sports', 'כל הספורט')}</SelectItem>
                      {filtersData.sports.map((sport) => (
                        <SelectItem key={sport} value={sport}>
                          {sport}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Difficulty Filter */}
              {filtersData.difficulties.length > 0 && (
                <div className="flex-shrink-0">
                  <Select
                    value={difficulty || 'all'}
                    onValueChange={(value) => {
                      setDifficulty(value === 'all' ? '' : value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={tr('All Levels', 'כל הרמות')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tr('All Levels', 'כל הרמות')}</SelectItem>
                      {filtersData.difficulties.map((diff) => (
                        <SelectItem key={diff} value={diff}>
                          {diff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort */}
              <div className="flex-shrink-0">
                <Select
                  value={sortBy}
                  onValueChange={(value) => {
                    setSortBy(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t('sort.newest')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('sort.newest')}</SelectItem>
                    <SelectItem value="rating">{t('sort.rating')}</SelectItem>
                    <SelectItem value="views">{t('sort.views')}</SelectItem>
                    <SelectItem value="title">{t('sort.alphabetical')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ========================================
              ACTIVE FILTERS STATUS - Improved Layout
          ======================================== */}
          {hasAnyFilter && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                {/* Results Count Badge */}
                {!loading && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-main/10 to-green-500/10 dark:from-brand-main/20 dark:to-green-500/20 rounded-full border border-brand-main/20 dark:border-brand-main/30">
                    <Icon name="mapBold" className="w-4 h-4 text-brand-main" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {guides.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {tr('of', 'מתוך')} {totalResults}
                    </span>
                  </div>
                )}

                {/* Search Query Badge */}
                {searchQuery.trim() && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-200 dark:border-blue-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      "{searchQuery}"
                    </span>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                )}

                {/* Sports Badges */}
                {selectedSports.map((sport) => (
                  <div
                    key={sport}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-full border border-teal-200 dark:border-teal-800"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {sport}
                    </span>
                    <button
                      onClick={() => setSelectedSports(prev => prev.filter(s => s !== sport))}
                      className="p-0.5 hover:bg-teal-100 dark:hover:bg-teal-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                ))}

                {/* Difficulty Badge */}
                {difficulty && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-full border border-purple-200 dark:border-purple-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {difficulty}
                    </span>
                    <button
                      onClick={() => setDifficulty('')}
                      className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                )}

                {/* Rating Badge */}
                {minRating > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-full border border-yellow-200 dark:border-yellow-800">
                    <Icon name="star" className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {tr('Rating', 'דירוג')} ≥ {minRating.toFixed(1)}
                    </span>
                    <button
                      onClick={() => setMinRating(0)}
                      className="p-0.5 hover:bg-yellow-100 dark:hover:bg-yellow-800 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                )}

                {/* Clear All Filters Button */}
                {hasAnyFilter && (
                  <button
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    {tr('Clear All', 'נקה הכל')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT AREA
      ======================================== */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-fit shadow-lg border-[4px] border-card dark:border-card-dark bg-card dark:bg-card-dark rounded-3xl overflow-hidden">
                <div className="h-[10.5rem] bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="px-3 py-2 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : guides.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3">
              {guides.map((guide, index) => (
                <GuideCard 
                  key={guide.id} 
                  guide={guide} 
                  locale={locale} 
                  animationDelay={index * 50}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {tr('Showing', 'מציג')} {showingFrom} {tr('to', 'עד')} {showingTo} {tr('of', 'מתוך')} {totalResults} {totalResults === 1 ? t('guide') : t('guides')}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('pagination.previous')}
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1)
                      .map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-1 text-sm rounded ${
                            pageNum === currentPage
                              ? 'bg-blue-600 dark:bg-blue-500 text-white'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-main/10 to-green-500/10 dark:from-brand-main/20 dark:to-green-500/20 mb-4">
              <Icon name="searchQuest" className="w-8 h-8 text-brand-main" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery 
                ? tr('No guides match your search', 'לא נמצאו מדריכים') 
                : tr('No guides found', 'לא נמצאו מדריכים')
              }
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tr('Try adjusting your filters or search terms', 'נסה לשנות את הפילטרים או החיפוש')}
            </p>
            {hasAnyFilter && (
              <Button variant="brand" onClick={handleClearFilters}>
                {tr('Clear All Filters', 'נקה את כל הפילטרים')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
