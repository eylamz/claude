'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { Button, SelectWrapper } from '@/components/ui';
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
  skillLevelFilter: '' | 'beginners' | 'advanced' | 'pro';
  setSkillLevelFilter: (level: '' | 'beginners' | 'advanced' | 'pro') => void;
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
  skillLevelFilter,
  setSkillLevelFilter,
  openNowOnly,
  userLocation,
  userCity,
  sortBy,
  viewMode,
  setViewMode,
  loading,
  skateparksCount,
  allSkateparksCount,
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

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

  // Calculate active filters (each selected amenity counts as a separate filter)
  const hasAreaFilter = !!areaFilter;
  const hasSkillLevelFilter = !!skillLevelFilter;
  const hasOpenNowFilter = openNowOnly;
  const hasSearchQuery = !!searchQuery.trim();
  const activeFiltersCount = selectedAmenities.length + (hasAreaFilter ? 1 : 0) + (hasSkillLevelFilter ? 1 : 0) + (hasOpenNowFilter ? 1 : 0) + (hasSearchQuery ? 1 : 0);
  const hasAnyFilter = activeFiltersCount > 0;
  const hasMultipleFilters = activeFiltersCount > 1;
  const hasLocationSorting = userLocation && sortBy === 'nearest';
  const showStatus = hasAnyFilter || hasLocationSorting;

  return (
    <div 
      className={`sticky z-40  bg-background dark:bg-background-dark transition-all duration-200 border-b-2 border-transparent ${
        isScrolled 
          ? `!bg-header dark:!bg-header-dark shadow-xl border-header-border dark:border-header-border-dark py-3 ${
              isScrollingUp 
                ? 'top-16' 
                : 'top-0 pt-6 sm:pt-4'
            }` 
          : 'py-4 pt-6 sm:pt-4'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Filter Row */}
        <div className="flex flex-col xxs:flex-row items-stretch md:items-center gap-3">
          {/* Left: Search + Skill level + Amenities */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Search Input - desktop only */}
            <div className="flex-1 min-w-0 hidden md:block">
              <SearchInput
                placeholder={tr('Search parks...', 'חפש פארקים...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full "
              />
            </div>
            {/* Skill level dropdown */}
            <div className="w-[130px] flex-shrink-0 [&_[data-slot=select-trigger]]:h-9">
              <SelectWrapper
                value={skillLevelFilter}
                variant='purple'
                onChange={(e) => setSkillLevelFilter((e.target.value || '') as '' | 'beginners' | 'advanced' | 'pro')}
                options={[
                  { value: '', label: t('search.skillLevel.all') },
                  { value: 'beginners', label: t('search.skillLevel.beginners') },
                  { value: 'advanced', label: t('search.skillLevel.advanced') },
                  { value: 'pro', label: t('search.skillLevel.pro') },
                ]}
              />
            </div>
          </div>

          {/* Right: Location + View Toggle */}
          <div className="flex items-center gap-2 xsm:gap-3">
                        {/* Mobile: Search toggle button (green, no tooltip) */}
                        <div className="flex-shrink-0 md:hidden">
              <Button
                variant={mobileSearchOpen ? "orange" : "gray"}
                size="sm"
                onClick={() => setMobileSearchOpen((open) => !open)}
                className="overflow-hidden"
                aria-label={tr('Search parks...', 'חפש פארקים...')}
              >
                <Icon name={mobileSearchOpen ? "searchBold" : "search"} className="w-5 h-5" />
              </Button>
            </div>

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
                      name={userLocation ? "locationBold" : "location"}
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
                      variant={viewMode === 'map' ? "red" : "gray"}
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
                        <Icon name="map" className="w-5 h-5" />
                      ) : (
                        <Icon name="mapBold" className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  variant={viewMode === 'grid' ? 'gray' : 'red'}
                  side="bottom" 
                  className="text-center"
                >
                  {viewMode === 'grid' ? tr('Map View', 'תצוגת מפה') : tr('Grid View', 'תצוגת רשת')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mobile: Search row (shown when search button clicked) */}
        {mobileSearchOpen && (
          <div className="mt-3 md:hidden animate-scaleFadeDown">
            <SearchInput
              placeholder={tr('Search parks...', 'חפש פארקים...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              className="w-full"
            />
          </div>
        )}

        {/* Active Filters Status */}
        {showStatus && (
          <div className="mt-3 pt-3 border-t border-border-border dark:border-border-dark">
            <div className="flex flex-wrap items-center gap-2">
              {/* Results Count Badge */}
              {hasAnyFilter && !loading && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-bg dark:bg-gray-bg-dark rounded-full border border-gray-border dark:border-gray-border-dark animate-pop">
                  <Icon name="trees" className="w-4 h-4 text-gray dark:text-gray-dark" />
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
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-bg dark:bg-orange-bg-dark rounded-full border border-orange-border dark:border-orange-border-dark hover:bg-orange-bg/80 dark:hover:bg-orange-bg-dark/80 transition-colors cursor-pointer animate-pop"
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
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-bg dark:bg-purple-bg-dark rounded-full border border-purple-border dark:border-purple-border-dark hover:bg-purple-bg/80 dark:hover:bg-purple-bg-dark/80 transition-colors cursor-pointer animate-pop"
                >
                  <MapPin className="w-3.5 h-3.5 text-purple dark:text-purple-dark" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`search.area.${areaFilter}`)}
                  </span>
                  <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}

              {/* Skill level filter badge */}
              {hasSkillLevelFilter && (
                <button
                  onClick={() => setSkillLevelFilter('')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-bg dark:bg-purple-bg-dark rounded-full border border-purple-border dark:border-purple-border-dark hover:bg-purple-bg/80 dark:hover:bg-purple-bg-dark/80 transition-colors cursor-pointer animate-pop"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`search.skillLevel.${skillLevelFilter}`)}
                  </span>
                  <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              )}

              {/* Amenities Badges */}
              {selectedAmenities.map((amenity) => {
                const amenityOption = amenityOptions.find(a => a.key === amenity);
                const iconName = amenityOption?.iconName;

                return (
                  <button
                    key={amenity}
                    onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-bg dark:bg-blue-bg-dark rounded-full border border-blue-border dark:border-blue-border-dark hover:bg-blue-bg/80 dark:hover:bg-blue-bg-dark/80 transition-colors cursor-pointer animate-pop"
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
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-bg dark:bg-green-bg-dark rounded-full border border-green-border dark:border-green-border-dark animate-pop">
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
              {hasMultipleFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-transparent text-gray dark:text-gray-dark hover:text-red dark:hover:text-red-dark hover:bg-red-bg dark:hover:bg-red-bg-dark hover:border-red-border dark:hover:border-red-border-dark rounded-full transition-colors duration-200 animate-fadeIn"
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
  );
}

