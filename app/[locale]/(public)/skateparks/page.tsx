'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import ParkCardSkeleton from '@/components/skateparks/ParkCardSkeleton';
import { MapView } from '@/components/skateparks/MapView';
import { ParkCard } from '@/components/skateparks/ParkCard';
import { FilterBar } from '@/components/skateparks/FilterBar';
import { Icon } from '@/components/icons';
import { useTranslations } from 'next-intl';
import { flipLanguage } from '@/lib/utils/transliterate';
import {
  getAreaFromQuery,
  queryMatchesCategory,
  parseSkateparksVersion,
  isSkateparksCacheFresh,
  getSkateparksFetchedAtReadable,
} from '@/lib/search-from-cache';

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
  skillLevel?: { beginners?: boolean; advanced?: boolean; pro?: boolean };
  openingYear?: number | null;
  closingYear?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  distance?: number | null;
  nicknames?: { en?: string[]; he?: string[] };
}

interface UserLocation {
  lat: number;
  lng: number;
}

type ViewMode = 'map' | 'grid';
type SortOption = 'nearest' | 'alphabetical' | 'newest' | 'rating' | 'shuffle';

/**
 * Main Skateparks Page
 */
export default function SkateparksPage() {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const t = useTranslations('skateparks');

  const tr = useCallback(
    (enText: string, heText: string) => (locale === 'he' ? heText : enText),
    [locale]
  );

  const AMENITY_OPTIONS = [
    { key: 'parking', label: tr('Parking', 'חניה'), iconName: 'parking' },
    { key: 'shade', label: tr('Shade', 'הצללה'), iconName: 'shadeBold' },
    { key: 'bathroom', label: tr('Bathroom', 'שירותים'), iconName: 'toilet' },
    { key: 'seating', label: tr('Seating', 'מקומות ישיבה'), iconName: 'seatBold' },
    {
      key: 'nearbyRestaurants',
      label: tr('Restaurants Nearby', 'מסעדות בקרבת מקום'),
      iconName: 'foodBold',
    },
    { key: 'scootersAllowed', label: tr('Scooters Allowed', 'קורקינטים'), iconName: 'scooter' },
    { key: 'bikesAllowed', label: tr('Bikes Allowed', 'אופניים'), iconName: 'bmx-icon' },
    { key: 'entryFee', label: tr('Entry Fee', 'דמי כניסה'), iconName: 'moneyBold' },
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
  const [skillLevelFilter, setSkillLevelFilter] = useState<'beginners' | 'advanced' | 'pro' | ''>(
    ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('shuffle');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedPark, setSelectedPark] = useState<Skatepark | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [, setAnimatingIcons] = useState<Set<string>>(new Set());
  const [, setShouldAnimateLocation] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLDivElement>(null);
  const prevSelectedAmenitiesRef = useRef<string[]>([]);
  const prevUserLocationRef = useRef<UserLocation | null>(null);
  const isFetchingRef = useRef(false); // Prevent duplicate concurrent fetches
  /** Stable shuffle order: park _id -> position. Restored when user clears sort instead of reshuffling. */
  const shuffledOrderRef = useRef<Record<string, number>>({});
  const allSkateparksSignatureRef = useRef<string>(''); // Detect when dataset changes so we can reshuffle once


  // Track newly added amenities for pop animation
  useEffect(() => {
    const prev = prevSelectedAmenitiesRef.current;
    const current = selectedAmenities;

    // Find newly added amenities
    const newlyAdded = current.filter((amenity) => !prev.includes(amenity));

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
  const getCityFromCoordinates = useCallback(
    async (lat: number, lng: number) => {
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
              if (
                component.types.includes('locality') ||
                component.types.includes('administrative_area_level_1')
              ) {
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
    },
    [locale]
  );

  // Request location permission or toggle it off
  const requestLocation = useCallback(async () => {
    // If location is already enabled, disable it
    if (userLocation) {
      setUserLocation(null);
      setUserCity(null);
      // Only reset sort if it was set to nearest
      if (sortBy === 'nearest') {
        setSortBy('shuffle');
      }
      return;
    }

    if (!navigator.geolocation) {
      alert(t('geolocationNotSupported'));
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
        alert(t('locationAccessDenied'));
      }
    );
  }, [getCityFromCoordinates, userLocation, sortBy, t]);

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
      const uniqueInactiveParks = normalizedInactiveParks.filter(
        (p: any) => !activeSlugs.has(p.slug)
      );

      return [...activeParks, ...uniqueInactiveParks];
    } catch (e) {
      console.warn('Failed to merge inactive parks', e);
      return activeParks;
    }
  }, []);

  // Fetch all skateparks once on mount (no filters, no pagination)
  const fetchAllSkateparks = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isFetchingRef.current) {
      return;
    }

    const cacheKey = 'skateparks_cache';
    const versionKey = 'skateparks_version';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedVersionRaw = localStorage.getItem(versionKey);
    const { version: storedVersionNum, fetchedAt } = parseSkateparksVersion(cachedVersionRaw);

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

        // If cache was fetched less than 1 hour ago, skip version check and refetch
        if (isSkateparksCacheFresh(fetchedAt)) {
          return;
        }

        // Check version asynchronously after using cache (only if cache is older than 1 hour)
        // If version doesn't match, refetch and update both cache and version
        if (cachedVersionRaw) {
          // If version exists in cache, only fetch version (lightweight request)
          (async () => {
            try {
              const versionResponse = await fetch('/api/skateparks?versionOnly=true');
              if (versionResponse.ok) {
                const versionData = await versionResponse.json();
                const currentVersion = Number(versionData.version) || 1;
                const storedVersion = storedVersionNum ?? Number(cachedVersionRaw) ?? 1;

                // Ensure both are valid numbers before comparison
                if (isNaN(currentVersion) || isNaN(storedVersion)) {
                  console.warn('Invalid version numbers, skipping version check');
                  return;
                }

                // If versions don't match, refetch skateparks data and update both cache and version
                if (storedVersion !== currentVersion) {
                  console.log(
                    `Version mismatch: cached=${storedVersion}, current=${currentVersion}, fetching full data`
                  );
                  isFetchingRef.current = true;
                  const response = await fetch('/api/skateparks');
                  if (response.ok) {
                    const data = await response.json();
                    const newVersion = Number(data.version) || 1;

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

                    // Update both cache and version (with fetch time) in localStorage
                    localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
                    localStorage.setItem(
                      versionKey,
                      JSON.stringify({
                        version: newVersion,
                        fetchedAt: getSkateparksFetchedAtReadable(),
                      })
                    );

                    // Merge with inactive parks and update state
                    const allParks = mergeInactiveParks(normalizedSkateparks);
                    setAllSkateparks(allParks);
                  }
                  isFetchingRef.current = false;
                } else {
                  // Versions match, no need to fetch
                  console.log(
                    `Version match: ${storedVersion} === ${currentVersion}, using cached data`
                  );
                }
              }
            } catch (e) {
              console.warn('Failed to check version', e);
              // Continue with cached data if version check fails
            }
          })();
        } else {
          // If no version in cache, fetch both version and skateparks data
          (async () => {
            try {
              isFetchingRef.current = true;
              const response = await fetch('/api/skateparks');
              if (response.ok) {
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

                // Update both cache and version (with fetch time) in localStorage
                localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
                localStorage.setItem(
                  versionKey,
                  JSON.stringify({
                    version: currentVersion,
                    fetchedAt: getSkateparksFetchedAtReadable(),
                  })
                );

                // Merge with inactive parks and update state
                const allParks = mergeInactiveParks(normalizedSkateparks);
                setAllSkateparks(allParks);
              }
              isFetchingRef.current = false;
            } catch (e) {
              console.warn('Failed to fetch skateparks data', e);
              isFetchingRef.current = false;
              // Continue with cached data if fetch fails
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
    isFetchingRef.current = true;
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

      // Store both cache and version (with fetch time) in localStorage
      localStorage.setItem(cacheKey, JSON.stringify(normalizedSkateparks));
      localStorage.setItem(
        versionKey,
        JSON.stringify({ version: currentVersion, fetchedAt: getSkateparksFetchedAtReadable() })
      );
    } catch (error) {
      console.error('Error fetching skateparks:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [mergeInactiveParks]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback(
    (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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
    },
    []
  );

  // Normalize text for search (handles apostrophes, diacritics, and whitespace)
  const normalizeSearchText = useCallback((text: string): string => {
    return (
      text
        .toLowerCase()
        .trim()
        // Remove/normalize apostrophes (both regular ' and curly apostrophes ')
        .replace(/[''']/g, '')
        // Normalize whitespace (multiple spaces to single space)
        .replace(/\s+/g, ' ')
        // Remove diacritics for better matching (e.g., é -> e, ü -> u)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    );
  }, []);

  // Client-side filtering function. Returns { filtered, areaMatchedIds } so area-matched parks can be sorted last.
  const filterSkateparks = useCallback(
    (parks: Skatepark[]): { filtered: Skatepark[]; areaMatchedIds: Set<string> } => {
      let filtered = [...parks];
      const areaMatchedIds = new Set<string>();

      // Area filter
      if (areaFilter) {
        filtered = filtered.filter((park) => park.area === areaFilter);
      }

      // Skill level filter (beginners, advanced, pro)
      if (skillLevelFilter) {
        filtered = filtered.filter((park) => {
          const level = skillLevelFilter as 'beginners' | 'advanced' | 'pro';
          const sl = park.skillLevel;
          if (!sl) return false;
          return sl[level] === true;
        });
      }

      // Search filter: flipLanguage (wrong keyboard), category trigger (show all), area search (show area last)
      if (searchQuery.trim()) {
        if (queryMatchesCategory(searchQuery, 'skateparks')) {
          // Show all skateparks when user types e.g. "סקייטפארקים", "skateparks", "xehhyptreho"
        } else {
          const normalizedQuery = normalizeSearchText(searchQuery);
          const flipped = flipLanguage(searchQuery);
          const normalizedFlipped = flipped ? normalizeSearchText(flipped) : '';
          const areaFromQuery = getAreaFromQuery(searchQuery);

          const nameStartsWith: Skatepark[] = [];
          const nameIncludes: Skatepark[] = [];
          const areaOnlyMatched: Skatepark[] = [];

          for (const park of filtered) {
            let nameEn = '';
            let nameHe = '';
            if (typeof park.name === 'string') {
              nameEn = park.name;
              nameHe = park.name;
            } else {
              nameEn = park.name.en || '';
              nameHe = park.name.he || '';
            }
            const nicknamesEn = park.nicknames?.en ?? [];
            const nicknamesHe = park.nicknames?.he ?? [];
            const nicknameStartsWith = (arr: string[]) =>
              arr.some(
                (n) =>
                  normalizeSearchText(n).startsWith(normalizedQuery) ||
                  (normalizedFlipped && normalizeSearchText(n).startsWith(normalizedFlipped))
              );
            const nicknameIncludes = (arr: string[]) =>
              arr.some(
                (n) =>
                  normalizeSearchText(n).includes(normalizedQuery) ||
                  (normalizedFlipped && normalizeSearchText(n).includes(normalizedFlipped))
              );
            const normalizedNameEn = normalizeSearchText(nameEn);
            const normalizedNameHe = normalizeSearchText(nameHe);
            const startsWithMatch =
              normalizedNameEn.startsWith(normalizedQuery) ||
              normalizedNameHe.startsWith(normalizedQuery) ||
              nicknameStartsWith(nicknamesEn) ||
              nicknameStartsWith(nicknamesHe) ||
              (normalizedFlipped &&
                (normalizedNameEn.startsWith(normalizedFlipped) ||
                  normalizedNameHe.startsWith(normalizedFlipped)));
            const includesMatch =
              normalizedNameEn.includes(normalizedQuery) ||
              normalizedNameHe.includes(normalizedQuery) ||
              nicknameIncludes(nicknamesEn) ||
              nicknameIncludes(nicknamesHe) ||
              (normalizedFlipped &&
                (normalizedNameEn.includes(normalizedFlipped) ||
                  normalizedNameHe.includes(normalizedFlipped)));

            if (startsWithMatch) {
              nameStartsWith.push(park);
            } else if (includesMatch) {
              nameIncludes.push(park);
            } else if (areaFromQuery && park.area === areaFromQuery) {
              areaOnlyMatched.push(park);
              areaMatchedIds.add(park._id);
            }
          }

          filtered = [...nameStartsWith, ...nameIncludes, ...areaOnlyMatched];
        }
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

      return { filtered, areaMatchedIds };
    },
    [
      areaFilter,
      skillLevelFilter,
      searchQuery,
      selectedAmenities,
      openNowOnly,
      locale,
      normalizeSearchText,
    ]
  );

  // Fisher-Yates shuffle for random order
  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, []);

  // Client-side sorting function
  const sortSkateparks = useCallback((parks: Skatepark[], sortOption: SortOption): Skatepark[] => {
    const sorted = [...parks];

    switch (sortOption) {
      case 'shuffle':
        return shuffleArray(sorted);
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
  }, [shuffleArray]);

  // Filter, calculate distances, and sort skateparks when filters or sort changes
  useEffect(() => {
    const { filtered: filteredList, areaMatchedIds } = filterSkateparks(allSkateparks);
    let filtered = filteredList;

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

    const nameMatched = filtered.filter((p) => !areaMatchedIds.has(p._id));
    const areaMatched = filtered.filter((p) => areaMatchedIds.has(p._id));

    if (sortBy === 'shuffle') {
      // Use stored shuffle order so returning from another sort restores the same order (no reshuffle)
      const signature = allSkateparks.map((p) => p._id).sort().join(',');
      const dataChanged = allSkateparksSignatureRef.current !== signature;
      if (dataChanged || Object.keys(shuffledOrderRef.current).length === 0) {
        allSkateparksSignatureRef.current = signature;
        const ids = allSkateparks.map((p) => p._id);
        const shuffledIds = shuffleArray(ids);
        const order: Record<string, number> = {};
        shuffledIds.forEach((id, i) => {
          order[id] = i;
        });
        shuffledOrderRef.current = order;
      }
      const orderMap = shuffledOrderRef.current;
      const byShuffleOrder = (a: Skatepark, b: Skatepark) =>
        (orderMap[a._id] ?? 999999) - (orderMap[b._id] ?? 999999);
      const sortedName = [...nameMatched].sort(byShuffleOrder);
      const sortedArea = [...areaMatched].sort(byShuffleOrder);
      setSkateparks([...sortedName, ...sortedArea]);
    } else {
      // Sort: area-matched parks last; within each group apply selected sort
      const sortedName = sortSkateparks(nameMatched, sortBy);
      const sortedArea = sortSkateparks(areaMatched, sortBy);
      setSkateparks([...sortedName, ...sortedArea]);
    }
  }, [
    allSkateparks,
    areaFilter,
    searchQuery,
    selectedAmenities,
    openNowOnly,
    sortBy,
    userLocation,
    filterSkateparks,
    sortSkateparks,
    shuffleArray,
    calculateDistance,
  ]);

  // Fetch all skateparks once on mount
  useEffect(() => {
    fetchAllSkateparks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  const clearFilters = () => {
    setAreaFilter('');
    setSkillLevelFilter('');
    setSearchQuery('');
    setSelectedAmenities([]);
    setOpenNowOnly(false);
    setSortBy('shuffle');
    // Also disable location if it's enabled
    setUserLocation(null);
    setUserCity(null);
  };

  return (
    <div
      className="min-h-screen bg-background dark:bg-background-dark"
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      {/* ========================================
          HERO SECTION - Brand Messaging  
      ======================================== */}
      <div
        ref={heroSectionRef}
        className="relative pt-14 md:pt-14 bg-gradient-to-br from-brand-purple/10 via-transparent to-brand-main/10 dark:from-brand-purple/5 dark:to-brand-dark/5 z-10"
      >
        <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_50%)]">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              {tr('Find Your Park', 'מצא את הבית שלך')}
            </h1>
            <h2 className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {tr('Where wheels meet concrete, community happens.', 'פה הגלגלים והחברים נפגשים.')}
            </h2>

            {/* Stats Bar or Loading Spinner */}
            <div className="flex items-center justify-center min-h-[2.5rem] pt-4">
              {loading ? (
                <div className="h-10 flex items-center justify-center" aria-hidden="true">
                  <span
                    className="inline-block w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-[#143116] dark:border-t-brand-main animate-spin"
                    role="status"
                    aria-label={tr('Loading...', 'טוען...')}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="parkBold" className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {allSkateparks.length} {tr('Parks', 'פארקים')}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
                  <div className="flex items-center gap-2 text-sm">
                    <Icon name="reviewBold" className="w-5 h-5 text-green-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {tr('Community Reviews', 'ביקורות קהילה')}
                    </span>
                  </div>
                </div>
              )}
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
        skillLevelFilter={skillLevelFilter}
        setSkillLevelFilter={setSkillLevelFilter}
        openNowOnly={openNowOnly}
        userLocation={userLocation}
        userCity={userCity}
        sortBy={sortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        loading={loading}
        skateparksCount={skateparks.length}
        allSkateparksCount={allSkateparks.length}
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
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 overflow-x-hidden md:overflow-x-visible">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
              className=" grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
            >
              {skateparks.map((park, index) => (
                <ParkCard
                  key={park._id}
                  park={park}
                  locale={locale}
                  animationDelay={index * 50}
                  sortBy={sortBy}
                  userLocation={userLocation}
                  highlightQuery={searchQuery || undefined}
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
                    : tr('No parks found', 'לא נמצאו פארקים')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {tr(
                    'Try adjusting your filters or search terms',
                    'נסה לשנות את הפילטרים או החיפוש'
                  )}
                </p>
                {(searchQuery ||
                  selectedAmenities.length > 0 ||
                  areaFilter ||
                  skillLevelFilter) && (
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
