'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Grid3x3,
  Map,
  X,
  Clock,
  Star,
  Sparkles,
  XCircle,
  Badge,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
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
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded
    if ((window as any).google?.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', reject);
      return;
    }

    // Load Google Maps script with async/defer attributes
    const script = document.createElement('script');
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
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
}: {
  skateparks: Skatepark[];
  userLocation: UserLocation | null;
  onMarkerClick: (park: Skatepark | null) => void;
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
    pinElement.style.border = '2px solid #FFFFFF';
    return pinElement;
  };

  // Helper function to create skatepark marker pin
  const createSkateparkPin = (color: string = '#DC2626') => {
    const pinElement = document.createElement('div');
    pinElement.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0 C9.4 0 0 9.4 0 20 C0 35 20 50 20 50 C20 50 40 35 40 20 C40 9.4 30.6 0 20 0 Z" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="20" cy="20" r="8" fill="#FFFFFF"/>
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
          await loadGoogleMapsScript();
          scriptLoadedRef.current = true;
        }

        const google = (window as any).google;
        if (!google?.maps) {
          console.error('Google Maps failed to load');
          return;
        }

        const center = userLocation || { lat: 31.7683, lng: 35.2137 }; // Default to Jerusalem

        // Check if AdvancedMarkerElement is available (new API)
        const useAdvancedMarkers = google.maps.marker?.AdvancedMarkerElement;

        // Initialize map - mapId is required for AdvancedMarkerElement
        const mapOptions: any = {
          center,
          zoom: userLocation ? 12 : 10,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        };

        // Only add mapId if using AdvancedMarkerElement
        if (useAdvancedMarkers) {
          // Use a generic map ID - in production, you should create your own Map ID in Google Cloud Console
          mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        }

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

          let marker: any;

          if (useAdvancedMarkers) {
            // Use new AdvancedMarkerElement API with custom pin
            const pinContent = createSkateparkPin('#00b881');
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
                fillColor: '#00b881',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
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
                strokeColor: '#FFFFFF',
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
  }, [skateparks, userLocation, onMarkerClick]);

  return <div ref={mapRef} className="w-full h-full min-h-[600px] rounded-lg" />;
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
  shade: 'sun',
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
  onLoad
}: { 
  photoUrl: string, 
  parkName: string,
  onLoad?: () => void
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
          className={`w-full h-full rounded-t-3xl object-cover transition-all duration-200 saturate-[1.75] select-none ${
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
          <div className="w-16 h-16 opacity-50 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
      )}
    </>
  );
});
SkateparkThumbnail.displayName = 'SkateparkThumbnail';

// Memoized amenities component
const ParkAmenities = memo(({ 
  amenities, 
  locale
}: { 
  amenities: Skatepark['amenities'], 
  locale: string 
}) => {
  const amenityEntries = Object.entries(amenities)
    .filter(([key, value]) => value && AMENITY_ICON_MAP[key])
    .slice(0, 6); // Limit to 6 amenities

  if (amenityEntries.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
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
const SkateparkCard = memo(({ park, locale, animationDelay = 0 }: { park: Skatepark; locale: string; animationDelay?: number }) => {
  const [isClicked, setIsClicked] = useState(false);
  const name = typeof park.name === 'string' 
    ? park.name 
    : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

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

  const distanceText = park.distance !== null && park.distance !== undefined
    ? `(${park.distance.toFixed(1)} ${tr('km', 'ק\"מ')})`
    : null;

  const areaLabels: Record<'north' | 'center' | 'south', { en: string; he: string }> = {
    north: { en: 'North', he: 'צפון' },
    center: { en: 'Center', he: 'מרכז' },
    south: { en: 'South', he: 'דרום' },
  };
  const areaLabel = locale === 'he' ? areaLabels[park.area]?.he : areaLabels[park.area]?.en || park.area;

  return (
    <div
      onClick={handleCardClick}
      className={`h-fit hover:shadow-lg dark:hover:!scale-[1.02] bg-card dark:bg-card-dark rounded-3xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-200 opacity-0 animate-popFadeIn before:content-[''] before:absolute before:top-0 before:right-[-150%] before:w-[150%] before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:z-[20] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-300 ${isClicked ? 'before:animate-shimmerInfinite' : ''} `}
      style={{ animationDelay: `${animationDelay}ms` }}
      aria-label={name}
    >
      {park.amenities && Object.values(park.amenities).some(Boolean) && (
        <ParkAmenities amenities={park.amenities} locale={locale} />
      )}

      <div className="relative bg-black/25 h-[10.5rem] overflow-hidden">
        {/* Opening Year Badge */}
        {hasOpeningYear && (
          <div className="absolute bottom-2 left-0 z-10">
            <div className="flex gap-1 justify-center items-center bg-yellow-400 dark:bg-yellow-500 text-black text-xs md:text-sm font-semibold px-2 py-1 rounded-r-full shadow-lg">
              {park.openingYear}
              <Sparkles className="w-3 h-3" />
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
              <XCircle className="w-3 h-3" />
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
        />
      </div>
      
      <div className="px-4 py-3 space-y-1">
        <h3 className="text-lg font-semibold truncate">
          {name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600 dark:text-gray-400 gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="text-sm truncate">
              {distanceText ? `${areaLabel} ${distanceText}` : areaLabel}
            </span>
          </div>
        </div>
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
    { key: 'shade', label: tr('Shade', 'צל'), iconName: 'sun' },
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
  const prevSelectedAmenitiesRef = useRef<string[]>([]);
  const prevUserLocationRef = useRef<UserLocation | null>(null);

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
    setLoading(true);

    try {
      const response = await fetch('/api/skateparks');
      if (!response.ok) throw new Error('Failed to fetch skateparks');

      const data = await response.json();
      setAllSkateparks(data.skateparks || []);
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

  // Client-side filtering function
  const filterSkateparks = useCallback((parks: Skatepark[]): Skatepark[] => {
    let filtered = [...parks];

    // Area filter
    if (areaFilter) {
      filtered = filtered.filter((park) => park.area === areaFilter);
    }

    // Search filter (text search in name only - both English and Hebrew)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
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
        
        return (
          nameEn.toLowerCase().includes(query) ||
          nameHe.toLowerCase().includes(query)
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
  }, [areaFilter, searchQuery, selectedAmenities, openNowOnly, locale]);

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

  const clearFilters = () => {
    setAreaFilter('');
    setSearchQuery('');
    setSelectedAmenities([]);
    setOpenNowOnly(false);
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen " dir={locale === 'he' ? 'rtl' : 'ltr'}>
      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        {/* Top Controls Bar - Above Park Cards */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="flex-1 min-w-64 max-w-md">
              <SearchInput
                placeholder={tr('Search skateparks...', 'חיפוש סקייטפארקים...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className="w-full"
              />
            </div>

            {/* Amenities Filter Button */}
            <AmenitiesButton
              selectedAmenities={selectedAmenities}
              onAmenitiesChange={setSelectedAmenities}
              locale={locale}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Location Icon Button */}
            <Button
              variant={userLocation ? "brand" : "outline"}
              size="xl"
              onClick={requestLocation}
              className={userLocation ? 'rounded-full' : ''}
              aria-label={tr('Use My Location', 'השתמש במיקומי')}
              aria-pressed={!!userLocation}
            >
              <Icon 
                name={userLocation ? "locationOff" : "location"}
                className="w-5 h-5"
              />
            </Button>

            {/* View Toggle Switch */}
            <Button
              variant={viewMode === 'map' ? "success" : "outline"}
              size="xl"
              onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
              className="active:scale-95 transition-all duration-200 rounded-full"
              aria-label={viewMode === 'grid' ? tr('Switch to Map View', 'החלף לתצוגת מפה') : tr('Switch to Grid View', 'החלף לתצוגת רשת')}
            >
              {viewMode === 'grid' ? (
                <Map className="w-5 h-5" />
              ) : (
                <Grid3x3 className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Status Indicators */}
        {(() => {
          const visibleStatusItemsCount = 
            1 + // Always show parks count
            (areaFilter ? 1 : 0) +
            (selectedAmenities.length > 0 ? 1 : 0) +
            (userLocation && sortBy === 'nearest' ? 1 : 0);

          return (
            <div className={`mb-6 flex ${visibleStatusItemsCount > 1 ? 'flex-col' : 'flex-col sm:flex-row'} gap-2 md:gap-1 items-center text-sm text-gray-600 dark:text-gray-400`}>
              {/* Showing X of Y parks - Always show, even when 0 */}
              {!loading && (
                <div className="flex items-center gap-2">
                  <span>
                    {t('search.filterStatus.showing', { 
                      filtered: skateparks.length,
                      total: allSkateparks.length
                    })}
                  </span>
                  <Icon name="map" className="w-4 h-4 text-success dark:text-success-dark" />
                </div>
              )}

              {/* Filtered by Area Status */}
              {areaFilter && (
                <div className="flex items-center gap-1">
                  <span>{t('search.filterStatus.filteredByArea')}</span>
                  <span className="font-semibold">
                    {t(`search.area.${areaFilter}`)}
                  </span>
                </div>
              )}

              {/* Sorted by Amenities Status */}
              {selectedAmenities.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>{t('search.filterStatus.sortedByAmenities')}</span>
                  <div className="flex items-center gap-2">
                    {selectedAmenities.map((amenity) => {
                      const amenityOption = AMENITY_OPTIONS.find(a => a.key === amenity);
                      const iconName = amenityOption?.iconName;
                      const shouldAnimate = animatingIcons.has(amenity);
                      return iconName ? (
                        <Icon 
                          key={amenity}
                          name={iconName as any}
                          className={`w-4 h-4 text-info dark:text-info-dark ${shouldAnimate ? 'animate-pop' : ''}`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Sorted by Location Status */}
              {userLocation && sortBy === 'nearest' && (
                <div className="flex items-center gap-2">
                  <span>{t('search.filterStatus.sortedByDistance')}</span>
                  <Icon 
                    name="locationBold" 
                    className={`w-4 h-4 text-brand-main ${shouldAnimateLocation ? 'animate-pop' : ''}`} 
                  />
                  {userCity && (
                    <span className="text-sm text-brand-text dark:text-brand-main">
                      ({userCity})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ParkCardSkeleton key={i} />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="relative h-[calc(100vh-200px)]">
            <div className="h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <GoogleMapView
                skateparks={skateparks}
                userLocation={userLocation}
                onMarkerClick={setSelectedPark}
              />
            </div>
            
            {/* Selected Park Detail Panel */}
            {selectedPark && (
              <div className="absolute bottom-4 left-4 right-4 lg:right-auto lg:left-4 lg:bottom-4 lg:w-96 z-50">
                <Card className="shadow-2xl border-2 border-blue-500 relative">
                  <button
                    onClick={() => setSelectedPark(null)}
                    className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label={tr('Close', 'סגור')}
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  <Link href={`/${locale}/skateparks/${selectedPark.slug}`}>
                    <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700 cursor-pointer group">
                      <Image
                        src={selectedPark.imageUrl}
                        alt={typeof selectedPark.name === 'string' ? selectedPark.name : (locale === 'he' ? selectedPark.name.he : selectedPark.name.en) || selectedPark.name.en || selectedPark.name.he || 'Skatepark image'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {selectedPark.is24Hours && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded">
                          <Clock className="w-3 h-3 inline mr-1" />
                          24/7
                        </div>
                      )}
                      <div className="absolute top-2 right-10">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                          {selectedPark.area.charAt(0).toUpperCase() + selectedPark.area.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  <CardContent className="p-4">
                    <Link href={`/${locale}/skateparks/${selectedPark.slug}`}>
                      <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {typeof selectedPark.name === 'string' 
                          ? selectedPark.name 
                          : (locale === 'he' ? selectedPark.name.he : selectedPark.name.en) || selectedPark.name.en || selectedPark.name.he}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {typeof selectedPark.address === 'string' 
                          ? selectedPark.address 
                          : (locale === 'he' ? selectedPark.address.he : selectedPark.address.en) || selectedPark.address.en || selectedPark.address.he}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      {selectedPark.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          <span className="text-base font-semibold">{selectedPark.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({selectedPark.totalReviews})</span>
                        </div>
                      )}
                      {selectedPark.distance !== null && selectedPark.distance !== undefined && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {selectedPark.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    
                    <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      {Object.entries(selectedPark.amenities)
                        .filter(([key, value]) => value && AMENITY_ICON_MAP[key])
                        .map(([key]) => {
                          const iconName = AMENITY_ICON_MAP[key];
                          const label = getAmenityLabel(key, locale);
                          return (
                            <span
                              key={key}
                              className="bg-black/45 backdrop-blur-sm p-1.5 rounded-lg"
                            >
                              <Icon name={iconName as any} className="w-4 h-4 text-white" />
                              {label}
                            </span>
                          );
                        })}
                    </div>
                    
                    <Link href={`/${locale}/skateparks/${selectedPark.slug}`}>
                      <Button variant="primary" className="w-full">
                        {tr('View Details', 'צפה בפרטים')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {skateparks.map((park, index) => (
                <SkateparkCard key={park._id} park={park} locale={locale} animationDelay={index * 50} />
              ))}
            </div>

            {skateparks.length === 0 && !loading && (
              <div 
                className="text-center py-12 col-span-full"
                role="status"
                aria-live="polite"
              >
                <Icon name="searchQuest" className="mx-auto h-12 w-12 text-brand-main" aria-hidden="true" />
                <h2 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {(() => {
                    const hasFilters = searchQuery || areaFilter || selectedAmenities.length > 0 || openNowOnly || (userLocation && sortBy === 'nearest');
                    
                    if (searchQuery && !areaFilter && selectedAmenities.length === 0 && !openNowOnly && !(userLocation && sortBy === 'nearest')) {
                      // Only search query, no active filters/sorts
                      return t('search.noResults');
                    } else if (hasFilters) {
                      // Any actual filter/sort is active
                      return t('search.noFilteredResults');
                    } else {
                      // No filters, just no data
                      return t('search.noSkateparks');
                    }
                  })()}
                </h2>
                {(searchQuery || areaFilter || selectedAmenities.length > 0 || openNowOnly) && (
                  <div className="mt-4">
                    <Button variant="primary" onClick={clearFilters}>
                      {tr('Clear Filters', 'נקה מסננים')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

