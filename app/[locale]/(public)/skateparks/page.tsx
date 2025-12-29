'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  X,
  Sparkles,
  XCircle,
  Badge,
  Award,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import AmenitiesButton from '@/components/common/AmenitiesButton';
import { SearchInput } from '@/components/common/SearchInput';
import ParkCardSkeleton from '@/components/skateparks/ParkCardSkeleton';
import { Icon } from '@/components/icons';
import { useTranslations } from 'next-intl';

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

type ViewMode = 'map' | 'grid';
type SortOption = 'nearest' | 'alphabetical' | 'newest' | 'rating';

/**
 * Load Google Maps script (prevents duplicate loading)
 */
const loadGoogleMapsScript = (locale: string = 'en'): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Helper function to check if Map constructor is ready and resolve
    const checkMapReady = () => {
      const google = (window as any).google;
      if (google?.maps?.Map && typeof google.maps.Map === 'function') {
        resolve();
      } else {
        setTimeout(checkMapReady, 50); // Check again in 50ms
      }
    };

    // Check if Google Maps is already loaded
    if ((window as any).google?.maps) {
      // Even if maps exists, we need to wait for Map constructor with loading=async
      checkMapReady();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for existing script to load, then check for Map constructor
      existingScript.addEventListener('load', () => {
        checkMapReady();
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Load Google Maps script with async/defer attributes
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const language = locale === 'he' ? 'he' : 'en';
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
    
    // Build script URL with optional mapIds parameter and loading=async for best practices
    let scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&language=${language}&loading=async`;
    if (mapId) {
      scriptUrl += `&mapIds=${mapId}`;
    }
    
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // When using loading=async, we need to wait for the API to be fully initialized
      // Use the same checkMapReady function defined above
      checkMapReady();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Google Maps Component (using script tag for simplicity)
 */
function GoogleMapView({
  skateparks,
  userLocation,
  onMarkerClick,
  locale,
}: {
  skateparks: Skatepark[];
  userLocation: UserLocation | null;
  onMarkerClick: (park: Skatepark | null) => void;
  locale: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const scriptLoadedRef = useRef(false);

  // Helper function to create user location pin for AdvancedMarkerElement
  const createUserLocationPin = () => {
    const pinElement = document.createElement('div');
    pinElement.style.width = '16px';
    pinElement.style.height = '16px';
    pinElement.style.borderRadius = '50%';
    pinElement.style.backgroundColor = '#4285F4';
    pinElement.style.border = '2px solid #104413';
    return pinElement;
  };

  // Helper function to create skatepark marker pin
  const createSkateparkPin = (fillColor: string = '#00cc0a', strokeColor: string = '#18671c', circleColor: string = '#18671c') => {
    const pinElement = document.createElement('div');
    pinElement.innerHTML = `
      <svg width="40" height="50" overflow="visible" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0 C9.4 0 0 9.4 0 20 C0 35 20 50 20 50 C20 50 40 35 40 20 C40 9.4 30.6 0 20 0 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
        <circle cx="20" cy="20" r="8" fill="${circleColor}"/>
      </svg>
    `;
    pinElement.style.cursor = 'pointer';
    return pinElement;
  };

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const initMap = async () => {
      try {
        // Load script if not already loaded
        if (!scriptLoadedRef.current) {
          await loadGoogleMapsScript(locale);
          scriptLoadedRef.current = true;
        }

        const google = (window as any).google;
        if (!google?.maps) {
          console.error('Google Maps failed to load');
          return;
        }

        // Double-check Map constructor is available before using it
        if (!google.maps.Map || typeof google.maps.Map !== 'function') {
          console.error('Google Maps Map constructor is not available');
          return;
        }

        const center = userLocation || { lat: 32.0735802, lng: 34.7880511 }; // Default to Jerusalem

        // Check if AdvancedMarkerElement is available (new API)
        const useAdvancedMarkers = google.maps.marker?.AdvancedMarkerElement;

        // Initialize map - mapId is required for AdvancedMarkerElement
        const mapOptions: any = {
          center,
          zoom: userLocation ? 12 : 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          language: locale === 'he' ? 'he' : 'en',
          mode: 'dark',
        };

        // Only add mapId if using AdvancedMarkerElement
        if (useAdvancedMarkers) {
          // Use a generic map ID - in production, you should create your own Map ID in Google Cloud Console
          mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        }
        console.log('Final mapOptions being used:', mapOptions); // <--- ADD THIS LINE

        const map = new google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Track if a marker was clicked
        let markerClicked = false;

        // Prevent clicking on empty map areas - clear selection on map click
        map.addListener('click', () => {
          // Small delay to check if marker click handler fired first
          setTimeout(() => {
            if (!markerClicked) {
              onMarkerClick(null); // Clear selection when clicking empty map area
            }
            markerClicked = false; // Reset flag
          }, 10);
        });

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          if (marker.map) marker.map = null;
        });
        markersRef.current = [];

        // Add park markers with custom pins
        skateparks.forEach((park) => {
          const name = typeof park.name === 'string' ? park.name : park.name.en || park.name.he;
          const position = { lat: park.location.lat, lng: park.location.lng };

          // Determine marker color based on closing year
          const currentYear = new Date().getFullYear();
          const isClosed = park.closingYear && park.closingYear <= currentYear;
          const markerFillColor = isClosed ? '#ef4444' : '#31c438'; // Red for closed parks, green for open
          const markerStrokeColor = isClosed ? '#991b1b' : '#18671c'; // Darker stroke for closed parks
          const markerCircleColor = isClosed ? '#991b1b' : '#18671c'; // Circle color matches stroke
          const fallbackFillColor = isClosed ? '#dc2626' : '#00b881'; // Darker red/green for fallback API
          const fallbackStrokeColor = isClosed ? '#991b1b' : '#104413'; // Darker stroke for closed parks

          let marker: any;

          if (useAdvancedMarkers) {
            // Use new AdvancedMarkerElement API with custom pin
            const pinContent = createSkateparkPin(markerFillColor, markerStrokeColor, markerCircleColor);
            pinContent.setAttribute('data-marker-id', park._id);

            marker = new google.maps.marker.AdvancedMarkerElement({
              map,
              position,
              title: name,
              content: pinContent,
            });
          } else {
            // Fallback to deprecated Marker API with custom icon
            marker = new google.maps.Marker({
              position,
              map,
              title: name,
              icon: {
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: fallbackFillColor,
                fillOpacity: 1,
                strokeColor: fallbackStrokeColor,
                strokeWeight: 2,
              },
            });
          }

          // Add click listener - show bottom panel
          marker.addListener('click', () => {
            markerClicked = true; // Set flag to prevent map click handler from clearing selection
            onMarkerClick(park);
          });

          markersRef.current.push(marker);
        });

        // Add user location marker
        if (userLocation) {
          let userMarker: any;

          if (useAdvancedMarkers) {
            // Use AdvancedMarkerElement for user location
            userMarker = new google.maps.marker.AdvancedMarkerElement({
              map,
              position: userLocation,
              title: 'Your Location',
              content: createUserLocationPin(),
            });
          } else {
            // Fallback to deprecated Marker with custom icon
            userMarker = new google.maps.Marker({
              position: userLocation,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#104413',
                strokeWeight: 2,
              },
              title: 'Your Location',
            });
          }
          markersRef.current.push(userMarker);
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();
  }, [skateparks, userLocation, onMarkerClick, locale]);

  return <div ref={mapRef} className="w-full h-full min-h-[600px]" />;
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
  shade: 'sunBold',
  bathroom: 'toilet',
  guard: 'securityGuard',
  seating: 'couch',
  nearbyRestaurants: 'nearbyResturants',
  scootersAllowed: 'scooter',
  bikesAllowed: 'bmx-icon',
  entryFee: 'shekel',
  helmetRequired: 'helmet',
  bombShelter: 'safe-house',
  noWax: 'Wax',
};

// Amenity labels
const getAmenityLabel = (key: string, locale: string): string => {
  const labels: Record<string, { en: string; he: string }> = {
    parking: { en: 'Parking', he: 'חניה' },
    shade: { en: 'Shade', he: 'צל' },
    bathroom: { en: 'Bathroom', he: 'שירותים' },
    seating: { en: 'Seating', he: 'מקומות ישיבה' },
    nearbyRestaurants: { en: 'Restaurants Nearby', he: 'מסעדות בקרבת מקום' },
    scootersAllowed: { en: 'Scooters Allowed', he: 'קורקינטים מותר' },
    bikesAllowed: { en: 'Bikes Allowed', he: 'אופניים מותר' },
    guard: { en: 'Guard', he: 'שומר' },
    entryFee: { en: 'Entry Fee', he: 'דמי כניסה' },
    helmetRequired: { en: 'Helmet Required', he: 'חובה קסדה' },
    bombShelter: { en: 'Bomb Shelter', he: 'ממ"ד' },
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
          alt={parkName}
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
SkateparkThumbnail.displayName = 'SkateparkThumbnail';

// Memoized amenities component
const ParkAmenities = memo(({ 
  amenities, 
  locale,
  alwaysVisible = false
}: { 
  amenities: Skatepark['amenities'], 
  locale: string,
  alwaysVisible?: boolean
}) => {
  const amenityEntries = Object.entries(amenities)
    .filter(([key, value]) => value && AMENITY_ICON_MAP[key])
    .slice(0, 6); // Limit to 6 amenities

  if (amenityEntries.length === 0) return null;

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

/**
 * Skatepark Card Component
 */
const SkateparkCard = memo(({ park, locale, animationDelay = 0, sortBy, userLocation }: { park: Skatepark; locale: string; animationDelay?: number; sortBy?: SortOption; userLocation?: UserLocation | null }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showNameSection, setShowNameSection] = useState(false);
  const [showParkName, setShowParkName] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [showBadgeContainer, setShowBadgeContainer] = useState<Record<string, boolean>>({});
  const [showBadgeContent, setShowBadgeContent] = useState<Record<string, boolean>>({});
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const name = typeof park.name === 'string' 
    ? park.name 
    : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
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

  // Show name section after 0.3s delay when card appears
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNameSection(true);
      // Show park name with pop animation after height starts growing
      setTimeout(() => {
        setShowParkName(true);
      }, 0); // Small delay to let height transition start
    }, 300 + animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Animate badges when card enters viewport
  useEffect(() => {
    if (!isInViewport) return;

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

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);
    setTimeout(() => {
      window.location.href = `/${locale}/skateparks/${park.slug}`;
    }, 300);
  }, [park.slug, locale]);

  const photoUrl = park.images && park.images.length > 0 
    ? park.images.find(img => img.isFeatured)?.url || park.images[0]?.url 
    : park.imageUrl;

  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2];
  const hasOpeningYear = park.openingYear && recentYears.includes(park.openingYear);
  const isClosed = park.closingYear && park.closingYear <= currentYear;
  const isNew = park.createdAt && isNewPark(park.createdAt);
  const isFeatured = park.isFeatured;

  // Show distance only when location sorting is active
  const isLocationSortingActive = sortBy === 'nearest' && userLocation !== null && userLocation !== undefined;
  const distanceText = isLocationSortingActive && park.distance !== null && park.distance !== undefined
    ? `${park.distance.toFixed(1)} ${tr('km', 'ק\"מ')}`
    : null;

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={`h-fit shadow-lg shadow-[rgba(0,0,0,0.05)] hover:shadow-lg dark:hover:!scale-[1.02]  bg-card dark:bg-card-dark rounded-xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''} `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={name}
    >
      {park.amenities && Object.values(park.amenities).some(Boolean) && (
        <ParkAmenities amenities={park.amenities} locale={locale} />
      )}

      <div className="relative h-[10.5rem] overflow-hidden">
        {/* Opening Year Badge */}
        {hasOpeningYear && (
          <div className={`absolute bottom-2 left-0 z-10 ${
            showBadgeContainer.openingYear ? 'animate-slideRight animation-delay-[2s]' : 'opacity-0 translate-x-[-30px]'
          }`}>
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-yellow-400 dark:bg-yellow-500 text-black text-xs md:text-sm font-semibold ps-1 md:ps-3 pe-1 md:pe-2 py-1 rounded-r-full shadow-lg">
              <span className={`text-[0.5rem] md:text-sm transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`}>
                {park.openingYear}
              </span>
              <Icon name="sparksBold" className={`w-2 h-2 md:w-3 md:h-3 transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        {/* Closed Badge */}
        {isClosed && (
          <div className={`absolute bottom-2 z-10 ${
            hasOpeningYear ? 'right-0' : 'left-0'
          } ${
            showBadgeContainer.closed 
              ? (hasOpeningYear ? 'animate-slideLeft' : 'animate-slideRight')
              : `opacity-0 ${hasOpeningYear ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
          }`}>
            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-error dark:bg-error-dark text-white text-xs ps-1 md:ps-3 pe-1 md:pe-2 py-1 shadow-lg ${
              hasOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
            }`}>
              <span className={`text-[0.5rem] md:text-sm transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`}>
                {tr('Permanently Closed', 'נסגר לצמיתות')}
              </span>
              <Icon name="closedPark" className={`w-2 h-2 md:w-3 md:h-3 transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        {/* New Badge */}
        {isNew && (
          <div className={`absolute bottom-2 z-10 ${
            hasOpeningYear || isClosed ? 'right-0' : 'left-0'
          } ${
            showBadgeContainer.new 
              ? ((hasOpeningYear || isClosed) ? 'animate-slideLeft' : 'animate-slideRight')
              : `opacity-0 ${(hasOpeningYear || isClosed) ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
          }`}>
            <div className={`flex rtl:flex-row-reverse gap-0.5 md:gap-1 justify-center items-center bg-blue-500 dark:bg-blue-600 text-white text-xs md:text-sm pe-1 md:pe-3 ps-1 md:ps-2 py-1 shadow-lg ${
              hasOpeningYear || isClosed ? 'rounded-l-3xl' : 'rounded-r-3xl'
            }`}>
              <span className={`text-[0.5rem] md:text-sm transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`}>
                {tr('New', 'חדש')}
              </span>
              <Icon name="trees" className={`w-2 h-2 md:w-3 md:h-3 transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        {/* Featured Badge */}
        {isFeatured && (
          <div className={`absolute bottom-2 z-10 ${
            hasOpeningYear || isClosed || isNew ? 'right-0' : 'left-0'
          } ${
            showBadgeContainer.featured 
              ? ((hasOpeningYear || isClosed || isNew) ? 'animate-slideLeft' : 'animate-slideRight')
              : `opacity-0 ${(hasOpeningYear || isClosed || isNew) ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
          }`}>
            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-brand-dark text-black text-xs md:text-sm font-bold px-1 md:px-2 py-1 shadow-lg ${
              hasOpeningYear || isClosed || isNew ? 'rounded-l-3xl' : 'rounded-r-3xl'
            }`}>
              <span className={`text-[0.5rem] md:text-sm transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`}>
                {tr('Featured', 'מומלץ')}
              </span>
              <Icon name="featured" className={`w-2 h-2 md:w-3 md:h-3 transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        <SkateparkThumbnail
          photoUrl={photoUrl}
          parkName={name}
        />

        {/* Hover Overlay - Only on non-touch devices */}
        {!isTouchDevice && (
          <div className={`absolute -bottom-1 z-20 pointer-events-none ${
            locale === 'he' ? 'right-0' : 'left-0'
          }`}>
            {/* Distance Overlay - Behind park name */}
            {distanceText && (
              <div 
                className={`border border-transparent dark:border-[#686868] max-w-[110%] min-w-[105px] absolute bottom-[calc(60%+0.5rem)] bg-card dark:bg-card-dark px-3 py-2 shadow-[-2px_1px_12px_3px_rgba(0,0,0,0.15)] ${
                  locale === 'he'
                    ? 'rounded-l-lg opacity-0 group-hover:opacity-100 translate-x-[8%] translate-y-[54%] rotate-[-2deg] group-hover:translate-x-[5%] group-hover:translate-y-[5%] group-hover:rotate-[1deg]'
                    : 'rounded-r-xl opacity-0 group-hover:opacity-100 translate-x-[-8%] translate-y-[54%] rotate-[2deg] group-hover:translate-x-[-5%] group-hover:translate-y-[5%] group-hover:rotate-[-1deg]'
                } transition-[opacity,transform] duration-[200ms,500ms] ease-[cubic-bezier(0.76,0,0.24,1),cubic-bezier(0.76,0,0.24,1)] [transition-delay:0ms,0ms] group-hover:[transition-delay:200ms,0ms]`}
              >
                <div className="flex items-center gap-1.5 text-text dark:text-text-dark text-xs">
                  <Icon name="locationBold" className="w-3 h-3 shrink-0" />
                  <span>{distanceText}</span>
                </div>
              </div>
            )}
            
            {/* Park Name Overlay - In front */}
            <div className={`relative border border-transparent dark:border-[#686868] bg-card dark:bg-card-dark px-3 pt-2 pb-3 shadow-[-2px_1px_8px_3px_rgba(0,0,0,0.2)]   ${
              locale === 'he'
                ? 'rounded-tl-lg opacity-0 group-hover:opacity-100 translate-x-[36%] translate-y-[22%] rotate-[-1deg] group-hover:translate-x-[3%] group-hover:translate-y-[3%] group-hover:rotate-[2deg]'
                : 'rounded-tr-xl opacity-0 group-hover:opacity-100 translate-x-[-6%] translate-y-[12%] rotate-[1deg] group-hover:translate-x-[-3%] group-hover:translate-y-[3%] group-hover:rotate-[-2deg]'
            } transition-[opacity,transform] duration-[200ms,300ms] ease-[cubic-bezier(0.76,0,0.24,1),cubic-bezier(0.76,0,0.24,1)]`}>
              <h3 className="text-sm font-semibold text-text dark:text-text-dark ">
                {name}
              </h3>
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
            className={`text-sm font-semibold truncate ${showParkName ? 'animate-fadeInDown animation-delay-[1s]' : 'opacity-0'}`}
          >
            {name}
          </h3>
          {distanceText && (
            <div className="opacity-0 animate-fadeInDown animation-delay-[4s] flex items-center justify-between">
              <div className="flex items-center text-gray-600 dark:text-gray-400 gap-2">
                <Icon name="locationBold" className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate">
                  {distanceText}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
SkateparkCard.displayName = 'SkateparkCard';

/**
 * Main Skateparks Page
 */
export default function SkateparksPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const t = useTranslations('skateparks');

  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  const AMENITY_OPTIONS = [
    { key: 'parking', label: tr('Parking', 'חניה'), iconName: 'parking' },
    { key: 'shade', label: tr('Shade', 'צל'), iconName: 'umbrella' },
    { key: 'bathroom', label: tr('Bathroom', 'שירותים'), iconName: 'toilet' },
    { key: 'seating', label: tr('Seating', 'מקומות ישיבה'), iconName: 'couch' },
    { key: 'nearbyRestaurants', label: tr('Restaurants Nearby', 'מסעדות בקרבת מקום'), iconName: 'nearbyResturants' },
    { key: 'scootersAllowed', label: tr('Scooters Allowed', 'קורקינטים מותר'), iconName: 'scooter' },
    { key: 'bikesAllowed', label: tr('Bikes Allowed', 'אופניים מותר'), iconName: 'bmx-icon' },
    { key: 'entryFee', label: tr('Entry Fee', 'דמי כניסה'), iconName: 'shekel' },
    { key: 'helmetRequired', label: tr('Helmet Required', 'חובה קסדה'), iconName: 'helmet' },
    { key: 'bombShelter', label: tr('Bomb Shelter', 'ממ"ד'), iconName: 'safe-house' },
    { key: 'noWax', label: tr('No Wax', 'ללא שעווה'), iconName: 'Wax' },
    { key: 'guard', label: tr('Guard', 'שומר'), iconName: 'securityGuard' },
  ];

  const [allSkateparks, setAllSkateparks] = useState<Skatepark[]>([]); // All fetched skateparks (no filters)
  const [skateparks, setSkateparks] = useState<Skatepark[]>([]); // Filtered and sorted skateparks for display
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [areaFilter, setAreaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedPark, setSelectedPark] = useState<Skatepark | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [animatingIcons, setAnimatingIcons] = useState<Set<string>>(new Set());
  const [shouldAnimateLocation, setShouldAnimateLocation] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const prevSelectedAmenitiesRef = useRef<string[]>([]);
  const prevUserLocationRef = useRef<UserLocation | null>(null);
  const prevScrollYRef = useRef(0);

  // Track newly added amenities for pop animation
  useEffect(() => {
    const prev = prevSelectedAmenitiesRef.current;
    const current = selectedAmenities;

    // Find newly added amenities
    const newlyAdded = current.filter(amenity => !prev.includes(amenity));

    if (newlyAdded.length > 0) {
      // Add animation to newly added icons
      setAnimatingIcons(new Set(newlyAdded));

      // Remove animation after animation completes (0.5s based on tailwind config)
      const timeoutId = setTimeout(() => {
        setAnimatingIcons(new Set());
      }, 500);

      // Update ref for next comparison
      prevSelectedAmenitiesRef.current = current;

      return () => clearTimeout(timeoutId);
    } else {
      // Update ref even if no new items
      prevSelectedAmenitiesRef.current = current;
    }
  }, [selectedAmenities]);

  // Track when location icon is first added
  useEffect(() => {
    const prevLocation = prevUserLocationRef.current;
    const currentLocation = userLocation;

    // If location was just enabled (was null, now has value)
    if (!prevLocation && currentLocation && sortBy === 'nearest') {
      setShouldAnimateLocation(true);
      const timeoutId = setTimeout(() => {
        setShouldAnimateLocation(false);
      }, 500);

      prevUserLocationRef.current = currentLocation;
      return () => clearTimeout(timeoutId);
    } else {
      prevUserLocationRef.current = currentLocation;
    }
  }, [userLocation, sortBy]);

  // Track scroll position for sticky header and header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const prevScrollY = prevScrollYRef.current;

      // Determine header visibility (matches HeaderNav/MobileNav logic)
      if (currentScrollY < prevScrollY || currentScrollY < 10) {
        // Scrolling up or at top - show header
        setIsHeaderVisible(true);
      } else if (currentScrollY > prevScrollY) {
        // Scrolling down - hide header
        setIsHeaderVisible(false);
      }

      prevScrollYRef.current = currentScrollY;
      setIsScrolled(currentScrollY > 260);
    };

    // Set initial scroll position
    const initialScrollY = window.scrollY;
    prevScrollYRef.current = initialScrollY;
    setIsHeaderVisible(initialScrollY < 10);
    setIsScrolled(initialScrollY > 200);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reverse geocode coordinates to get city name
  const getCityFromCoordinates = useCallback(async (lat: number, lng: number) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not found');
        return null;
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=${locale}`
      );

      if (!response.ok) {
        console.error('Reverse geocoding failed');
        return null;
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Find city name from address components
        for (const result of data.results) {
          const addressComponents = result.address_components;
          for (const component of addressComponents) {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_1')) {
              return component.long_name;
            }
          }
        }

        // Fallback: use first result's formatted address
        if (data.results[0]?.formatted_address) {
          const parts = data.results[0].formatted_address.split(',');
          return parts[0]?.trim() || null;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting city name:', error);
      return null;
    }
  }, [locale]);

  // Request location permission or toggle it off
  const requestLocation = useCallback(async () => {
    // If location is already enabled, disable it
    if (userLocation) {
      setUserLocation(null);
      setUserCity(null);
      // Only reset sort if it was set to nearest
      if (sortBy === 'nearest') {
        setSortBy('newest');
      }
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setSortBy('nearest');

        // Get city name from coordinates
        const city = await getCityFromCoordinates(location.lat, location.lng);
        if (city) {
          setUserCity(city);
        }
      },
      () => {
        alert('Location access denied. You can still browse skateparks.');
      }
    );
  }, [getCityFromCoordinates, userLocation, sortBy]);

  // Fetch all skateparks once on mount (no filters, no pagination)
  const fetchAllSkateparks = useCallback(async () => {
    const cacheKey = 'skateparks_cache';
    const versionKey = 'skateparks_version';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedVersion = localStorage.getItem(versionKey);

    // If cache exists, use it immediately without fetching
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        // Normalize location format in cached data (handle both old and new formats)
        const normalizedCachedData = (parsedData || []).map((park: any) => {
          let location = park.location;

          // Convert from { type: 'Point', coordinates: [lng, lat] } to { lat, lng }
          if (location?.coordinates && Array.isArray(location.coordinates)) {
            const [lng, lat] = location.coordinates;
            location = { lat, lng };
          }
          // If already in { lat, lng } format, keep it as is

          return {
            ...park,
            location,
          };
        });

        setAllSkateparks(normalizedCachedData);
        setLoading(false);

        // Check version asynchronously after using cache
        // If version doesn't match, refetch and update both cache and version
        if (cachedVersion) {
          // Check version in background (fire and forget)
          (async () => {
            try {
              // Fetch only version (lightweight request)
              const versionResponse = await fetch('/api/skateparks?versionOnly=true');
              if (versionResponse.ok) {
                const versionData = await versionResponse.json();
                const currentVersion = versionData.version || 1;
                const storedVersion = parseInt(cachedVersion);

                // If versions don't match, refetch skateparks data and update both cache and version
                if (storedVersion !== currentVersion) {
                  const response = await fetch('/api/skateparks');
                  if (response.ok) {
                    const data = await response.json();
                    const newVersion = data.version || 1;

                    // Convert location format from API (coordinates array) to expected format (lat/lng object)
                    const normalizedSkateparks = (data.skateparks || []).map((park: any) => {
                      let location = park.location;

                      // Convert from { type: 'Point', coordinates: [lng, lat] } to { lat, lng }
                      if (location?.coordinates && Array.isArray(location.coordinates)) {
                        const [lng, lat] = location.coordinates;
                        location = { lat, lng };
                      }
                      // If already in { lat, lng } format, keep it as is

                      return {
                        ...park,
                        location,
                      };
                    });

                    // Update both cache and version in localStorage (store normalized format)
                    localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
                    localStorage.setItem(versionKey, newVersion.toString());

                    // Update state with new data
                    setAllSkateparks(normalizedSkateparks);
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to check version', e);
              // Continue with cached data if version check fails
            }
          })();
        }

        return; // Exit early since we used cache
      } catch (e) {
        // If cache is corrupted, continue to fetch fresh data
        console.warn('Failed to parse cached skateparks data', e);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(versionKey);
      }
    }

    // No cache exists or cache was corrupted, fetch fresh data and store both cache and version
    setLoading(true);
    try {
      const response = await fetch('/api/skateparks');
      if (!response.ok) throw new Error('Failed to fetch skateparks');

      const data = await response.json();
      const currentVersion = data.version || 1;

      // Convert location format from API (coordinates array) to expected format (lat/lng object)
      const normalizedSkateparks = (data.skateparks || []).map((park: any) => {
        let location = park.location;

        // Convert from { type: 'Point', coordinates: [lng, lat] } to { lat, lng }
        if (location?.coordinates && Array.isArray(location.coordinates)) {
          const [lng, lat] = location.coordinates;
          location = { lat, lng };
        }
        // If already in { lat, lng } format, keep it as is

        return {
          ...park,
          location,
        };
      });

      // Use fresh data
      setAllSkateparks(normalizedSkateparks);

      // Store both cache and version in localStorage (store normalized format)
      localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
      localStorage.setItem(versionKey, currentVersion.toString());
    } catch (error) {
      console.error('Error fetching skateparks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Normalize text for search (handles apostrophes, diacritics, and whitespace)
  const normalizeSearchText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Remove/normalize apostrophes (both regular ' and curly apostrophes ')
      .replace(/[''']/g, '')
      // Normalize whitespace (multiple spaces to single space)
      .replace(/\s+/g, ' ')
      // Remove diacritics for better matching (e.g., é -> e, ü -> u)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }, []);

  // Client-side filtering function
  const filterSkateparks = useCallback((parks: Skatepark[]): Skatepark[] => {
    let filtered = [...parks];

    // Area filter
    if (areaFilter) {
      filtered = filtered.filter((park) => park.area === areaFilter);
    }

    // Search filter (text search in name only - both English and Hebrew)
    if (searchQuery.trim()) {
      const normalizedQuery = normalizeSearchText(searchQuery);
      filtered = filtered.filter((park) => {
        let nameEn = '';
        let nameHe = '';

        if (typeof park.name === 'string') {
          nameEn = park.name;
          nameHe = park.name;
        } else {
          nameEn = park.name.en || '';
          nameHe = park.name.he || '';
        }

        // Normalize both names before comparing
        const normalizedNameEn = normalizeSearchText(nameEn);
        const normalizedNameHe = normalizeSearchText(nameHe);

        return (
          normalizedNameEn.includes(normalizedQuery) ||
          normalizedNameHe.includes(normalizedQuery)
        );
      });
    }

    // Amenities filter
    if (selectedAmenities.length > 0) {
      filtered = filtered.filter((park) => {
        return selectedAmenities.every((amenity) => {
          return park.amenities[amenity as keyof typeof park.amenities] === true;
        });
      });
    }

    // Open now filter (check is24Hours)
    if (openNowOnly) {
      filtered = filtered.filter((park) => park.is24Hours === true);
    }

    return filtered;
  }, [areaFilter, searchQuery, selectedAmenities, openNowOnly, locale, normalizeSearchText]);

  // Client-side sorting function
  const sortSkateparks = useCallback((parks: Skatepark[], sortOption: SortOption): Skatepark[] => {
    const sorted = [...parks];

    switch (sortOption) {
      case 'nearest':
        return sorted.sort((a, b) => {
          if (a.distance === null || a.distance === undefined) return 1;
          if (b.distance === null || b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
      case 'alphabetical':
        return sorted.sort((a, b) => {
          const nameA = typeof a.name === 'string' ? a.name : a.name.en || '';
          const nameB = typeof b.name === 'string' ? b.name : b.name.en || '';
          return nameA.localeCompare(nameB);
        });
      case 'rating':
        return sorted.sort((a, b) => {
          if (a.rating !== b.rating) return b.rating - a.rating;
          return (b.totalReviews || 0) - (a.totalReviews || 0);
        });
      case 'newest':
      default:
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
    }
  }, []);

  // Filter, calculate distances, and sort skateparks when filters or sort changes
  useEffect(() => {
    let filtered = filterSkateparks(allSkateparks);

    // Calculate distances if userLocation is available
    if (userLocation) {
      filtered = filtered.map((park) => ({
        ...park,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          park.location.lat,
          park.location.lng
        ),
      }));
    } else {
      // Remove distances when location is disabled
      filtered = filtered.map((park) => ({
        ...park,
        distance: null,
      }));
    }

    const sorted = sortSkateparks(filtered, sortBy);
    setSkateparks(sorted);
  }, [allSkateparks, areaFilter, searchQuery, selectedAmenities, openNowOnly, sortBy, userLocation, filterSkateparks, sortSkateparks, calculateDistance]);

  // Fetch all skateparks once on mount
  useEffect(() => {
    fetchAllSkateparks();
  }, [fetchAllSkateparks]);

  // Reset card position when selected park changes
  useEffect(() => {
    if (selectedPark && mapContainerRef.current) {
      // Calculate initial position (bottom left)
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const cardHeight = 200; // Approximate height
      setCardPosition({
        x: 16, // 16px from left edge
        y: mapRect.height - cardHeight - 96, // 16px from bottom
      });
    } else {
      setCardPosition(null);
    }
  }, [selectedPark]);

  // Drag handlers for park card - only from drag handle button
  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    if (cardRef.current) {
      const cardRect = cardRef.current.getBoundingClientRect();

      // Calculate offset from mouse to card top-left
      const offsetX = e.clientX - cardRect.left;
      const offsetY = e.clientY - cardRect.top;
      setDragOffset({ x: offsetX, y: offsetY });
    }
  }, []);

  // Global mouse move handler for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current || !mapContainerRef.current) return;

      const mapRect = mapContainerRef.current.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();

      // Calculate new position relative to map container
      let newX = e.clientX - mapRect.left - dragOffset.x;
      let newY = e.clientY - mapRect.top - dragOffset.y;

      // Constrain to map bounds
      const minX = 0;
      const minY = 0;
      const maxX = mapRect.width - cardRect.width;
      const maxY = mapRect.height - cardRect.height;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      setCardPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setWasDragging(true);
      // Clear wasDragging flag after a short delay to prevent accidental navigation
      setTimeout(() => {
        setWasDragging(false);
      }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const clearFilters = () => {
    setAreaFilter('');
    setSearchQuery('');
    setSelectedAmenities([]);
    setOpenNowOnly(false);
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" dir={locale === 'he' ? 'rtl' : 'ltr'}>

      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div className="relative pt-14   bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Find Your Park', 'מצא את הבית שלך')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Where wheels meet concrete, community happens.',
                'פה הגלגלים והחברים נפגשים.'
              )}
            </p>

            {/* Stats Bar */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-main animate-pulse" />
                <span className="text-gray-600 dark:text-gray-400">
                  {allSkateparks.length} {tr('Parks', 'פארקים')}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {tr('Community Reviews', 'ביקורות קהילה')}
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
            <div className="flex items-center gap-0 xsm:gap-1">
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
                      variant={userLocation ? "brandIcon" : "none"}
                      size="sm"
                      onClick={requestLocation}
                      className=''
                      aria-label={tr('Use My Location', 'השתמש במיקומי')}
                    >
                      <Icon 
                        name={userLocation ? "locationOffBold" : "locationBold"}
                        className="w-5 h-5"
                      />
                    </Button>
                  </TooltipTrigger> 
                  <TooltipContent side="bottom" className="text-center">
                    {tr('Use My Location', 'השתמש במיקומי')}
                  </TooltipContent>
                </Tooltip>

                {/* View Toggle - Enhanced Animation */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Button
                        variant={viewMode === 'map' ? "warningIcon" : "none"}
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
                        className=''
                        aria-label={viewMode === 'grid' ? tr('Map View', 'תצוגת מפה') : tr('Grid View', 'תצוגת רשת')}
                      >
                        {viewMode === 'grid' ? (
                          <Icon name="mapBold" className="w-5 h-5" />
                        ) : (
                          <Icon name="categoryBold" className="w-5 h-5" />
                        )}
                      </Button>

                      {/* Pulsing indicator when map is active */}
                      {viewMode === 'grid' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-main dark:bg-brand-dark opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-main dark:bg-brand-dark"></span>
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-center">
                    {viewMode === 'grid' ? tr('Map View', 'תצוגת מפה') : tr('Grid View', 'תצוגת רשת')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* ========================================
              ACTIVE FILTERS STATUS - Improved Layout
          ======================================== */}
          {(() => {
            const hasAreaFilter = !!areaFilter;
            const hasAmenitiesFilter = selectedAmenities.length > 0;
            const hasOpenNowFilter = openNowOnly;
            const hasSearchQuery = !!searchQuery.trim();
            const activeFiltersCount = (hasAreaFilter ? 1 : 0) + (hasAmenitiesFilter ? 1 : 0) + (hasOpenNowFilter ? 1 : 0) + (hasSearchQuery ? 1 : 0);
            const hasAnyFilter = activeFiltersCount > 0;
            const hasLocationSorting = userLocation && sortBy === 'nearest';
            const showStatus = hasAnyFilter || hasLocationSorting;

            if (!showStatus) return null;

            return (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Results Count Badge */}
                  {hasAnyFilter && !loading && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-main/10 to-green-500/10 dark:from-brand-main/20 dark:to-green-500/20 rounded-full border border-brand-main/20 dark:border-brand-main/30">
                      <Icon name="mapBold" className="w-4 h-4 text-brand-main" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {skateparks.length}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tr('of', 'מתוך')} {allSkateparks.length}
                      </span>
                    </div>
                  )}

                  {/* Search Query Badge */}
                  {hasSearchQuery && (
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

                  {/* Area Filter Badge */}
                  {hasAreaFilter && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-full border border-purple-200 dark:border-purple-800">
                      <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t(`search.area.${areaFilter}`)}
                      </span>
                      <button
                        onClick={() => setAreaFilter('')}
                        className="p-0.5 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  )}

                  {/* Amenities Badges */}
                  {selectedAmenities.map((amenity) => {
                    const amenityOption = AMENITY_OPTIONS.find(a => a.key === amenity);
                    const iconName = amenityOption?.iconName;
                    const shouldAnimate = animatingIcons.has(amenity);

                    return (
                      <div
                        key={amenity}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 rounded-full border border-teal-200 dark:border-teal-800 ${
                          shouldAnimate ? 'animate-pop' : ''
                        }`}
                      >
                        {iconName && (
                          <Icon
                            name={iconName as any}
                            className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400"
                          />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {amenityOption?.label}
                        </span>
                        <button
                          onClick={() => setSelectedAmenities(prev => prev.filter(a => a !== amenity))}
                          className="p-0.5 hover:bg-teal-100 dark:hover:bg-teal-800 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Location Sorting Badge */}
                  {hasLocationSorting && (
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-brand-main/10 to-brand-main/20 dark:from-brand-main/20 dark:to-brand-main/30 rounded-full border border-brand-main/30 ${
                      shouldAnimateLocation ? 'animate-pop' : ''
                    }`}>
                      <Icon
                        name="locationBold"
                        className="w-3.5 h-3.5 text-brand-main"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      {tr('Clear All', 'נקה הכל')}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT AREA
      ======================================== */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ParkCardSkeleton key={i} />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          /* MAP VIEW */
          <div className="relative h-[calc(100vh-280px)] min-h-[600px]" ref={mapContainerRef}>
            <div className="h-full rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-xl">
              <GoogleMapView
                skateparks={skateparks}
                userLocation={userLocation}
                onMarkerClick={setSelectedPark}
                locale={locale}
              />
            </div>

            {/* Map Controls Overlay - Top Right */}
            <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
              {/* Parks Count Badge */}
              <div className="px-4 py-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-full shadow-lg border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {skateparks.length} {tr('parks shown', 'פארקים מוצגים')}
                </span>
              </div>
            </div>

            {/* Selected Park Detail Panel - Bottom */}
            {selectedPark && !(userLocation && sortBy === 'nearest') && (() => {
              const name = typeof selectedPark.name === 'string' 
                ? selectedPark.name 
                : (locale === 'he' ? selectedPark.name.he : selectedPark.name.en) || selectedPark.name.en || selectedPark.name.he;

              const photoUrl = selectedPark.images && selectedPark.images.length > 0 
                ? selectedPark.images.find(img => img.isFeatured)?.url || selectedPark.images[0]?.url 
                : selectedPark.imageUrl;

              const currentYear = new Date().getFullYear();
              const recentYears = [currentYear, currentYear - 1, currentYear - 2];
              const hasOpeningYear = selectedPark.openingYear && recentYears.includes(selectedPark.openingYear);
              const isClosed = selectedPark.closingYear && selectedPark.closingYear <= currentYear;
              const isNew = selectedPark.createdAt && isNewPark(selectedPark.createdAt);
              const isFeatured = selectedPark.isFeatured;

              const distanceText = selectedPark.distance !== null && selectedPark.distance !== undefined
                ? `(${selectedPark.distance.toFixed(1)} ${tr('km', 'ק\"מ')})`
                : null;

              const areaLabels: Record<'north' | 'center' | 'south', { en: string; he: string }> = {
                north: { en: 'North', he: 'צפון' },
                center: { en: 'Center', he: 'מרכז' },
                south: { en: 'South', he: 'דרום' },
              };
              const areaLabel = locale === 'he' ? areaLabels[selectedPark.area]?.he : areaLabels[selectedPark.area]?.en || selectedPark.area;

              // Use cardPosition if available, otherwise don't render yet (will be set by useEffect)
              if (!cardPosition) {
                return null;
              }

              return (
                <div
                  ref={cardRef}
                  className="absolute w-[calc(100%-2rem)] max-w-[20rem] z-40 bg-card dark:bg-card-dark rounded-3xl border-2 border-card dark:border-card-dark overflow-hidden"
                  style={{
                    left: `${cardPosition.x}px`,
                    top: `${cardPosition.y}px`,
                    transform: 'none',
                    userSelect: isDragging ? 'none' : 'auto',
                  }}
                >
                  <div className={`h-fit relative group select-none transform-gpu shadow-2xl ${isDragging ? 'opacity-90' : ''}`}>
                    {/* Close Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPark(null);
                      }}
                      className="absolute top-3 right-3 z-30 p-2 rounded-full bg-sidebar dark:bg-sidebar-dark backdrop-blur-sm shadow-lg hover:bg-card dark:hover:bg-card-dark transition-colors duration-200"
                      aria-label={tr('Close', 'סגור')}
                    >
                      <X className="w-4 h-4 text-sidebar-text dark:text-sidebar-text-dark" />
                    </button>

                    <Link 
                      href={`/${locale}/skateparks/${selectedPark.slug}`}
                      className="block"
                      onClick={(e) => {
                        // Don't navigate if dragging or just finished dragging
                        if (isDragging || wasDragging) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {selectedPark.amenities && Object.values(selectedPark.amenities).some(Boolean) && (
                        <ParkAmenities amenities={selectedPark.amenities} locale={locale} alwaysVisible={true} />
                      )}

                      <div className="relative bg-black/25 h-[10.5rem] overflow-hidden">
                        {/* Opening Year Badge */}
                        {hasOpeningYear && (
                          <div className="absolute bottom-2 left-0 z-10">
                            <div className="flex gap-1 justify-center items-center bg-yellow-400 dark:bg-yellow-500 text-black text-xs md:text-sm font-semibold px-2 py-1 rounded-end-full shadow-lg animate-pop">
                              {selectedPark.openingYear}
                              <Icon name="sparksBold" className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        {/* Closed Badge */}
                        {isClosed && (
                          <div className={`absolute bottom-2 z-10 ${
                            hasOpeningYear ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-1 justify-center items-center bg-red-500 dark:bg-red-600 text-white text-xs px-2 py-1 shadow-lg ${
                              hasOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              {tr('Closed', 'סגור')}
                              <Icon name="close" className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        {/* New Badge */}
                        {isNew && (
                          <div className={`absolute bottom-2 z-10 ${
                            hasOpeningYear || isClosed ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-1 justify-center items-center bg-blue-500 dark:bg-blue-600 text-white text-xs md:text-sm px-2 py-1 shadow-lg ${
                              hasOpeningYear || isClosed ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              {tr('New', 'חדש')}
                              <Badge className="w-4 h-4" />
                            </div>
                          </div>
                        )}

                        {/* Featured Badge */}
                        {isFeatured && (
                          <div className={`absolute bottom-2 z-10 ${
                            hasOpeningYear || isClosed || isNew ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-1 justify-center items-center bg-yellow-400 dark:bg-yellow-500 text-black text-xs font-bold px-2 py-1 shadow-lg ${
                              hasOpeningYear || isClosed || isNew ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              {tr('Featured', 'מומלץ')}
                              <Award className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        <SkateparkThumbnail
                          photoUrl={photoUrl}
                          parkName={name}
                          alwaysSaturated={true}
                        />
                      </div>

                      <div className="px-4 py-3 space-y-1">
                        <h3 className="text-sm font-semibold truncate">
                          {name}
                        </h3>
                      </div>
                    </Link>

                    {/* Drag Handle Button - Next to Location Info */}
                    <div className="absolute bottom-2 end-2 z-30 flex items-center gap-2">
                      <button
                        onMouseDown={handleDragHandleMouseDown}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="flex items-center justify-center p-1.5 rounded-ful transition-colors cursor-move"
                        aria-label={tr('Drag to move card', 'גרור כדי להזיז את הכרטיס')}
                        title={tr('Drag to move card', 'גרור כדי להזיז את הכרטיס')}
                      >
                        <Icon name="dragBold" className="w-5 h-5 overflow-visible navMdShadow"  />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* GRID VIEW */
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-3">
              {skateparks.map((park, index) => (
                <SkateparkCard 
                  key={park._id} 
                  park={park} 
                  locale={locale} 
                  animationDelay={index * 50}
                  sortBy={sortBy}
                  userLocation={userLocation}
                />
              ))}
            </div>

            {/* Empty State */}
            {skateparks.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-main/10 to-green-500/10 dark:from-brand-main/20 dark:to-green-500/20 mb-4">
                  <Icon name="searchQuest" className="w-8 h-8 text-brand-main" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {searchQuery 
                    ? tr('No parks match your search', 'לא נמצאו פארקים') 
                    : tr('No parks found', 'לא נמצאו פארקים')
                  }
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {tr('Try adjusting your filters or search terms', 'נסה לשנות את הפילטרים או החיפוש')}
                </p>
                {(searchQuery || selectedAmenities.length > 0 || areaFilter) && (
                  <Button variant="brand" onClick={clearFilters}>
                    {tr('Clear All Filters', 'נקה את כל הפילטרים')}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
