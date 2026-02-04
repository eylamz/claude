'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { X, TrendingUp } from 'lucide-react';
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchInput } from '@/components/common/SearchInput';
import { Icon } from '@/components/icons';
import type { GuideData, FiltersData, ILocalizedField } from '@/lib/api/guides';
import { flipLanguage } from '@/lib/utils/transliterate';
import { queryMatchesCategory } from '@/lib/search-from-cache';
import { highlightMatch } from '@/lib/search-highlight';

interface Guide extends GuideData {}

// Helper function to get localized text from localized field or string
const getLocalizedText = (field: ILocalizedField | string | undefined, locale: string): string => {
  if (!field) return '';
  if (typeof field === 'string') return field; // Backward compatibility
  return field[locale as 'en' | 'he'] || field.en || '';
};

/** Parse "tag:name" or "תג:name" from search query. Returns tag name for filtering or null if not a tag search. */
function parseTagSearch(query: string): { isTagSearch: true; tag: string } | { isTagSearch: false } {
  if (!query || typeof query !== 'string') return { isTagSearch: false };
  const trimmed = query.trim();
  // Match "tag:" or "תג:" (with optional spaces), case-insensitive for "tag"
  const match = trimmed.match(/^\s*(?:tag|תג)\s*:\s*(.+)$/i);
  if (!match || !match[1]) return { isTagSearch: false };
  const tag = match[1].trim();
  return tag ? { isTagSearch: true, tag } : { isTagSearch: false };
}

/** Get all tag strings from a guide (handles array or { en, he } format). */
function getGuideTags(guide: Guide): string[] {
  const t = guide.tags;
  if (!t) return [];
  if (Array.isArray(t)) return t;
  if (typeof t === 'object' && ('en' in t || 'he' in t)) {
    const en = (t as { en?: string[]; he?: string[] }).en || [];
    const he = (t as { en?: string[]; he?: string[] }).he || [];
    return [...new Set([...en, ...he])];
  }
  return [];
}

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

// Sport mapping configuration - easy to edit
// Add or remove sports here, update the iconName to match available icons, and set variant for colors
// Available variants: 'default' | 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'yellow' | 'teal' | 'pink'
const SPORT_CONFIG = [
  {
    value: 'roller',
    iconName: 'Roller' as const,
    displayName: 'Rollerblading',
    variant: 'blue' as const,
    tooltipEn: 'Filter by Rollerblading guides',
    tooltipHe: 'סנן לפי מדריכי רולר',
  },
  {
    value: 'skate',
    iconName: 'Skate' as const,
    displayName: 'Skating',
    variant: 'blue' as const,
    tooltipEn: 'Filter by Skating guides',
    tooltipHe: 'סנן לפי מדריכי סקייט',
  },
  {
    value: 'scoot',
    iconName: 'scooter' as const,
    displayName: 'Scootering',
    variant: 'blue' as const,
    tooltipEn: 'Filter by Scootering guides',
    tooltipHe: 'סנן לפי מדריכי קורקינט',
  },
  {
    value: 'bmx',
    iconName: 'bmx-icon' as const,
    displayName: 'BMXing',
    variant: 'blue' as const,
    tooltipEn: 'Filter by BMX guides',
    tooltipHe: 'סנן לפי מדריכי BMX',
  },
  {
    value: 'longboard',
    iconName: 'Longboard' as const,
    displayName: 'Longboarding',
    variant: 'blue' as const,
    tooltipEn: 'Filter by Longboarding guides',
    tooltipHe: 'סנן לפי מדריכי לונגבורד',
  }
] as const;

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
          <div className="w-16 h-16" />
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
  animationDelay = 0,
  getSportTranslation,
  getDifficultyTranslation,
  highlightQuery,
}: { 
  guide: Guide; 
  locale: string; 
  animationDelay?: number;
  getSportTranslation: (sport: string) => string;
  getDifficultyTranslation: (difficulty: string) => string;
  highlightQuery?: string;
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showNameSection, setShowNameSection] = useState(false);
  const [showGuideName, setShowGuideName] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

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

  const guideTitle = getLocalizedText(guide.title, locale);
  const guideDescription = guide.description ? truncateDescription(getLocalizedText(guide.description, locale), 80) : '';

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={`h-fit group  rounded-xl  cursor-pointer relative group select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''} `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={guideTitle}
    >
      <div className="group-hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-2xl relative h-[12rem] md:h-[16rem] overflow-hidden"
              style={{
                filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
              }}
      
      >
        {/* Sports Tags Overlay */}
        {guide.relatedSports && guide.relatedSports.length > 0 && (
          <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100">
            {guide.relatedSports.slice(0, 4).map((sport, idx) => {
              const sportConfig = SPORT_CONFIG.find(s => s.value === sport.toLowerCase());
              return (
                <div
                  key={idx}
                  className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg"
                  title={sportConfig ? sportConfig.displayName : getSportTranslation(sport)}
                >
                  {sportConfig ? (
                    <Icon name={sportConfig.iconName as any} className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-medium text-white">{getSportTranslation(sport)}</span>
                  )}
                </div>
              );
            })}
            {guide.relatedSports.length > 4 && (
              <div className="flex items-center bg-black/45 backdrop-blur-sm p-1.5 rounded-lg">
                <span className="text-xs font-medium text-white">+{guide.relatedSports.length - 4}</span>
              </div>
            )}
          </div>
        )}

        {/* Difficulty Badge */}
        {guide.difficulty && (
          <div className="absolute bottom-2 left-0 z-10">
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-500 dark:bg-purple-600 text-white text-xs md:text-sm font-semibold ps-1 md:ps-3 pe-1 md:pe-2 py-1 rounded-r-full shadow-lg">
              {getDifficultyTranslation(guide.difficulty)}
            </div>
          </div>
        )}

        <GuideThumbnail
          photoUrl={guide.coverImage || ''}
          guideTitle={guideTitle}
        />
      </div>

      {/* Name Section */}
      <div 
          className="space-y-1 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showNameSection ? '200px' : '0',
            paddingTop: showNameSection ? '0.5rem' : '0',
            paddingBottom: showNameSection ? '0.5rem' : '0',
          }}
        >
          <h3 
            className={`text-lg font-medium opacity-0 ${showGuideName ? 'animate-fadeInDown animation-delay-[1s]' : ''}`}
          >
            {highlightQuery ? highlightMatch(guideTitle, highlightQuery) : guideTitle}
          </h3>
         
        </div>
    </div>
  );
});
GuideCard.displayName = 'GuideCard';

