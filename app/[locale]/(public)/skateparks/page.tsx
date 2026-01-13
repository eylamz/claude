'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui';
import ParkCardSkeleton from '@/components/skateparks/ParkCardSkeleton';
import { MapView } from '@/components/skateparks/MapView';
import { ParkCard } from '@/components/skateparks/ParkCard';
import { FilterBar } from '@/components/skateparks/FilterBar';
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
      const scrollDifference = prevScrollY - currentScrollY;
      const scrollUpThreshold = 10000; // Minimum pixels to scroll up before showing header

      // Determine header visibility (matches HeaderNav/MobileNav logic)
      if (currentScrollY < 10 || scrollDifference >= scrollUpThreshold) {
        // At top or scrolled up significantly - show header
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

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
                  selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
        areaFilter={areaFilter}
        setAreaFilter={setAreaFilter}
        openNowOnly={openNowOnly}
        userLocation={userLocation}
        userCity={userCity}
        sortBy={sortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isHeaderVisible={isHeaderVisible}
        isScrolled={isScrolled}
        loading={loading}
        skateparksCount={skateparks.length}
        allSkateparksCount={allSkateparks.length}
        animatingIcons={animatingIcons}
        shouldAnimateLocation={shouldAnimateLocation}
        requestLocation={requestLocation}
        clearFilters={clearFilters}
        heroSectionRef={heroSectionRef}
                  locale={locale}
        tr={tr}
        t={t}
        amenityOptions={AMENITY_OPTIONS}
      />

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
          <MapView
                skateparks={skateparks}
                userLocation={userLocation}
            selectedPark={selectedPark}
            onParkSelect={setSelectedPark}
                locale={locale}
                hasAmenitiesFilter={selectedAmenities.length > 0}
            mapContainerRef={mapContainerRef}
            tr={tr}
          />
        ) : (
          /* GRID VIEW */
          <>
            <section 
              aria-label={tr('Skatepark listings', 'רשימת פארקים')}
              className=" grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
            >
              {skateparks.map((park, index) => (
                <ParkCard 
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
