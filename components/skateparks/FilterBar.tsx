'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import AmenitiesButton from '@/components/common/AmenitiesButton';
import { SearchInput } from '@/components/common/SearchInput';
import { Icon } from '@/components/icons';

interface AmenityOption {
  key: string;
  label: string;
  iconName: string;
}

interface FilterBarProps {
  // Filter states
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAmenities: string[];
  setSelectedAmenities: (amenities: string[] | ((prev: string[]) => string[])) => void;
  areaFilter: string;
  setAreaFilter: (area: string) => void;
  openNowOnly: boolean;
  userLocation: { lat: number; lng: number } | null;
  userCity: string | null;
  sortBy: 'nearest' | 'alphabetical' | 'newest' | 'rating';
  viewMode: 'map' | 'grid';
  setViewMode: (mode: 'map' | 'grid') => void;
  
  // UI states
  loading: boolean;
  
  // Data
  skateparksCount: number;
  allSkateparksCount: number;
  animatingIcons: Set<string>;
  shouldAnimateLocation: boolean;
  
  // Callbacks
  requestLocation: () => void;
  clearFilters: () => void;
  heroSectionRef: React.RefObject<HTMLDivElement>;
  
  // Locale & translations
  locale: string;
  tr: (enText: string, heText: string) => string;
  t: (key: string) => string;
  amenityOptions: AmenityOption[];
}

/**
 * Filter Bar Component
 * Sticky filter bar with search, amenities, location, view toggle, and active filters status
 */