export default function GuidesPageClient({ initialData }: GuidesPageProps) {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('guides');
  
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);
  
  // Helper function to get translated sport name
  const getSportTranslation = useCallback((sport: string): string => {
    if (!sport) return sport;
    const sportKey = sport.toLowerCase();
    const translationKey = `sports.${sportKey}`;
    const translated = t(translationKey as any);
    // If translation key doesn't exist, next-intl returns the key path, so check if it's different
    if (translated && translated !== translationKey && !translated.startsWith('sports.')) {
      return translated;
    }
    // Fallback to original sport name (capitalize first letter)
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  }, [t]);

  // Helper function to get translated difficulty name
  const getDifficultyTranslation = useCallback((difficulty: string): string => {
    if (!difficulty) return difficulty;
    const difficultyKey = difficulty.toLowerCase();
    const translationKey = `difficulty.${difficultyKey}`;
    const translated = t(translationKey as any);
    // If translation key doesn't exist, next-intl returns the key path, so check if it's different
    if (translated && translated !== translationKey && !translated.startsWith('difficulty.')) {
      return translated;
    }
    // Fallback to original difficulty name (capitalize first letter)
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  }, [t]);
  
  const [guides, setGuides] = useState<Guide[]>(initialData?.guides || []);
  const [filtersData, setFiltersData] = useState<FiltersData>(
    initialData?.filters || { sports: [], difficulties: [] }
  );
  const [loading, setLoading] = useState(!initialData);
  const [totalResults, setTotalResults] = useState(initialData?.pagination?.total || 0);
  const [totalGuidesCount, setTotalGuidesCount] = useState(initialData?.pagination?.total || 0); // Unfiltered total
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  
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
      setIsScrolled(currentScrollY > 240);
    };

    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);
    setIsScrolled(initialScrollY > 2600);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check version and cache on mount
  useEffect(() => {
    const checkVersionAndCache = async () => {
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);

      // If no cache or version, fetch and cache all guides
      if (!cachedData || !cachedVersion) {
        try {
          const response = await fetch('/api/guides?limit=100');
          if (response.ok) {
            const data = await response.json();
            const currentVersion = data.version || 1;
            const allGuides = data.guides || [];
            
            // Store in cache
            localStorage.setItem(cacheKey, JSON.stringify(allGuides));
            localStorage.setItem(versionKey, currentVersion.toString());
          }
        } catch (error) {
          console.error('Error fetching guides for cache:', error);
        }
      } else {
        // Cache exists, check version in background
        try {
          const versionResponse = await fetch('/api/guides?versionOnly=true');
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            const fetchedVersion = versionData.version || 1;
            setCurrentVersion(fetchedVersion);
            const storedVersion = parseInt(cachedVersion);

            // If versions don't match, update cache
            if (storedVersion !== fetchedVersion) {
              const response = await fetch('/api/guides?limit=100');
              if (response.ok) {
                const data = await response.json();
                const newVersion = data.version || 1;
                const allGuides = data.guides || [];
                
                // Update cache
                localStorage.setItem(cacheKey, JSON.stringify(allGuides));
                localStorage.setItem(versionKey, newVersion.toString());
                setCurrentVersion(newVersion);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to check guides version', error);
        }
      }
      
      setCacheInitialized(true);
    };

    checkVersionAndCache();
  }, []);

  // Fetch guides only when filters/pagination change (wait for cache to initialize)
  useEffect(() => {
    if (!cacheInitialized) return; // Wait for cache check to complete
    
    // For initial load with no filters, try to use cache first
    const isInitialLoad = page === 1 && selectedSports.length === 0 && !difficulty && minRating === 0 && !searchQuery && sortBy === 'newest';
    
    if (isInitialLoad && initialData) {
      // Check if cache exists and is valid
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);
      
      if (cachedData && cachedVersion) {
        // Use cached data for initial render
        try {
          const allCachedGuides = JSON.parse(cachedData);
          if (Array.isArray(allCachedGuides) && allCachedGuides.length > 0) {
            // Apply pagination
            const limit = 12;
            const paginatedGuides = allCachedGuides.slice(0, limit);
            
            setGuides(paginatedGuides);
            setTotalResults(allCachedGuides.length);
            setTotalGuidesCount(allCachedGuides.length); // Set unfiltered total
            
            // Extract filters from cached data
            const sportsSet = new Set<string>();
            allCachedGuides.forEach((guide: Guide) => {
              guide.relatedSports?.forEach(sport => sportsSet.add(sport));
            });
            setFiltersData({
              sports: Array.from(sportsSet).sort(),
              difficulties: ['Beginner', 'Intermediate', 'Advanced', 'Expert'].filter(diff =>
                allCachedGuides.some((guide: Guide) => guide.difficulty?.toLowerCase() === diff.toLowerCase())
              ),
            });
            
            return; // Use cache, don't fetch
          }
        } catch (e) {
          console.warn('Failed to use cached guides on initial load', e);
        }
      }
      
      // No valid cache, use initialData (already set in state)
      return;
    }
    
    // For filtered/searched/paginated views, always fetch (or use cache in fetchGuides)
    fetchGuides();
  }, [cacheInitialized, selectedSports, difficulty, minRating, searchQuery, sortBy, page, locale, initialData]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);

      // Try to use cache first if available
      if (cachedData && cachedVersion) {
        try {
          const allCachedGuides = JSON.parse(cachedData);
          const storedVersion = parseInt(cachedVersion);
          
          // Use the version from state if available (from initial check), otherwise trust cache
          // Only check version if we haven't checked it yet (currentVersion is null)
          let versionMatches = true;
          if (currentVersion !== null) {
            versionMatches = storedVersion === currentVersion;
          } else {
            // Fallback: if version wasn't checked yet, check it now (shouldn't happen normally)
            const versionResponse = await fetch('/api/guides?versionOnly=true');
            if (versionResponse.ok) {
              const versionData = await versionResponse.json();
              const fetchedVersion = versionData.version || 1;
              setCurrentVersion(fetchedVersion);
              versionMatches = storedVersion === fetchedVersion;
            }
          }

            // If version matches, filter cached guides client-side
            if (versionMatches && Array.isArray(allCachedGuides)) {
              let filteredGuides = [...allCachedGuides];

              // Apply filters: tag: / תג: search, category trigger, or title/description search
              if (searchQuery) {
                const tagSearch = parseTagSearch(searchQuery);
                if (tagSearch.isTagSearch) {
                  const tagLower = tagSearch.tag.toLowerCase();
                  filteredGuides = filteredGuides.filter((guide: Guide) => {
                    const tags = getGuideTags(guide);
                    return tags.some((t) => t.toLowerCase() === tagLower || t.toLowerCase().includes(tagLower));
                  });
                } else if (queryMatchesCategory(searchQuery, 'guides')) {
                  // Show all guides when user types e.g. "מדריכים", "guides", "nsrhfho"
                } else {
                  const searchLower = searchQuery.toLowerCase().trim();
                  const flipped = flipLanguage(searchQuery);
                  const flippedLower = flipped ? flipped.toLowerCase().trim() : '';
                  filteredGuides = filteredGuides.filter((guide: Guide) => {
                    const title = getLocalizedText(guide.title, locale);
                    const description = guide.description ? getLocalizedText(guide.description, locale) : '';
                    const titleLower = title.toLowerCase();
                    const descLower = description.toLowerCase();
                    return (
                      titleLower.includes(searchLower) ||
                      descLower.includes(searchLower) ||
                      (flippedLower && (titleLower.includes(flippedLower) || descLower.includes(flippedLower)))
                    );
                  });
                }
              }

              if (selectedSports.length > 0) {
                filteredGuides = filteredGuides.filter((guide: Guide) => 
                  guide.relatedSports?.some(sport => selectedSports.includes(sport))
                );
              }

              if (difficulty) {
                filteredGuides = filteredGuides.filter((guide: Guide) => 
                  guide.difficulty?.toLowerCase() === difficulty.toLowerCase()
                );
              }

              if (minRating > 0) {
                filteredGuides = filteredGuides.filter((guide: Guide) => 
                  (guide.rating || 0) >= minRating
                );
              }

              // Apply sorting
              filteredGuides.sort((a: Guide, b: Guide) => {
                switch (sortBy) {
                  case 'rating':
                    return (b.rating || 0) - (a.rating || 0);
                  case 'views':
                    return (b.viewsCount || 0) - (a.viewsCount || 0);
                  case 'title':
                    return getLocalizedText(a.title, locale).localeCompare(getLocalizedText(b.title, locale));
                  case 'newest':
                  default:
                    return 0; // Already sorted by newest in cache
                }
              });

              // Apply pagination
              const limit = 12;
              const startIndex = (page - 1) * limit;
              const paginatedGuides = filteredGuides.slice(startIndex, startIndex + limit);

              setGuides(paginatedGuides);
              setTotalResults(filteredGuides.length);
              setTotalGuidesCount(allCachedGuides.length); // Always set unfiltered total
              
              // Extract filters from cached data if needed
              if (filtersData.sports.length === 0 && allCachedGuides.length > 0) {
                const sportsSet = new Set<string>();
                allCachedGuides.forEach((guide: Guide) => {
                  guide.relatedSports?.forEach(sport => sportsSet.add(sport));
                });
                setFiltersData({
                  sports: Array.from(sportsSet).sort(),
                  difficulties: ['Beginner', 'Intermediate', 'Advanced', 'Expert'].filter(diff =>
                    allCachedGuides.some((guide: Guide) => guide.difficulty?.toLowerCase() === diff.toLowerCase())
                  ),
                });
              }

              setLoading(false);
              return; // Exit early, used cache
            } else {
              // Version mismatch, fetch fresh data
              console.log('Guides version mismatch, fetching fresh data');
            }
        } catch (e) {
          console.warn('Failed to use cached guides data', e);
          // Continue to fetch from API
        }
      }

      // Fetch from API (no cache or cache invalid)
      const tagSearchForApi = parseTagSearch(searchQuery);
      const searchParam = tagSearchForApi.isTagSearch ? tagSearchForApi.tag : searchQuery;
      const params = new URLSearchParams();
      params.set('sports', selectedSports.join(','));
      params.set('difficulty', difficulty);
      params.set('minRating', minRating.toString());
      params.set('search', searchParam);
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

        // Update cache if we got all guides (limit=100)
        if (data.version) {
          const allGuidesResponse = await fetch('/api/guides?limit=100');
          if (allGuidesResponse.ok) {
            const allGuidesData = await allGuidesResponse.json();
            const fetchedVersion = allGuidesData.version || 1;
            const allGuides = allGuidesData.guides || [];
            
            localStorage.setItem(cacheKey, JSON.stringify(allGuides));
            localStorage.setItem(versionKey, fetchedVersion.toString());
            setCurrentVersion(fetchedVersion);
            setTotalGuidesCount(allGuides.length); // Set unfiltered total
          }
        }
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  };

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
  
  // Count active filters (each selected sport counts as a separate filter)
  const activeFiltersCount = 
    selectedSports.length + 
    (difficulty ? 1 : 0) + 
    (minRating > 0 ? 1 : 0) + 
    (searchQuery.trim() ? 1 : 0);
  const hasMultipleFilters = activeFiltersCount > 1;

  // Filter sport buttons to only show those with available guides
  const availableSportButtons = SPORT_CONFIG.filter(sport => {
    // Show button only if this sport exists in filtersData
    return filtersData.sports.includes(sport.value);
  });

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      
      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div className="relative pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Your Progress is Our Joy.',
                'גלה מדריכים שיעזרו לך ללמוד ולהשתפר. הצטרף לקהילה.'
              )}
            </p>
            
            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-main animate-pulse" />
                <span className="text-gray-600 dark:text-gray-400">
                  {totalGuidesCount} {totalGuidesCount === 1 ? t('guide') : t('guides')}
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
        <div className="max-w-6xl mx-auto px-4">
          {/* Main Filter Row */}
          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3">
            
            {/* Left: Search */}
            <div className="flex items-center gap-1 flex-1">
              <div className="flex-1 min-w-0 w-full">
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
            <div className="flex items-center gap-3">
              {/* Sports Filter - Multi-select Buttons */}
              <TooltipProvider delayDuration={50}>
                <div className="flex items-center gap-2 flex-wrap">
                  {availableSportButtons.map((sport) => {
                    const isSelected = selectedSports.includes(sport.value);
                    
                    return (
                      <Tooltip key={sport.value}>
                        <TooltipTrigger asChild>
                          <Button
                            variant={isSelected ? sport.variant : 'gray'}
                            size="sm"
                            onClick={() => {
                              // Toggle this sport
                              setSelectedSports(prev => {
                                if (prev.includes(sport.value)) {
                                  return prev.filter(s => s !== sport.value);
                                } else {
                                  return [...prev, sport.value];
                                }
                              });
                              setPage(1);
                            }}
                            aria-label={tr(sport.tooltipEn, sport.tooltipHe)}
                          >
                            <Icon name={sport.iconName as any} className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          className="text-center"
                          variant={isSelected ? sport.variant : 'gray'}
                        >
                          {tr(sport.tooltipEn, sport.tooltipHe)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              {/* Difficulty Filter */}
              {filtersData.difficulties.length > 1 && (
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
                          {getDifficultyTranslation(diff)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            </div>
          </div>

          {/* ========================================
              ACTIVE FILTERS STATUS - Improved Layout
          ======================================== */}
          {hasAnyFilter && (
            <div className="mt-3 pt-3 border-t border-border dark:border-border-dark">
              <div className="flex flex-wrap items-center gap-2">
                {/* Results Count Badge */}
                {!loading && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-bg dark:bg-gray-bg-dark rounded-full border border-gray-border dark:border-gray-border-dark animate-pop">
                    <Icon name="bookBold" className="w-4 h-4 text-gray dark:text-gray-dark" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {guides.length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {tr('of', 'מתוך')} {totalGuidesCount}
                    </span>
                  </div>
                )}

                {/* Search Query Badge */}
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-bg dark:bg-orange-bg-dark rounded-full border border-orange-border dark:border-orange-border-dark hover:bg-orange-hover-bg dark:hover:bg-orange-hover-bg-dark transition-colors duration-200 cursor-pointer animate-pop"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      "{searchQuery}"
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Sports Badges */}
                {selectedSports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSports(prev => prev.filter(s => s !== sport))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-bg dark:bg-blue-bg-dark rounded-full border border-blue-border dark:border-blue-border-dark hover:bg-blue-hover-bg dark:hover:bg-blue-hover-bg-dark transition-colors duration-200 cursor-pointer animate-pop"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getSportTranslation(sport)}
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                ))}

                {/* Difficulty Badge */}
                {difficulty && (
                  <button
                    onClick={() => setDifficulty('')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-bg dark:bg-purple-bg-dark rounded-full border border-purple-border dark:border-purple-border-dark hover:bg-purple-hover-bg dark:hover:bg-purple-hover-bg-dark transition-colors duration-200 cursor-pointer animate-pop"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {getDifficultyTranslation(difficulty)}
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Rating Badge */}
                {minRating > 0 && (
                  <button
                    onClick={() => setMinRating(0)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-full border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors cursor-pointer"
                  >
                    <Icon name="star" className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {tr('Rating', 'דירוג')} ≥ {minRating.toFixed(1)}
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Clear All Filters Button */}
                {hasMultipleFilters && (
                  <button
                    onClick={handleClearFilters}
                    className="opacity-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-transparent text-gray dark:text-gray-dark hover:text-red dark:hover:text-red-dark hover:bg-red-bg dark:hover:bg-red-bg-dark hover:border-red-border dark:hover:border-red-border-dark rounded-full transition-colors duration-200 animate-fadeIn"
                    style={{ animationDelay: `400ms` }}
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
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-fit shadow-lg rounded-3xl overflow-hidden">
                <div className="h-[12rem] md:h-[16rem] bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="px-3 py-2 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : guides.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {guides.map((guide, index) => (
                <GuideCard 
                  key={guide.id} 
                  guide={guide} 
                  locale={locale} 
                  animationDelay={index * 50}
                  getSportTranslation={getSportTranslation}
                  getDifficultyTranslation={getDifficultyTranslation}
                  highlightQuery={searchQuery || undefined}
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
