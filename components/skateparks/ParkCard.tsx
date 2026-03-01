'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Icon } from '@/components/icons';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { highlightMatch } from '@/lib/search-highlight';

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

interface UserLocation {
  lat: number;
  lng: number;
}

type SortOption = 'nearest' | 'alphabetical' | 'newest' | 'rating' | 'shuffle';

// Utility function to optimize image URLs
const getOptimizedImageUrl = (
  originalUrl: string,
  options?: { width?: number; height?: number }
): string | null => {
  if (!originalUrl || originalUrl.trim() === '') return null;

  if (originalUrl.includes('cloudinary.com')) {
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length === 2) {
      const w = options?.width ?? 800;
      const h = options?.height;
      const sizePart = h != null ? `w_${w},h_${h},c_fill` : `w_${w},c_fill`;
      return `${urlParts[0]}/upload/${sizePart},q_auto:good,f_auto/${urlParts[1]}`;
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
const SkateparkThumbnail = memo(
  ({
    photoUrl,
    onLoad,
    alwaysSaturated = false,
    compact = false,
  }: {
    photoUrl: string;
    onLoad?: () => void;
    alwaysSaturated?: boolean;
    /** When true, request and display at most 220x200 for faster load (e.g. homepage park section). */
    compact?: boolean;
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

    const optimizedUrl = photoUrl
      ? getOptimizedImageUrl(photoUrl, compact ? { width: 400, height: 400 } : undefined)
      : null;

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
            alt=""
            className={`absolute left-1/2 -translate-x-1/2 w-[110%] h-full object-cover rounded-2xl transition-[transform,box-shadow,filter] duration-200 ease-out select-none bg-card dark:bg-card-dark shadow-lg shadow-[rgba(0,0,0,0.05)] group-hover:shadow-lg dark:group-hover:shadow-none dark:group-hover:!scale-[1.02] ${
              alwaysSaturated ? 'saturate-[1.75]' : 'saturate-150 group-hover:saturate-[1.75]'
            } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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
  }
);
SkateparkThumbnail.displayName = 'SkateparkThumbnail';

// Memoized amenities component
const ParkAmenities = memo(
  ({
    amenities,
    locale,
    alwaysVisible = false,
    variant = 'overlay', // 'overlay' | 'inline'
  }: {
    amenities: Skatepark['amenities'];
    locale: string;
    alwaysVisible?: boolean;
    variant?: 'overlay' | 'inline';
  }) => {
    const amenityEntries = Object.entries(amenities)
      .filter(([key, value]) => value && AMENITY_ICON_MAP[key])
      .slice(0, 6); // Limit to 6 amenities

    if (amenityEntries.length === 0) return null;

    if (variant === 'inline') {
      // Inline variant: no background, horizontal layout
      return (
        <div className="flex flex-wrap gap-2 items-center">
          {amenityEntries.map(([key]) => {
            const iconName = AMENITY_ICON_MAP[key];
            if (!iconName) return null;
            return (
              <div key={key} className="flex items-center" title={getAmenityLabel(key, locale)}>
                <Icon name={iconName as any} className="w-4 h-4 text-text dark:text-text-dark" />
              </div>
            );
          })}
        </div>
      );
    }

    // Overlay variant: with background (default)
    return (
      <div
        className={`absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] transition-opacity duration-200 ${alwaysVisible ? 'opacity-100' : 'md:opacity-0 md:group-hover:opacity-100'}`}
      >
        {amenityEntries.map(([key]) => {
          const iconName = AMENITY_ICON_MAP[key];
          if (!iconName) return null;
          return (
            <div
              key={key}
              className="flex items-center bg-black/75 p-1.5 rounded-lg"
              title={getAmenityLabel(key, locale)}
            >
              <Icon name={iconName as any} className="w-4 h-4 text-white" />
            </div>
          );
        })}
      </div>
    );
  }
);
ParkAmenities.displayName = 'ParkAmenities';

interface ParkCardProps {
  park: Skatepark;
  locale: string;
  animationDelay?: number;
  sortBy?: SortOption;
  userLocation?: UserLocation | null;
  /** When set, highlights matching substring in park name (e.g. search query). */
  highlightQuery?: string;
  /** Lighter card for homepage: no badges, no amenities. */
  compact?: boolean;
}

/**
 * Skatepark Card Component
 */
export const ParkCard = memo(
  ({
    park,
    locale,
    animationDelay = 0,
    sortBy,
    userLocation,
    highlightQuery,
    compact = false,
  }: ParkCardProps) => {
    const [isClicked, setIsClicked] = useState(false);
    const [isInViewport, setIsInViewport] = useState(false);
    const [showBadgeContainer, setShowBadgeContainer] = useState<Record<string, boolean>>({});
    const [showBadgeContent, setShowBadgeContent] = useState<Record<string, boolean>>({});
    const cardRef = useRef<HTMLDivElement>(null);
    const name =
      typeof park.name === 'string'
        ? park.name
        : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
    const tr = useCallback(
      (enText: string, heText: string) => (locale === 'he' ? heText : enText),
      [locale]
    );

    // Intersection Observer to detect when card is in viewport
    useEffect(() => {
      if (!cardRef.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInViewport(true);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(cardRef.current);
      return () => observer.disconnect();
    }, []);

    // Animate badges when card enters viewport (skip in compact mode)
    useEffect(() => {
      if (compact || !isInViewport) return;

      const currentYear = new Date().getFullYear();
      const recentYears = [currentYear, currentYear - 1, currentYear - 2];
      const hasOpeningYear = park.openingYear && recentYears.includes(park.openingYear);
      const isClosed = park.closingYear && park.closingYear <= currentYear;
      const isNew = park.createdAt && isNewPark(park.createdAt);
      const isFeatured = park.isFeatured;

      // Determine badge order and positions (order: openingYear -> closed -> new -> featured)
      const badges: Array<{ key: string; delay: number }> = [];
      let baseDelay = 1000;

      if (hasOpeningYear) {
        badges.push({ key: 'openingYear', delay: baseDelay });
        baseDelay += 100;
      }
      if (isClosed) {
        badges.push({ key: 'closed', delay: baseDelay });
        baseDelay += 100;
      }
      if (isNew) {
        badges.push({ key: 'new', delay: baseDelay });
        baseDelay += 100;
      }
      if (isFeatured) {
        badges.push({ key: 'featured', delay: baseDelay });
      }

      // Animate each badge sequentially
      badges.forEach((badge) => {
        setTimeout(() => {
          setShowBadgeContainer((prev) => ({ ...prev, [badge.key]: true }));
          setTimeout(() => {
            setShowBadgeContent((prev) => ({ ...prev, [badge.key]: true }));
          }, 200); // Show content after badge container appears
        }, badge.delay);
      });
    }, [isInViewport, park]);

    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        setIsClicked(true);
        setTimeout(() => {
          window.location.href = `/${locale}/skateparks/${park.slug}`;
        }, 300);
      },
      [park.slug, locale]
    );

    const handleCardKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsClicked(true);
          setTimeout(() => {
            window.location.href = `/${locale}/skateparks/${park.slug}`;
          }, 300);
        }
      },
      [park.slug, locale]
    );

    const photoUrl =
      park.images && park.images.length > 0
        ? park.images.find((img) => img.isFeatured)?.url || park.images[0]?.url
        : park.imageUrl;

    const currentYear = new Date().getFullYear();
    const recentYears = [currentYear, currentYear - 1, currentYear - 2];
    const hasOpeningYear = park.openingYear && recentYears.includes(park.openingYear);
    const isClosed = park.closingYear && park.closingYear <= currentYear;
    const isNew = park.createdAt && isNewPark(park.createdAt);
    const isFeatured = park.isFeatured;

    // Show distance only when location sorting is active
    const isLocationSortingActive =
      sortBy === 'nearest' && userLocation !== null && userLocation !== undefined;
    const distanceText =
      isLocationSortingActive && park.distance !== null && park.distance !== undefined
        ? `${park.distance.toFixed(1)} ${tr('km', 'ק\"מ')}`
        : null;

    return (
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={0}
        role="button"
        className={`h-fit cursor-pointer relative group select-none transform-gpu transition-opacity duration-300 before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 outline-none rounded-2xl ${isClicked ? 'before:animate-shimmerInfinite' : ''} ${compact ? '' : 'opacity-0 animate-popFadeIn'}`}
        style={compact ? undefined : { animationDelay: `${animationDelay}ms` }}
        aria-label={`${name}${distanceText ? `, ${distanceText}` : ''}`}
      >
        {!compact && park.amenities && Object.values(park.amenities).some(Boolean) && (
          <ParkAmenities amenities={park.amenities} locale={locale} />
        )}

        <div
          className={`relative !overflow-hidden rounded-2xl ${
            compact ? 'h-[200px]' : 'h-[12rem] lg:h-[14rem]'
          } shadow-[0_1px_1px_rgba(102,102,102,0.07),0_4px_8px_rgba(94,94,94,0.08),0_8px_16px_rgba(94,94,94,0.06)]`}
        >
          {/* Loading overlay when navigating to park page */}
          {isClicked && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background-dark/75 rounded-2xl">
              <LoadingSpinner variant="header" size={40} />
            </div>
          )}

          {/* Opening Year Badge */}
          {!compact && hasOpeningYear && (
            <div
              className={`absolute bottom-2 left-0 z-10 ${
                showBadgeContainer.openingYear
                  ? 'animate-slideRight animation-delay-[2s]'
                  : 'opacity-0 translate-x-[-30px]'
              }`}
            >
              <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-orange dark:bg-orange-dark text-orange-bg dark:text-orange-bg-dark text-xs md:text-sm font-semibold px-2 md:px-3 py-1 rounded-r-full shadow-lg">
                <span
                  className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`}
                >
                  {park.openingYear}
                </span>
                <Icon
                  name="sparksBold"
                  className={`w-3 h-3 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            </div>
          )}

          {/* Closed Badge */}
          {!compact && isClosed && (
            <div
              className={`absolute bottom-2 z-10 ${hasOpeningYear ? 'right-0' : 'left-0'} ${
                showBadgeContainer.closed
                  ? hasOpeningYear
                    ? 'animate-slideLeft'
                    : 'animate-slideRight'
                  : `opacity-0 ${hasOpeningYear ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
              }`}
            >
              <div
                className={`flex gap-0.5 md:gap-1 justify-center items-center bg-red dark:bg-red-dark text-red-bg dark:text-red-bg-dark px-2 md:px-3 py-1 shadow-lg ${
                  hasOpeningYear ? 'rounded-l-3xl flex-row-reverse' : 'rounded-r-3xl '
                }`}
              >
                <span
                  className={`text-sm md:text-base font-medium transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`}
                >
                  {tr('Permanently Closed', 'נסגר לצמיתות')}
                </span>
                <Icon
                  name="closedPark"
                  className={`w-4 h-4 md:w-5 md:h-5 transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            </div>
          )}

          {/* New Badge */}
          {!compact &&
            isNew &&
            (() => {
              const isOnlyOpeningYear = hasOpeningYear && !isClosed;
              const isClosedBadge = isClosed;

              return (
                <div
                  className={`absolute z-10 ${
                    isClosedBadge
                      ? 'bottom-10 md:bottom-12 left-0'
                      : isOnlyOpeningYear
                        ? 'bottom-2 right-0'
                        : 'bottom-2 left-0'
                  } ${
                    showBadgeContainer.new
                      ? `${isOnlyOpeningYear ? 'animate-slideLeft' : 'animate-slideRight'} ${hasOpeningYear && isClosed ? 'animation-delay-[4s]' : ''}`
                      : `opacity-0 ${isOnlyOpeningYear ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
                  }`}
                >
                  <div
                    className={`flex gap-0.5 md:gap-1 justify-center items-center bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark text-xs md:text-sm px-2 py-1 shadow-lg ${
                      isOnlyOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
                    }`}
                  >
                    <span
                      className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`}
                    >
                      {tr('New', 'חדש')}
                    </span>
                    <Icon
                      name="treesBold"
                      className={`w-3 h-3 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`}
                    />
                  </div>
                </div>
              );
            })()}

          {/* Featured Badge */}
          {!compact && isFeatured && (
            <div
              className={`absolute bottom-2 z-10 ${
                hasOpeningYear || isClosed || isNew ? 'right-0' : 'left-0'
              } ${
                showBadgeContainer.featured
                  ? hasOpeningYear || isClosed || isNew
                    ? 'animate-slideLeft'
                    : 'animate-slideRight'
                  : `opacity-0 ${hasOpeningYear || isClosed || isNew ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
              }`}
            >
              <div
                className={`flex gap-0.5 md:gap-1 justify-center items-center  bg-purple-bg dark:bg-purple-dark text-purple dark:text-purple-bg-dark text-xs md:text-sm font-medium px-2 md:px-3 py-1 shadow-lg ${
                  hasOpeningYear || isClosed || isNew ? 'rounded-l-3xl' : 'rounded-r-3xl'
                }`}
              >
                <span
                  className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`}
                >
                  {tr('Featured', 'מומלץ')}
                </span>
                <Icon
                  name="featured"
                  className={`w-4 h-4 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`}
                />
              </div>
            </div>
          )}

          <SkateparkThumbnail photoUrl={photoUrl} compact={compact} />
        </div>

        {/* Name Section - Always visible below image */}
        <div className="w-full py-2">
          <h3
            className={`text-xl font-semibold truncate text-text dark:text-text-dark ${compact ? '' : 'opacity-0 animate-fadeInDown'}`}
            style={compact ? undefined : { animationDelay: '400ms' }}
          >
            {highlightQuery ? highlightMatch(name, highlightQuery) : name}
          </h3>
          {/* Distance - Always shown below the name if available */}
          {distanceText && (
            <div className="flex items-center gap-1.5 mt-1">
              <Icon
                name="locationBold"
                className="w-3 h-3 shrink-0 text-green dark:text-green-dark"
              />
              <span className="text-xs text-green dark:text-green-dark truncate">{distanceText}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ParkCard.displayName = 'ParkCard';
