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
    const region = locale === 'he' ? 'IL' : undefined;
    
    // Build script URL with loading=async for best practices
    const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=${language}${region ? `&region=${region}` : ''}&loading=async`;
    
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
  hasAmenitiesFilter,
}: {
  skateparks: Skatepark[];
  userLocation: UserLocation | null;
  onMarkerClick: (park: Skatepark | null) => void;
  locale: string;
  hasAmenitiesFilter?: boolean;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const scriptLoadedRef = useRef(false);
  const themeCleanupRef = useRef<(() => void) | null>(null);
  const zoomListenerRef = useRef<any>(null);

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

        // Helper function to create custom icon for skatepark marker
        const createSkateparkIcon = (fillColor: string, strokeColor: string, circleColor: string) => {
          const svg = `
            <svg width="44" height="48" viewBox="0 0 44 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 6c9 0 16 6 16 14 0 5-2.5 9-6 12-2.5 2-6 6-7.5 9-.5 1.5-2.5 1.5-3 0-1.5-3-5-7-7.5-9-3.5-3-6-7-6-12 0-8 7-14 16-14z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2"/>
              <circle cx="23" cy="20.5" r="5.5" fill="${circleColor}"/>
            </svg>
          `;
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(40, 50),
            anchor: new google.maps.Point(20, 50),
          };
        };

        // Get theme from localStorage (matches app theme system)
        const getCurrentTheme = (): 'light' | 'dark' => {
          if (typeof window === 'undefined') return 'light';
          
          // Check localStorage first
          const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
          if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
          }
          
          // Fallback to checking document class
          const hasDarkClass = document.documentElement.classList.contains('dark');
          return hasDarkClass ? 'dark' : 'light';
        };

        const currentTheme = getCurrentTheme();

        // Dark theme styles for Google Maps (without requiring mapId)
        const darkThemeStyles = [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }],
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }],
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }],
          },
        ];

        // Initialize map with theme-based styles
        const mapOptions: any = {
          center,
          zoom: userLocation ? 12 : 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          language: locale === 'he' ? 'he' : 'en',
          region: locale === 'he' ? 'IL' : undefined,
          // Only apply dark theme styles if theme is dark
          styles: currentTheme === 'dark' ? darkThemeStyles : [],
        };

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

          // Create marker with custom icon
          const marker = new google.maps.Marker({
            position,
            map,
            title: name,
            icon: createSkateparkIcon(markerFillColor, markerStrokeColor, markerCircleColor),
          });

          // Add click listener - show bottom panel
          marker.addListener('click', () => {
            markerClicked = true; // Set flag to prevent map click handler from clearing selection
            onMarkerClick(park);
          });

          markersRef.current.push(marker);
        });

        // Add user location marker
        if (userLocation) {
          const userMarker = new google.maps.Marker({
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
          markersRef.current.push(userMarker);
        }

        // Listen for theme changes and update map styles
        const updateMapTheme = () => {
          const newTheme = getCurrentTheme();
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setOptions({
              styles: newTheme === 'dark' ? darkThemeStyles : [],
            });
          }
        };

        // Listen for localStorage changes (theme toggle) - works across tabs
        const handleStorageChange = (e: StorageEvent) => {
          if (e.key === 'theme') {
            updateMapTheme();
          }
        };

        // Listen for class changes on document element (theme toggle) - works in same tab
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
              updateMapTheme();
            }
          });
        });

        // Start observing document element for class changes
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        // Listen for storage events (cross-tab theme changes)
        window.addEventListener('storage', handleStorageChange);

        // Store cleanup function in ref
        themeCleanupRef.current = () => {
          observer.disconnect();
          window.removeEventListener('storage', handleStorageChange);
        };
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();

    // Cleanup function for useEffect
    return () => {
      if (themeCleanupRef.current) {
        themeCleanupRef.current();
        themeCleanupRef.current = null;
      }
    };
  }, [skateparks, userLocation, onMarkerClick, locale]);

  // Auto-zoom to fit all visible markers when amenities filtering is active
  useEffect(() => {
    // Only proceed if amenities filter is active and map is ready
    if (!hasAmenitiesFilter || !mapInstanceRef.current || skateparks.length === 0) {
      return;
    }

    const google = (window as any).google;
    if (!google?.maps?.LatLngBounds) return;

    // Create bounds from skateparks locations
    const bounds = new google.maps.LatLngBounds();
    let hasValidBounds = false;

    skateparks.forEach((park) => {
      if (park.location && park.location.lat && park.location.lng) {
        bounds.extend(new google.maps.LatLng(park.location.lat, park.location.lng));
        hasValidBounds = true;
      }
    });

    // Fit bounds with padding if we have valid locations
    if (hasValidBounds) {
      // Remove previous zoom listener if it exists
      if (zoomListenerRef.current) {
        google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }

      mapInstanceRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });

      // Listen for bounds_changed event to check and cap zoom level at 6
      zoomListenerRef.current = google.maps.event.addListener(
        mapInstanceRef.current,
        'bounds_changed',
        () => {
          const currentZoom = mapInstanceRef.current.getZoom();
          if (currentZoom && currentZoom > 10) {
            mapInstanceRef.current.setZoom(10);
          }
          // Remove listener after adjusting zoom (one-time check)
          if (zoomListenerRef.current) {
            google.maps.event.removeListener(zoomListenerRef.current);
            zoomListenerRef.current = null;
          }
        }
      );
    }

    // Cleanup listener on unmount or when dependencies change
    return () => {
      if (zoomListenerRef.current) {
        const google = (window as any).google;
        if (google?.maps?.event) {
          google.maps.event.removeListener(zoomListenerRef.current);
        }
        zoomListenerRef.current = null;
      }
    };
  }, [skateparks, hasAmenitiesFilter]);

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
  shade: 'umbrellaBold',
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
          className={`absolute left-1/2 -translate-x-1/2 w-[110%] h-full object-cover transition-all duration-200 select-none bg-card dark:bg-card-dark shadow-lg shadow-[rgba(0,0,0,0.05)] group-hover:shadow-lg dark:group-hover:!scale-[1.02] ${
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
  variant = 'overlay' // 'overlay' | 'inline'
}: { 
  amenities: Skatepark['amenities'], 
  locale: string,
  alwaysVisible?: boolean,
  variant?: 'overlay' | 'inline'
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
            <div
              key={key}
              className="flex items-center"
              title={getAmenityLabel(key, locale)}
            >
              <Icon name={iconName as any} className="w-4 h-4 text-text dark:text-text-dark" />
            </div>
          );
        })}
      </div>
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

