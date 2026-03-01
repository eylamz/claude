'use client';

import { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Icon } from '@/components/icons';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Separator } from '../ui';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SkateparkImage {
  url: string;
  order: number;
  publicId?: string;
  isFeatured?: boolean;
}

interface Skatepark {
  _id: string;
  slug: string;
  name: { en: string; he: string } | string;
  address: { en: string; he: string } | string;
  area: 'north' | 'center' | 'south';
  location: { lat: number; lng: number };
  imageUrl: string;
  images?: SkateparkImage[];
  amenities: {
    entryFee: boolean;
    parking: boolean;
    shade: boolean;
    bathroom: boolean;
    helmetRequired: boolean;
    guard: boolean;
    seating: boolean;
    bombShelter: boolean;
    scootersAllowed: boolean;
    bikesAllowed: boolean;
    noWax: boolean;
    nearbyRestaurants: boolean;
  };
  rating: number;
  totalReviews: number;
  is24Hours: boolean;
  isFeatured?: boolean;
  openingYear?: number | null;
  closingYear?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  distance?: number | null;
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

// Amenity icon mapping (for Icon component - matches AmenitiesButton)
const AMENITY_ICON_MAP: Record<string, string> = {
  parking: 'parking',
  shade: 'shadeBold',
  bathroom: 'toilet',
  guard: 'securityGuard',
  seating: 'seatBold',
  nearbyRestaurants: 'foodBold',
  scootersAllowed: 'scooter',
  bikesAllowed: 'bmx-icon',
  entryFee: 'moneyBold',
  helmetRequired: 'helmet',
  bombShelter: 'safe-house',
  noWax: 'Wax',
};

// Amenity labels
const getAmenityLabel = (key: string, locale: string): string => {
  const labels: Record<string, { en: string; he: string }> = {
    parking: { en: 'Parking', he: 'חניה' },
    shade: { en: 'Shade', he: 'הצללה' },
    bathroom: { en: 'Bathroom', he: 'שירותים' },
    seating: { en: 'Seating', he: 'מקומות ישיבה' },
    nearbyRestaurants: { en: 'Restaurants Nearby', he: 'מסעדות בקרבת מקום' },
    scootersAllowed: { en: 'Scooters Allowed', he: 'קורקינטים כניסה' },
    bikesAllowed: { en: 'Bikes Allowed', he: 'אופניים מותר' },
    guard: { en: 'Guard', he: 'שומר' },
    entryFee: { en: 'Entry Fee', he: 'דמי כניסה' },
    helmetRequired: { en: 'Helmet Required', he: 'חובה קסדה' },
    bombShelter: { en: 'Bomb Shelter', he: 'מקלט' },
    noWax: { en: 'No Wax', he: 'ללא שעווה' },
  };
  const label = labels[key];
  if (!label) return key;
  return locale === 'he' ? label.he : label.en;
};

// Check if park is new (created in last 2 months)
const isNewPark = (createdAt: string | null): boolean => {
  if (!createdAt) return false;
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  return new Date(createdAt) > twoMonthsAgo;
};

// Memoized thumbnail component
const SkateparkThumbnail = memo(({ 
  photoUrl, 
  parkName, 
  onLoad,
  alwaysSaturated = false
}: { 
  photoUrl: string, 
  parkName: string,
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
  }, [photoUrl, onLoad, isLoaded, hasError]);

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
          alt={parkName}
          className={`rounded-2xl w-full h-full object-cover transition-all duration-200 select-none bg-card dark:bg-card-dark shadow-lg shadow-[rgba(0,0,0,0.05)] ${
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
SkateparkThumbnail.displayName = 'SkateparkThumbnail';

// Memoized amenities component
const ParkAmenities = memo(({ 
  amenities, 
  locale,
  alwaysVisible = false,
  variant = 'overlay', // 'overlay' | 'inline'
  distanceText
}: { 
  amenities: Skatepark['amenities'], 
  locale: string,
  alwaysVisible?: boolean,
  variant?: 'overlay' | 'inline',
  distanceText?: string | null
}) => {
  const amenityEntries = Object.entries(amenities)
    .filter(([key, value]) => value && AMENITY_ICON_MAP[key])
    .slice(0, 6); // Limit to 6 amenities

  if (amenityEntries.length === 0) return null;

  if (variant === 'inline') {
    // Inline variant: no background, horizontal layout
    return (
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        <div className=" flex flex-wrap gap-3 items-start">
          {amenityEntries.map(([key]) => {
            const iconName = AMENITY_ICON_MAP[key];
            if (!iconName) return null;
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div className="flex items-center cursor-help">
                    <Icon name={iconName as any} className="w-4 h-4 text-[#555]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {getAmenityLabel(key, locale)}
                </TooltipContent>
              </Tooltip>
            );
          })}
          {distanceText && (
            <div className="flex items-center gap-1 text-green dark:text-green-dark  rounded-full">
              <Icon name="locationBold" className="w-3 h-3 shrink-0" />
              <span className="text-sm whitespace-nowrap">
                {distanceText}
              </span>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Overlay variant: with background (default)
  return (
    <div className={`absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 ${alwaysVisible ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'}`}>
      {amenityEntries.map(([key]) => {
        const iconName = AMENITY_ICON_MAP[key];
        if (!iconName) return null;
        return (
          <div
            key={key}
            className="flex items-center bg-black/45 backdrop-blur-sm p-1.5  rounded-lg"
            title={getAmenityLabel(key, locale)}
          >
            <Icon name={iconName as any} className="w-4 h-4 text-white" />
          </div>
        );
      })}
    </div>
  );
});
ParkAmenities.displayName = 'ParkAmenities';

interface MapParkCardProps {
  park: Skatepark;
  locale: string;
  onClose: () => void;
}

/**
 * MapParkCard Component
 * A card component displayed in the map view showing selected park details
 */
export const MapParkCard = memo(({ park, locale, onClose: _onClose }: MapParkCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Automatically expand card when a new park is selected
  useEffect(() => {
    setIsExpanded(true);
  }, [park._id]);
  
  const tr = (enText: string, heText: string) => (locale === 'he' ? heText : enText);

  const name = typeof park.name === 'string' 
    ? park.name 
    : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;

  const photoUrl = park.images && park.images.length > 0 
    ? park.images.find(img => img.isFeatured)?.url || park.images[0]?.url 
    : park.imageUrl;

  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2];
  const hasOpeningYear = park.openingYear && recentYears.includes(park.openingYear);
  const isClosed = park.closingYear && park.closingYear <= currentYear;
  const isNew = park.createdAt && isNewPark(park.createdAt);
  const isFeatured = park.isFeatured;

  const distanceText = park.distance !== null && park.distance !== undefined
    ? `${park.distance.toFixed(1)} ${tr('km', 'ק\"מ')}`
    : null;

  const hasOtherBadges = hasOpeningYear || isClosed || isNew || isFeatured;
  const showBadgesSection = hasOtherBadges || distanceText;

  return (
    <div
      ref={cardRef}
      className={`absolute px-2 bottom-0 left-0 w-[60vw] md:w-[calc(100%-2rem)] max-w-[20rem] z-[20] shadow-2xl bg-white rounded-tr-2xl rounded-bl-2xl ${isExpanded ? 'pb-2' : ''}`}
    >
      <div className={`w-full h-fit relative group select-none transform-gpu flex flex-col items-center justify-between gap-2 px-2 ${isExpanded ? 'pb-2' : ''}`}>
        {/* Park Name - At the top - Always visible */}
        <div className={`w-full h-fit flex pt-2 items-center justify-between gap-2 ${locale === 'he' ? '[direction:ltr]' : ''}`}>
          <h3 className={`flex-1 ${!isExpanded ? 'text-md' : (name.includes('-') ? (name.split('-').some(part => part.trim().length > 10) ? 'text-md' : 'text-xl') : (name.length > 10 ? 'text-md md:text-base' : 'text-xl'))} ${isExpanded ? 'md:text-lg' : ''} font-semibold ${name.includes('-') && isExpanded ? '' : 'truncate'} text-[#2a2a2a] ${locale === 'he' && isExpanded ? 'translate-x-[2rem] z-10' : ''}`}>
            {name.includes('-') && isExpanded ? (
              name.split('-').map((part, index) => (
                <span key={index}>
                  {part.trim()}
                  {index < name.split('-').length - 1 && <br />}
                </span>
              ))
            ) : (
              name
            )}
          </h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`flex-shrink-0 py-3 px-3 min-w-[2.5rem] min-h-[2.5rem]  h-full -m-3 rounded-t-2xl transition-all duration-300 ${name.includes('-') && isExpanded && locale === 'he' ? 'translate-y-[-100%] translate-x-[4px] bg-card' : !name.includes('-') && isExpanded && locale === 'he' ? 'translate-y-[-70%] translate-x-[4px] bg-card' : ''}`}
              aria-label={isExpanded ? tr('Collapse', 'כווץ') : tr('Expand', 'הרחב')}
            >
              <ChevronDown className={`w-5 h-5 transition-transform duration-200 text-[#555] ${!isExpanded ? 'rotate-180' : ''}`} />
            </button>
        </div>

        {/* Expandable Content */}
        <div 
          className={`w-full overflow-visible transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[2000px]' : 'max-h-0'
          }`}
        >
          <Link 
            href={`/${locale}/skateparks/${park.slug}`}
            className={`w-full block -mx-2 px-2 transition-opacity duration-300 overflow-visible ${
              isExpanded ? 'opacity-100 delay-100 pointer-events-auto' : 'opacity-0 delay-0 pointer-events-none'
            }`}
          >
            <Separator className={`mb-3 transition-all duration-300 dark:bg-border ${isExpanded ? 'opacity-100 translate-y-0 delay-150' : 'opacity-0 -translate-y-2 delay-0'}`} />
            {/* Amenities - Below park name */}
            {park.amenities && Object.values(park.amenities).some(Boolean) && (
              <div className={`w-full mb-3 transition-all duration-300 animate-fadeInDown ${isExpanded ? 'opacity-100 translate-y-0 delay-200' : 'opacity-0 -translate-y-2 delay-0'}`}>
                <ParkAmenities 
                  amenities={park.amenities} 
                  locale={locale} 
                  alwaysVisible={true} 
                  variant="inline"
                />
              </div>
            )}

            {/* Badges Section - Below amenities (includes green distance badge for all cards when distance available) */}
            {showBadgesSection && (
              <div className={`w-full  mb-2 relative flex flex-wrap gap-2 items-center transition-all duration-300 animate-fadeInDown delay-250 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 delay-0'}`}>
                {/* Opening Year Badge */}
                {hasOpeningYear && (
                  <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-orange dark:bg-orange-dark text-white dark:text-orange-bg-dark px-2 py-0.5 rounded-full">
                    <Icon name='sparksBold' className="w-2 h-2 md:w-3 md:h-3" />
                    <span className="font-semibold">
                      {park.openingYear}
                    </span>
                  </div>
                )}

                {/* Closed Badge */}
                {isClosed && (
                  <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-red dark:bg-red-dark text-white dark:text-red-bg-dark text-sm md:text-base px-2 py-1 rounded-full">
                    <Icon name="closedPark" className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="font-medium">
                      {tr('Closed', 'נסגר')}
                    </span>
                  </div>
                )}

                {/* New Badge */}
                {isNew && (
                  <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark text-sm md:text-base px-2 py-1 rounded-full">
                    <Icon name="trees" className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="font-medium">
                      {tr('New', 'חדש')}
                      </span>
                  </div>
                )}

                {/* Featured Badge */}
                {isFeatured && (
                  <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-purple-bg dark:bg-purple-dark text-purple dark:text-purple-bg-dark text-sm md:text-base px-2 py-1 rounded-full">
                    <span className="font-medium">
                      {tr('Featured', 'מומלץ')}
                    </span>
                    <Icon name="featured" className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                )}

                {/* Distance Badge - shown for all map park cards when distance is available */}
                {distanceText && (
                  <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-green-bg dark:bg-green-dark text-green dark:text-green-bg-dark text-sm md:text-base px-2 py-1 rounded-full">
                    <Icon name="locationBold" className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="font-semibold">
                      {distanceText}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Image - At the bottom */}
            <div className={`relative w-full bg-black/25 h-[8rem] rounded-2xl overflow-visible transition-all duration-300 animate-fadeInDown delay-300 shadow-xl border border-border ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 delay-0'}`}>
              <SkateparkThumbnail
                photoUrl={photoUrl}
                parkName={name}
                alwaysSaturated={true}
              />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
});

MapParkCard.displayName = 'MapParkCard';