export function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedAmenities,
  setSelectedAmenities,
  areaFilter,
  setAreaFilter,
  openNowOnly,
  userLocation,
  userCity,
  sortBy,
  viewMode,
  setViewMode,
  loading,
  skateparksCount,
  allSkateparksCount,
  animatingIcons,
  shouldAnimateLocation,
  requestLocation,
  clearFilters,
  heroSectionRef,
  locale,
  tr,
  t,
  amenityOptions,
}: FilterBarProps) {
  // Scroll tracking state
  const [isScrolled, setIsScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const prevScrollYRef = useRef(0);

  // Track scroll position for scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;

      // Determine scroll direction
      if (currentScrollY < prevScrollY) {
        // Scrolling up
        setIsScrollingUp(true);
      } else if (currentScrollY > prevScrollY) {
        // Scrolling down
        setIsScrollingUp(false);
      }

      prevScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 260);
    };

    // Set initial scroll position
    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsScrolled(initialScrollY > 260);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate active filters
  const hasAreaFilter = !!areaFilter;
  const hasAmenitiesFilter = selectedAmenities.length > 0;
  const hasOpenNowFilter = openNowOnly;
  const hasSearchQuery = !!searchQuery.trim();
  const activeFiltersCount = (hasAreaFilter ? 1 : 0) + (hasAmenitiesFilter ? 1 : 0) + (hasOpenNowFilter ? 1 : 0) + (hasSearchQuery ? 1 : 0);
  const hasAnyFilter = activeFiltersCount > 0;
  const hasLocationSorting = userLocation && sortBy === 'nearest';
  const showStatus = hasAnyFilter || hasLocationSorting;

  return (
    <div 
      className={`sticky z-40  bg-header dark:bg-header-dark transition-all duration-200 border-b-2 border-transparent ${
        isScrolled 
          ? `shadow-xl border-header-border dark:border-header-border-dark py-3 ${
              isScrollingUp 
                ? 'top-16' 
                : 'top-0'
            }` 
          : 'py-4'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Filter Row */}
        <div className="flex flex-col xxs:flex-row items-stretch md:items-center gap-3">
          {/* Left: Search + Amenities */}
          <div className="flex items-center gap-1 flex-1">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
              <SearchInput
                placeholder={tr('Search parks...', 'חפש פארקים...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full "
              />
            </div>
          </div>

          {/* Right: Location + View Toggle */}
          <div className="flex items-center gap-2 xsm:gap-3">
            {/* Amenities Button */}
            <div className="flex-shrink-0">
              <AmenitiesButton
                selectedAmenities={selectedAmenities}
                onAmenitiesChange={setSelectedAmenities}
                locale={locale}
              />
            </div>

            <TooltipProvider delayDuration={50}>
              {/* Location Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={userLocation ? "green" : "gray"}
                    size="sm"
                    onClick={requestLocation}
                    className='overflow-hidden'
                    aria-label={userLocation ? tr('Disable Location', 'כבה מיקום') : tr('Use My Location', 'השתמש במיקומי')}
                  >
                    <Icon 
                      name={userLocation ? "locationOffBold" : "locationBold"}
                      className={`w-5 h-5 ${userLocation ? '' : 'animate-locationPin'}`}
                    />
                  </Button>
                </TooltipTrigger> 
                <TooltipContent 
                  side="bottom" 
                  className="text-center"
                  variant={userLocation ? "red" : "gray"}
                >
                  {userLocation ? tr('Disable Location', 'כבה מיקום') : tr('Use My Location', 'השתמש במיקומי')}
                </TooltipContent>
              </Tooltip>

              {/* View Toggle - Enhanced Animation */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      variant={viewMode === 'map' ? "orange" : "gray"}
                      size="sm"
                      onClick={() => {
                        const newViewMode = viewMode === 'grid' ? 'map' : 'grid';
                        setViewMode(newViewMode);
                        
                        // Scroll down when switching to map view
                        if (newViewMode === 'map' && heroSectionRef.current) {
                          const heroHeight = heroSectionRef.current.offsetHeight;
                          window.scrollTo({
                            top: heroHeight,
                            behavior: 'smooth'
                          });
                        }
                        // Scroll to top when switching to grid view
                        else if (newViewMode === 'grid') {
                          window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className=''
                      aria-label={viewMode === 'grid' ? tr('Map View', 'תצוגת מפה') : tr('Grid View', 'תצוגת רשת')}
                    >
                      {viewMode === 'grid' ? (
                        <Icon name="mapBold" className="w-5 h-5" />
                      ) : (
                        <Icon name="categoryBold" className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  variant={viewMode === 'grid' ? 'default' : 'orange'}
                  side="bottom" 
                  className="text-center"
                >
                  {viewMode === 'grid' ? tr('Map View', 'תצוגת מפה') : tr('Grid View', 'תצוגת רשת')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Active Filters Status */}
        {showStatus && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* Results Count Badge */}
              {hasAnyFilter && !loading && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-bg dark:bg-green-bg-dark rounded-full border border-green-border dark:border-green-border-dark">
                  <Icon name="mapBold" className="w-4 h-4 text-green" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {skateparksCount}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {tr('of', 'מתוך')} {allSkateparksCount}
                  </span>
                </div>
              )}

              {/* Search Query Badge */}
              {hasSearchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-bg dark:bg-orange-bg-dark rounded-full border border-orange-border dark:border-orange-border-dark hover:bg-orange-bg/80 dark:hover:bg-orange-bg-dark/80 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    "{searchQuery}"
                  </span>
                  <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}

              {/* Area Filter Badge */}
              {hasAreaFilter && (
                <button
                  onClick={() => setAreaFilter('')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-bg dark:bg-purple-bg-dark rounded-full border border-purple-border dark:border-purple-border-dark hover:bg-purple-bg/80 dark:hover:bg-purple-bg-dark/80 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-purple dark:text-purple-dark" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`search.area.${areaFilter}`)}
                  </span>
                  <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}

              {/* Amenities Badges */}
              {selectedAmenities.map((amenity) => {
                const amenityOption = amenityOptions.find(a => a.key === amenity);
                const iconName = amenityOption?.iconName;
                const shouldAnimate = animatingIcons.has(amenity);

                return (
                  <button
                    key={amenity}
                    onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-bg dark:bg-blue-bg-dark rounded-full border border-blue-border dark:border-blue-border-dark hover:bg-blue-bg/80 dark:hover:bg-blue-bg-dark/80 transition-colors cursor-pointer ${
                      shouldAnimate ? 'animate-pop' : ''
                    }`}
                  >
                    {iconName && (
                      <Icon
                        name={iconName as any}
                        className="w-3.5 h-3.5 text-blue dark:text-blue-dark"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {amenityOption?.label}
                    </span>
                    <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                  </button>
                );
              })}

              {/* Location Sorting Badge */}
              {hasLocationSorting && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-bg dark:bg-green-bg-dark rounded-full border border-green-border dark:border-green-border-dark ${
                  shouldAnimateLocation ? 'animate-pop' : ''
                }`}>
                  <Icon
                    name="locationBold"
                    className="w-3.5 h-3.5 text-green dark:text-green-dark"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {tr('Nearest First', 'הקרובים ביותר')}
                  </span>
                  {userCity && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({userCity})
                    </span>
                  )}
                </div>
              )}

              {/* Clear All Filters Button */}
              {hasAnyFilter && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-transparent text-gray dark:text-gray-dark hover:text-red dark:hover:text-red-dark hover:bg-red-bg dark:hover:bg-red-bg-dark hover:border-red-border dark:hover:border-red-border-dark rounded-full transition-colors duration-200"
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
  );
}