/**
 * Skatepark Card Component
 */
const SkateparkCard = memo(({ park, locale, animationDelay = 0, sortBy, userLocation }: { park: Skatepark; locale: string; animationDelay?: number; sortBy?: SortOption; userLocation?: UserLocation | null }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [showBadgeContainer, setShowBadgeContainer] = useState<Record<string, boolean>>({});
  const [showBadgeContent, setShowBadgeContent] = useState<Record<string, boolean>>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const name = typeof park.name === 'string' 
    ? park.name 
    : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

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

  const handleCardKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsClicked(true);
      setTimeout(() => {
        window.location.href = `/${locale}/skateparks/${park.slug}`;
      }, 300);
    }
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
      onKeyDown={handleCardKeyDown}
      tabIndex={0}
      role="button"
      className={`h-fit cursor-pointer relative group select-none transform-gpu transition-all duration-300 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 focus:outline-none focus:ring-2 focus:ring-brand-main focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-2xl ${isClicked ? 'before:animate-shimmerInfinite' : ''} `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={`${name}${distanceText ? `, ${distanceText}` : ''}`}
    >
      {park.amenities && Object.values(park.amenities).some(Boolean) && (
        <ParkAmenities amenities={park.amenities} locale={locale} />
      )}

      <div className="relative h-[12rem] lg:h-[14rem] overflow-hidden rounded-2xl" 
        style={{
          filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
        }}
      >
        {/* Opening Year Badge */}
        {hasOpeningYear && (
          <div className={`absolute bottom-2 left-0 z-10 ${
            showBadgeContainer.openingYear ? 'animate-slideRight animation-delay-[2s]' : 'opacity-0 translate-x-[-30px]'
          }`}>
            <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-orange dark:bg-orange-dark text-orange-bg dark:text-orange-bg-dark text-xs md:text-sm font-semibold px-2 py-1 rounded-r-full shadow-lg">
              <span className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`}>
                {park.openingYear}
              </span>
              <Icon name='sparksBold' className={`w-3 h-3 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.openingYear ? 'opacity-100' : 'opacity-0'}`} />
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
            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-red dark:bg-red-dark text-red-bg dark:text-red-bg-dark px-1 xsm:px-2 py-1 shadow-lg ${
              hasOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
            }`}>
              <span className={`text-sm md:text-base font-medium transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`}>
                {tr('Permanently Closed', 'נסגר לצמיתות')}
              </span>
              <Icon name="closedPark" className={`w-4 h-4 md:w-5 md:h-5 transition-opacity duration-200 ${showBadgeContent.closed ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        {/* New Badge */}
        {isNew && (() => {
          const isOnlyOpeningYear = hasOpeningYear && !isClosed;
          const isClosedBadge = isClosed;
          
          return (
            <div className={`absolute z-10 ${
              isClosedBadge ? 'bottom-10 left-0' : isOnlyOpeningYear ? 'bottom-2 right-0' : 'bottom-2 left-0'
            } ${
              showBadgeContainer.new 
                ? `${isOnlyOpeningYear ? 'animate-slideLeft' : 'animate-slideRight'} ${hasOpeningYear && isClosed ? 'animation-delay-[4s]' : ''}`
                : `opacity-0 ${isOnlyOpeningYear ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
            }`}>
              <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark text-xs md:text-sm px-2 py-1 shadow-lg ${
                isOnlyOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
              }`}>
                <span className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`}>
                  {tr('New', 'חדש')}
                </span>
                <Icon name="trees" className={`w-3 h-3 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.new ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
          );
        })()}

        {/* Featured Badge */}
        {isFeatured && (
          <div className={`absolute bottom-2 z-10 ${
            hasOpeningYear || isClosed || isNew ? 'right-0' : 'left-0'
          } ${
            showBadgeContainer.featured 
              ? ((hasOpeningYear || isClosed || isNew) ? 'animate-slideLeft' : 'animate-slideRight')
              : `opacity-0 ${(hasOpeningYear || isClosed || isNew) ? 'translate-x-[30px]' : 'translate-x-[-30px]'}`
          }`}>
            <div className={`flex gap-0.5 md:gap-1 px-2 justify-center items-center  bg-green-bg dark:bg-green-dark text-green dark:text-green-bg-dark text-xs md:text-sm font-medium px-1 md:px-2 py-1 shadow-lg ${
              hasOpeningYear || isClosed || isNew ? 'rounded-l-3xl' : 'rounded-r-3xl'
            }`}>
              <span className={`text-sm md:text-base transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`}>
                {tr('Featured', 'מומלץ')}
              </span>
              <Icon name="featured" className={`w-4 h-4 md:w-4 md:h-4 transition-opacity duration-200 ${showBadgeContent.featured ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        <SkateparkThumbnail
          photoUrl={photoUrl}
          parkName={name}
        />
      </div>

      {/* Name Section - Always visible below image */}
      <div className={`w-full py-2 `}>
        <h3 className={`text-xl font-semibold truncate text-text dark:text-text-dark opacity-0 animate-fadeInDown`}
          style={{ animationDelay: `400ms` }}
        >
          {name}
        </h3>
        {/* Distance - Always shown below the name if available */}
        {distanceText && (
          <div className="flex items-center gap-1.5 mt-1">
            <Icon name="locationBold" className="w-3 h-3 shrink-0 text-text dark:text-text-dark" />
            <span className="text-xs text-text dark:text-text-dark truncate">
              {distanceText}
            </span>
          </div>
        )}
      </div>
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
    { key: 'shade', label: tr('Shade', 'הצללה'), iconName: 'umbrellaBold' },
    { key: 'bathroom', label: tr('Bathroom', 'שירותים'), iconName: 'toilet' },
    { key: 'seating', label: tr('Seating', 'מקומות ישיבה'), iconName: 'couch' },
    { key: 'nearbyRestaurants', label: tr('Restaurants Nearby', 'מסעדות בקרבת מקום'), iconName: 'nearbyResturants' },
    { key: 'scootersAllowed', label: tr('Scooters Allowed', 'קורקינטים'), iconName: 'scooter' },
    { key: 'bikesAllowed', label: tr('Bikes Allowed', 'אופניים'), iconName: 'bmx-icon' },
    { key: 'entryFee', label: tr('Entry Fee', 'דמי כניסה'), iconName: 'shekel' },
    { key: 'helmetRequired', label: tr('Helmet Required', 'חובה קסדה'), iconName: 'helmet' },
    { key: 'bombShelter', label: tr('Bomb Shelter', 'מקלט'), iconName: 'safe-house' },
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
  const heroSectionRef = useRef<HTMLDivElement>(null);
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

      const region = locale === 'he' ? 'IL' : undefined;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=${locale}${region ? `&region=${region}` : ''}`
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

  // Helper function to merge inactive parks with active parks
  const mergeInactiveParks = useCallback((activeParks: any[]): any[] => {
    try {
      const inactiveCacheKey = 'skateparks_cache_inactive';
      const inactiveCachedData = localStorage.getItem(inactiveCacheKey);
      
      if (!inactiveCachedData) {
        return activeParks;
      }

      const inactiveParks = JSON.parse(inactiveCachedData);
      if (!Array.isArray(inactiveParks) || inactiveParks.length === 0) {
        return activeParks;
      }

      // Normalize location format for inactive parks
      const normalizedInactiveParks = inactiveParks.map((park: any) => {
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

      // Merge inactive parks with active parks (avoid duplicates by slug)
      const activeSlugs = new Set(activeParks.map((p: any) => p.slug));
      const uniqueInactiveParks = normalizedInactiveParks.filter((p: any) => !activeSlugs.has(p.slug));
      
      return [...activeParks, ...uniqueInactiveParks];
    } catch (e) {
      console.warn('Failed to merge inactive parks', e);
      return activeParks;
    }
  }, []);

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

        // Merge with inactive parks
        const allParks = mergeInactiveParks(normalizedCachedData);
        setAllSkateparks(allParks);
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

                    // Merge with inactive parks and update state
                    const allParks = mergeInactiveParks(normalizedSkateparks);
                    setAllSkateparks(allParks);
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

      // Merge with inactive parks
      const allParks = mergeInactiveParks(normalizedSkateparks);
      setAllSkateparks(allParks);

      // Store both cache and version in localStorage (store normalized format)
      localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
      localStorage.setItem(versionKey, currentVersion.toString());
    } catch (error) {
      console.error('Error fetching skateparks:', error);
    } finally {
      setLoading(false);
    }
  }, [mergeInactiveParks]);

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
    // Also disable location if it's enabled
    setUserLocation(null);
    setUserCity(null);
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark" dir={locale === 'he' ? 'rtl' : 'ltr'}>

      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div ref={heroSectionRef} className="relative pt-14   bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5">
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Find Your Park', 'מצא את הבית שלך')}
            </h1>
            <h2 className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr(
                'Where wheels meet concrete, community happens.',
                'פה הגלגלים והחברים נפגשים.'
              )}
            </h2>

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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-bg dark:bg-green-bg-dark rounded-full border border-green-border dark:border-green-border-dark">
                      <Icon name="mapBold" className="w-4 h-4 text-green" />
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
                    const amenityOption = AMENITY_OPTIONS.find(a => a.key === amenity);
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
            );
          })()}
        </div>
      </div>

      {/* ========================================
          MAIN CONTENT AREA
      ======================================== */}
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8  overflow-x-hidden">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ParkCardSkeleton key={i} />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          /* MAP VIEW */
          <section 
            aria-label={tr('Skatepark map', 'מפת פארקים')}
            className="relative h-[calc(100vh-280px)] min-h-[600px]" 
            ref={mapContainerRef}
          >
            <div className="h-full rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-xl">
              <GoogleMapView
                skateparks={skateparks}
                userLocation={userLocation}
                onMarkerClick={setSelectedPark}
                locale={locale}
                hasAmenitiesFilter={selectedAmenities.length > 0}
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
            {selectedPark && (() => {
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
                  className="absolute w-1/2 md:w-[calc(100%-2rem)] max-w-[20rem] z-40 bg-card dark:bg-card-dark rounded-3xl border-2 border-card dark:border-card-dark overflow-hidden"
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
                      className="block focus:outline-none focus:ring-2 focus:ring-brand-main focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-3xl"
                      onClick={(e) => {
                        // Don't navigate if dragging or just finished dragging
                        if (isDragging || wasDragging) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {/* Amenities - Top overlay */}
                      {selectedPark.amenities && Object.values(selectedPark.amenities).some(Boolean) && (
                        <ParkAmenities amenities={selectedPark.amenities} locale={locale} alwaysVisible={true} />
                      )}

                      <div className="relative bg-black/25 h-[10.5rem]">
                        {/* Opening Year Badge */}
                        {hasOpeningYear && (
                          <div className="absolute bottom-2 left-0 z-10 overflow-hidden">
                          <div className="flex gap-0.5 md:gap-1 justify-center items-center bg-orange dark:bg-orange-dark text-orange-bg dark:text-orange-bg-dark text-xs md:text-sm font-semibold ps-1 md:ps-3 pe-1 md:pe-2 py-1 rounded-r-full shadow-lg">
                            <span className={`text-sm md:text-base transition-opacity duration-200`}>
                              {selectedPark.openingYear}
                            </span>
                            <Icon name='sparksBold' className={`w-2 h-2 md:w-3 md:h-3 transition-opacity duration-200`} />
                          </div>
                        </div>
                      )}

                        {/* Closed Badge */}
                        {isClosed && (
                          <div className={`absolute bottom-2 z-10 overflow-hidden ${
                            hasOpeningYear ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-red dark:bg-red-dark text-red-bg dark:text-red-bg-dark text-xs md:text-sm px-1 md:px-2 py-1 shadow-lg ${
                              hasOpeningYear ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              <span className={`text-sm md:text-base font-medium transition-opacity duration-200`}>
                                {tr('Closed', 'סגור')}
                              </span>
                              <Icon name="closedPark" className="w-2 h-2 md:w-3 md:h-3" />
                            </div>
                          </div>
                        )}

                        {/* New Badge */}
                        {isNew && (
                          <div className={`absolute bottom-2 z-10 ${
                            hasOpeningYear || isClosed ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark text-xs md:text-sm px-1 md:px-2 py-1 shadow-lg ${
                              hasOpeningYear || isClosed ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              <Icon name="trees" className="w-2 h-2 md:w-3 md:h-3" />
                              {tr('New', 'חדש')}
                            </div>
                          </div>
                        )}

                        {/* Featured Badge */}
                        {isFeatured && (
                          <div className={`absolute bottom-2 z-10 ${
                            hasOpeningYear || isClosed || isNew ? 'right-0' : 'left-0'
                          }`}>
                            <div className={`flex gap-0.5 md:gap-1 justify-center items-center bg-green-bg dark:bg-green-dark text-green dark:text-green-bg-dark text-xs md:text-sm px-1 md:px-2 py-1 shadow-lg ${
                              hasOpeningYear || isClosed || isNew ? 'rounded-l-3xl' : 'rounded-r-3xl'
                            }`}>
                              <span className={`text-sm md:text-base font-medium transition-opacity duration-200`}>
                                {tr('Featured', 'מומלץ')}
                              </span>
                              <Icon name="featured" className="w-2 h-2 md:w-3 md:h-3" />
                            </div>
                          </div>
                        )}

                        <SkateparkThumbnail
                          photoUrl={photoUrl}
                          parkName={name}
                          alwaysSaturated={true}
                        />
                      </div>

                      {/* Name Section - Always visible below image */}
                      <div className="px-4 py-3 space-y-1">
                        <h3 className="text-sm font-semibold truncate text-text dark:text-text-dark opacity-0 animate-fadeInDown">
                          {name}
                        </h3>
                        {/* Distance - Always shown below the name if available */}
                        {distanceText && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Icon name="locationBold" className="w-3 h-3 shrink-0 text-text dark:text-text-dark" />
                            <span className="text-xs text-text dark:text-text-dark truncate">
                              {distanceText}
                            </span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })()}
          </section>
        ) : (
          /* GRID VIEW */
          <>
            <section 
              aria-label={tr('Skatepark listings', 'רשימת פארקים')}
              className=" grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
            >
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
            </section>

            {/* Empty State */}
            {skateparks.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-bg dark:bg-gray-bg-dark mb-4">
                  <Icon name="searchQuest" className="w-8 h-8 text-gray dark:text-gray-dark" />
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
                  <Button variant="gray" onClick={clearFilters}>
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
