'use client';

import { useEffect, useState, Suspense, Fragment } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { MapPin, Plus, Minus } from 'lucide-react';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Breadcrumb from '@/components/common/Breadcrumb';
import ReviewForm from '@/components/reviews/ReviewForm';
import ImageSlider from '@/components/skateparks/ImageSlider';
import {
  is24HourSchedule,
  groupDaysWithSameHours,
  formatDayRanges,
  formatLightingHours,
  formatTimeRange,
  type OperatingHours as OperatingHoursType,
} from '@/lib/utils/hoursFormatter';

interface SkateparkImage {
  url: string;
  isFeatured: boolean;
  orderNumber: number;
}

interface OperatingHours {
  sunday: { openingTime: string; closingTime: string; isOpen: boolean };
  monday: { openingTime: string; closingTime: string; isOpen: boolean };
  tuesday: { openingTime: string; closingTime: string; isOpen: boolean };
  wednesday: { openingTime: string; closingTime: string; isOpen: boolean };
  thursday: { openingTime: string; closingTime: string; isOpen: boolean };
  friday: { openingTime: string; closingTime: string; isOpen: boolean };
  saturday: { openingTime: string; closingTime: string; isOpen: boolean };
  holidays: { openingTime: string; closingTime: string; isOpen: boolean };
}

interface Amenities {
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
}

interface Review {
  _id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Skatepark {
  _id: string;
  slug: string;
  name: { en: string; he: string };
  address: { en: string; he: string };
  area: 'north' | 'center' | 'south';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: SkateparkImage[];
  operatingHours: OperatingHours;
  lightingHours?: {
    endTime: string;
    is24Hours: boolean;
  };
  amenities: Amenities;
  mediaLinks: {
    youtube?: string;
    googleMapsFrame?: string;
    googleMapsUrl?: string;
  };
  notes: {
    en?: string[];
    he?: string[];
  };
  isFeatured: boolean;
  status: 'active' | 'inactive';
  closingYear?: number | null;
  openingYear?: number | null;
}

interface NearbyPark {
  _id: string;
  slug: string;
  name: { en: string; he: string };
  imageUrl: string;
  area: 'north' | 'center' | 'south';
  rating: number;
  totalReviews: number;
  location?: {
    lat: number;
    lng: number;
  };
}


const AMENITY_ICONS: Record<string, string> = {
  parking: 'parking',
  shade: 'umbrella',
  bathroom: 'toilet',
  guard: 'securityGuard',
  seating: 'couch', // Using couch as closest match for seating
  nearbyRestaurants: 'nearbyResturants',
  scootersAllowed: 'scooter',
  bikesAllowed: 'bmx-icon', // Using parking as placeholder
  entryFee: 'shekel',
  helmetRequired: 'helmet',
  bombShelter: 'safe-house',
  noWax: 'Wax', // Note: Wax icon exists, we'll show it crossed out for noWax
};


/**
 * Image Gallery helper to convert SkateparkImage format to ImageSlider format
 */
function getImageSliderImages(images: SkateparkImage[], locale: string, parkName: string): { url: string; alt?: string }[] {
  return images
    .sort((a, b) => a.orderNumber - b.orderNumber)
    .map((img, index) => ({
      url: img.url,
      alt: `${parkName} ${index + 1}`
    }));
}

/**
 * YouTube Video Embed
 */
function YouTubeEmbed({ url }: { url: string }) {
  const getVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getVideoId(url);
  if (!videoId) return null;

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Convert model operating hours to utility format
 */
function convertOperatingHoursForFormatter(hours: OperatingHours): OperatingHoursType {
  const converted: any = {};
  Object.keys(hours).forEach((day) => {
    const daySchedule = hours[day as keyof OperatingHours];
    if (daySchedule) {
      converted[day] = {
        open: daySchedule.openingTime,
        close: daySchedule.closingTime,
        closed: !daySchedule.isOpen,
      };
    }
  });
  return converted as OperatingHoursType;
}

/**
 * Formatted Hours Component
 */
function FormattedHours({ 
  operatingHours, 
  lightingHours,
  closingYear,
  locale = 'en'
}: { 
  operatingHours: OperatingHours;
  lightingHours?: { endTime: string; is24Hours: boolean };
  closingYear?: number | null;
  locale?: string;
}) {
  const t = useTranslations('skateparks');
  // Check if the park is permanently closed based on closingYear
  const isPermanentlyClosed = Boolean(closingYear);
  
  // If the park is closed (has a closing year), always show the closed badge
  // regardless of operating hours
  if (isPermanentlyClosed) {
    return (
      <div className="space-y-2">
        {/* Header with closed badge */}
        <div className="flex items-center gap-2 text-text dark:text-text-dark">
          <Icon name="clockBold" className="w-5 h-5" />
          <span className=" text-lg font-medium">{t('openingHours')}: </span>
          <span className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-700">
            {t('permanentlyClosed')}
          </span>
        </div>
        
        {/* Still show lighting hours for historical reference */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2">
            <Icon name="sun" className="w-5 h-5 text-gray-500" />
            <span className="font-semibold">{t('lightingHours')}: </span>
          </div>
          <div>
            <span className="text-gray-500">{t('notApplicable')}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // Check if it's a 24/7 operation (use lightingHours.is24Hours if available, otherwise check schedule)
  const is24Hours = lightingHours?.is24Hours || is24HourSchedule(convertOperatingHoursForFormatter(operatingHours));
  
  if (is24Hours) {
    return (
      <div className="space-y-2">
        {/* 24/7 Header */}
        <div className="flex items-center gap-2 text-text dark:text-text-dark">
          <Icon name="clockBold" className="w-5 h-5" />
          <span className="text-lg font-medium">{t('openingHours')}: </span>
          <span className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700">
            {t('open247')}
          </span>
        </div>
        
        {/* ALWAYS show lighting hours for 24/7 parks when is24Hours is true */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2">
            <Icon name="sunBold" className={`w-5 h-5 ${lightingHours?.endTime ? 'text-yellow-500 dark:text-yellow-300' : 'text-gray-500'}`} />
            <span className="font-semibold">{t('lightingHours')}: </span>
          </div>
          <div>
            <span className={!lightingHours?.endTime ? 'text-gray-500' : ''}>
              {lightingHours?.endTime 
                ? formatLightingHours(lightingHours.endTime, locale)
                : t('noLighting')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  // Group days with the same opening hours (convert format first)
  const convertedHours = convertOperatingHoursForFormatter(operatingHours);
  const { groupedDays, hoursByGroup, allDaysIdentical, allNonHolidayDaysIdentical } = groupDaysWithSameHours(convertedHours);
  
  // Sort scheduleKeys to ensure Friday and Saturday/Holidays are displayed last
  const sortScheduleKeys = (keys: string[]): string[] => {
    // Helper function to get display order
    const getDisplayOrder = (key: string): number => {
      if (key.startsWith('friday-')) return 90;
      if (key.startsWith('saturday-') || key.startsWith('weekend-')) return 95;
      if (key.startsWith('holiday-')) return 99;
      return 0; // Default for weekdays
    };
    
    return [...keys].sort((a, b) => getDisplayOrder(a) - getDisplayOrder(b));
  };

  // If all days have identical hours, show a simplified display
  if (allDaysIdentical) {
    const scheduleKey = Object.keys(groupedDays)[0];
    const schedule = hoursByGroup[scheduleKey];
    
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 text-text dark:text-text-dark">
          <Icon name="clockBold" className="w-5 h-5 " />
          <span className="text-lg font-medium">{t('openingHours')}</span>
        </div>
        
        {/* All week hours */}
        <div className="ml-6 flex items-start gap-1">
          <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">
            {t('allWeek')} :
          </span>
          
          <span className={schedule.isOpen ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}>
            {schedule.isOpen 
              ? scheduleKey === 'openAllDay'
                ? t('openAllDay')
                : formatTimeRange(schedule.openTime, schedule.closeTime, locale)
              : t('closedStatus')}
          </span>
        </div>
      </div>
    );
  }
  
  // If all days except holidays have identical hours, show "All week" and holidays separately
  if (allNonHolidayDaysIdentical && !allDaysIdentical) {
    const weekScheduleKey = 'all-week';
    const holidayScheduleKey = 'holiday-only';
    const weekSchedule = hoursByGroup[weekScheduleKey];
    const holidaySchedule = hoursByGroup[holidayScheduleKey];
    
    return (
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2  text-text dark:text-text-dark">
          <Icon name="clockBold" className="w-5 h-5 " />
          <span className="text-lg font-medium">{t('openingHours')}</span>
        </div>
        
        {/* All week hours */}
        <div className="ml-6 space-y-2">
          <div className="flex items-start gap-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">
              {t('allWeek')} :
            </span>
            
            <span className={weekSchedule.isOpen ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}>
              {weekSchedule.isOpen 
                ? formatTimeRange(weekSchedule.openTime, weekSchedule.closeTime, locale)
                : t('closedStatus')}
            </span>
          </div>
          
          {/* Holidays hours */}
          <div className="flex items-start gap-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">
              {t('holidays')} :
            </span>
            
            <span className={holidaySchedule.isOpen ? 'text-gray-900 dark:text-white' : 'font-semibold text-red-600 dark:text-red-400'}>
              {holidaySchedule.isOpen 
                ? formatTimeRange(holidaySchedule.openTime, holidaySchedule.closeTime, locale)
                : t('closedStatus')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-text dark:text-text-dark">
        <Icon name="clockBold" className="w-5 h-5" />
        <span className="text-lg font-medium">{t('openingHours')}</span>
      </div>
      
      {/* Hours by group */}
      <div className="ml-6 space-y-2 text-text/80 dark:text-text-dark/80">
        {sortScheduleKeys(Object.keys(groupedDays)).map(scheduleKey => {
          const days = groupedDays[scheduleKey];
          const schedule = hoursByGroup[scheduleKey];
          
          // Format the days string based on special cases
          let daysDisplay = formatDayRanges(days, locale);
          
          // Special cases for formatting display
          if (days.includes('saturday') && days.includes('holidays')) {
            daysDisplay = t('saturdayAndHolidays');
          }
          
          return (
            <div key={scheduleKey} className="flex items-start gap-1">
              <span className="font-semibold text-text/80 dark:text-text-dark/80 mr-2">
                {daysDisplay} :
              </span>
              
              <span className={schedule.isOpen ? 'text-gray-900 dark:text-white' : 'font-semibold text-red-600 dark:text-red-400'}>
                {schedule.isOpen 
                  ? (scheduleKey === 'openAllDay' || (schedule.openTime === '00:00' && schedule.closeTime === '00:00'))
                    ? t('openAllDay')
                    : formatTimeRange(schedule.openTime, schedule.closeTime, locale)
                  : t('closedStatus')}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Lighting Hours are not shown for non-24-hour parks */}
    </div>
  );
}

/**
 * Main Skatepark Page
 */
export default function SkateparkPage() {
  const pathname = usePathname();
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('skateparks');
  const tCommon = useTranslations('common');
  const { data: session, status } = useSession();
  const slug = params.slug as string;

  const [skatepark, setSkatepark] = useState<Skatepark | null>(null);
  const [nearbyParks, setNearbyParks] = useState<NearbyPark[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressCopied, setAddressCopied] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  useEffect(() => {
    fetchSkatepark();
  }, [slug]);


  useEffect(() => {
    // Detect theme from document class or localStorage
    const detectTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const currentTheme = storedTheme || (isDark ? 'dark' : prefersDark ? 'dark' : 'light');
      setTheme(currentTheme);
    };

    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listen for storage changes (when theme changes in other tabs)
    window.addEventListener('storage', detectTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', detectTheme);
    };
  }, []);

  const fetchSkatepark = async () => {
    setLoading(true);
    try {
      // Check localStorage for cached data
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);

      // Check cache first - if it exists and has the skatepark, use it immediately
      if (cachedData && cachedVersion) {
        try {
          const cachedSkateparks = JSON.parse(cachedData);
          if (Array.isArray(cachedSkateparks)) {
            const cachedSkatepark = cachedSkateparks.find((park: Skatepark) => park.slug === slug);
            if (cachedSkatepark) {
              // Use cached data immediately
              setSkatepark(cachedSkatepark);
              
              // Helper function to calculate distance (Haversine formula)
              const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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
              };
              
              // Calculate nearby parks from cache (same area, limit 4, excluding current)
              const currentCoords = cachedSkatepark.location.coordinates 
                ? { lat: cachedSkatepark.location.coordinates[1], lng: cachedSkatepark.location.coordinates[0] }
                : { lat: 0, lng: 0 };
              
              const nearbyFromCache = cachedSkateparks
                .filter((park: Skatepark) => 
                  park.slug !== slug && 
                  park.area === cachedSkatepark.area && 
                  park.status === 'active'
                )
                .map((park: Skatepark) => {
                  const parkCoords = park.location.coordinates
                    ? { lat: park.location.coordinates[1], lng: park.location.coordinates[0] }
                    : { lat: 0, lng: 0 };
                  
                  const distance = calcDistance(
                    currentCoords.lat,
                    currentCoords.lng,
                    parkCoords.lat,
                    parkCoords.lng
                  );
                  
                  return {
                    _id: park._id,
                    slug: park.slug,
                    name: park.name,
                    imageUrl: park.images?.[0]?.url || '/placeholder-skatepark.jpg',
                    area: park.area,
                    rating: (park as any).rating || 0, // Use rating from cache if available
                    totalReviews: (park as any).totalReviews || 0, // Use totalReviews from cache if available
                    location: {
                      lat: parkCoords.lat,
                      lng: parkCoords.lng,
                    },
                    distance,
                  };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 4)
                .map(({ distance, ...park }) => park); // Remove distance from final result
              
              setNearbyParks(nearbyFromCache);
              setLoading(false);
              
              // Only fetch reviews (not cached)
              await fetchReviews();
              
              return;
            }
          }
        } catch (e) {
          // If cache is corrupted, continue to fetch fresh data
          console.warn('Failed to parse cached skateparks data', e);
        }
      }

      // Cache doesn't exist, is invalid, or version changed - fetch fresh data
      // Fetch all skateparks to get the complete list and version
      const allSkateparksResponse = await fetch('/api/skateparks');
      if (!allSkateparksResponse.ok) {
        throw new Error('Failed to fetch all skateparks');
      }
      const allSkateparksData = await allSkateparksResponse.json();
      const currentVersion = allSkateparksData.version || 1;

      // Fetch current skatepark detail to get all fields (mediaLinks, operatingHours, etc.)
      const detailResponse = await fetch(`/api/skateparks/${slug}`);
      if (!detailResponse.ok) {
        if (detailResponse.status === 404) {
          // Handle 404
          return;
        }
        throw new Error('Failed to fetch skatepark detail');
      }
      const detailData = await detailResponse.json();

      // Cache is invalid or doesn't exist, use fresh data
      // Store the complete skatepark object with all fields including:
      // - mediaLinks (youtube, googleMapsFrame, googleMapsUrl)
      // - images, operatingHours, lightingHours, amenities
      // - notes, openingYear, closingYear, isFeatured, status
      setSkatepark(detailData.skatepark);
      setNearbyParks(detailData.nearbyParks || []);
      
      // Build complete skateparks array with all data
      // Start with the list from all skateparks API
      const allSkateparksMap = new Map<string, Skatepark>();
      
      // Helper to convert location format
      const convertLocation = (loc: any): { type: 'Point'; coordinates: [number, number] } => {
        if (loc?.coordinates && Array.isArray(loc.coordinates)) {
          return { type: 'Point', coordinates: loc.coordinates as [number, number] };
        }
        if (loc?.lat !== undefined && loc?.lng !== undefined) {
          return { type: 'Point', coordinates: [loc.lng, loc.lat] };
        }
        return { type: 'Point', coordinates: [0, 0] };
      };
      
      // Add all skateparks from the list (now they have complete fields including operatingHours, lightingHours, mediaLinks, notes)
      allSkateparksData.skateparks.forEach((park: any) => {
        // Convert list format to match Skatepark interface
        const skatepark: Skatepark = {
          _id: park._id,
          slug: park.slug,
          name: park.name,
          address: park.address,
          area: park.area,
          location: convertLocation(park.location),
          images: park.images || [],
          operatingHours: park.operatingHours || {} as OperatingHours,
          lightingHours: park.lightingHours,
          amenities: park.amenities || {},
          mediaLinks: park.mediaLinks || {},
          notes: park.notes || {},
          isFeatured: park.isFeatured || false,
          status: park.status || 'active',
          openingYear: park.openingYear,
          closingYear: park.closingYear,
        };
        allSkateparksMap.set(park.slug, skatepark);
      });
      
      // Merge existing cache if available (to preserve any additional detail data for other parks)
      // Note: Since the API now returns complete data, we primarily use API data as the source of truth
      if (cachedData) {
        try {
          const cachedSkateparks = JSON.parse(cachedData);
          if (Array.isArray(cachedSkateparks)) {
            cachedSkateparks.forEach((cachedPark: Skatepark) => {
              // Only keep cached parks that are still in the current list
              if (allSkateparksMap.has(cachedPark.slug)) {
                // Merge cached detail data with current list data (prefer API data, use cache as fallback)
                const listPark = allSkateparksMap.get(cachedPark.slug)!;
                allSkateparksMap.set(cachedPark.slug, {
                  ...listPark,
                  // Use API data first, fallback to cache only if API data is missing
                  operatingHours: listPark.operatingHours && Object.keys(listPark.operatingHours).length > 0 
                    ? listPark.operatingHours 
                    : (cachedPark.operatingHours || listPark.operatingHours),
                  lightingHours: listPark.lightingHours || cachedPark.lightingHours,
                  mediaLinks: listPark.mediaLinks && Object.keys(listPark.mediaLinks).length > 0
                    ? listPark.mediaLinks
                    : (cachedPark.mediaLinks || listPark.mediaLinks),
                  notes: listPark.notes && (Object.keys(listPark.notes).length > 0 || (Array.isArray(listPark.notes.en) && listPark.notes.en.length > 0))
                    ? listPark.notes
                    : (cachedPark.notes || listPark.notes),
                  location: listPark.location || cachedPark.location, // Preserve location format
                });
              }
            });
          }
        } catch (e) {
          console.warn('Failed to parse existing cache for merge', e);
        }
      }
      
      // Update/add current skatepark with full detail data
      allSkateparksMap.set(slug, {
        ...detailData.skatepark,
        // Ensure location format matches interface
        location: convertLocation(detailData.skatepark.location),
      });
      
      // Convert map to array and cache
      const allSkateparksArray = Array.from(allSkateparksMap.values());
      localStorage.setItem(cacheKey, JSON.stringify(allSkateparksArray));
      localStorage.setItem(versionKey, currentVersion.toString());
      
      // Log operating hours for debugging
      console.log('Operating Hours:', detailData.skatepark.operatingHours);
      
      await fetchReviews();
    } catch (error) {
      console.error('Error fetching skatepark:', error);
      
      // Try to use cache as fallback even if version doesn't match
      const cacheKey = 'skateparks_cache';
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const allSkateparks = JSON.parse(cachedData);
          if (Array.isArray(allSkateparks)) {
            const cachedSkatepark = allSkateparks.find((park: Skatepark) => park.slug === slug);
            if (cachedSkatepark) {
              setSkatepark(cachedSkatepark);
              setNearbyParks([]); // Nearby parks not available from cache
            }
          }
        } catch (e) {
          console.error('Failed to use cached data as fallback', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/skateparks/${slug}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleReviewSubmitted = async () => {
    setShowAddReview(false);
    await fetchReviews();
  };

  const getLocalizedText = (text: { en: string; he: string } | string): string => {
    if (typeof text === 'string') return text;
    return text[locale] || text.en || text.he || '';
  };

  const getLocalizedNotes = (notes: { en?: string[]; he?: string[] } | string | undefined): string => {
    if (!notes) return '';
    if (typeof notes === 'string') return notes;
    const localeNotes = notes[locale] || notes.en || notes.he || [];
    return Array.isArray(localeNotes) ? localeNotes.join('\n') : localeNotes;
  };

  const copyAddress = async () => {
    if (!skatepark) return;
    const address = getLocalizedText(skatepark.address);
    await navigator.clipboard.writeText(address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const getLocalizedNameHe = (): string => {
    if (!skatepark) return '';
    return skatepark.name.he || skatepark.name.en || '';
  };

  const getLocationCoords = () => {
    if (!skatepark) return { lng: 0, lat: 0 };
    if (skatepark.location.coordinates && Array.isArray(skatepark.location.coordinates)) {
      return { lng: skatepark.location.coordinates[0], lat: skatepark.location.coordinates[1] };
    }
    // Fallback for old format
    if ('lat' in skatepark.location && 'lng' in skatepark.location) {
      return { lat: (skatepark.location as any).lat, lng: (skatepark.location as any).lng };
    }
    return { lng: 0, lat: 0 };
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
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
  };

  const areaLabels: Record<'north' | 'center' | 'south', { en: string; he: string }> = {
    north: { en: 'North', he: 'צפון' },
    center: { en: 'Center', he: 'מרכז' },
    south: { en: 'South', he: 'דרום' },
  };

  const tr = (enText: string, heText: string) => (locale === 'he' ? heText : enText);

  const generateMoovitUrl = (): string => {
    if (!skatepark) return '#';
    const { lng, lat } = getLocationCoords();
    const baseUrl = 'https://moovit.onelink.me/3986059930';
    const encodedParkName = encodeURIComponent(`סקייטפארק ${getLocalizedNameHe()}`);
    const tll = `${lat}_${lng}`;
    return `${baseUrl}?to=${encodedParkName}&tll=${tll}&lang=${locale}`;
  };

  const generateWazeUrl = (): string => {
    if (!skatepark) return '#';
    const { lng, lat } = getLocationCoords();
    const baseUrl = 'https://waze.com/ul';
    const params = `ll=${lat},${lng}&navigate=yes&q=${encodeURIComponent(`סקייטפארק ${getLocalizedNameHe()}`)}`;
    return `${baseUrl}?${params}`;
  };

  const generateAppleMapsUrl = (): string => {
    if (!skatepark) return '#';
    const { lng, lat } = getLocationCoords();
    const baseUrl = 'https://maps.apple.com/';
    const params = `?ll=${lat},${lng}&q=${encodeURIComponent(`סקייטפארק ${getLocalizedNameHe()}`)}`;
    return `${baseUrl}${params}`;
  };

  const generateGoogleMapsUrl = (): string => {
    if (!skatepark) return '#';
    const { lng, lat } = getLocationCoords();
    const baseUrl = 'https://www.google.com/maps/dir/';
    const destination = `${lat},${lng}`;
    return `${baseUrl}?api=1&destination=${destination}`;
  };

  const getGoogleMapsIframeSrc = (): string | null => {
    if (!skatepark?.mediaLinks?.googleMapsFrame) {
      return null;
    }
    
    const googleMapsFrame = skatepark.mediaLinks.googleMapsFrame;
    
    // Try multiple extraction methods
    // Method 1: Extract src from iframe HTML string with double quotes
    let srcMatch = googleMapsFrame.match(/src=["]([^"]+)["]/i);
    
    // Method 2: Extract src from iframe HTML string with single quotes
    if (!srcMatch) {
      srcMatch = googleMapsFrame.match(/src=[']([^']+)[']/i);
    }
    
    // Method 3: Extract src with escaped quotes
    if (!srcMatch) {
      srcMatch = googleMapsFrame.match(/src=["']([^"']+)["']/i);
    }
    
    // Method 4: If it's already a URL (not wrapped in iframe), use it directly
    if (!srcMatch) {
      // Check if it looks like a URL
      const urlPattern = /^https?:\/\//i;
      if (urlPattern.test(googleMapsFrame.trim())) {
        return googleMapsFrame.trim();
      }
    }
    
    // Method 5: Try to find src attribute with more flexible regex
    if (!srcMatch) {
      srcMatch = googleMapsFrame.match(/src\s*=\s*["']?([^"'\s>]+)["']?/i);
    }
    
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1].trim();
    }
    
    return null;
  };

  // Sort reviews by newest first
  const sortedReviews = [...reviews].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-center -mb-5 mt-5">
            <Skeleton className="h-10 w-64 sm:w-96" />
          </div>

          {/* Image Gallery Skeleton */}
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            <Skeleton className="h-64 md:h-96 w-full rounded-lg" />
          </div>

          {/* Info Cards Skeleton */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Hours Card Skeleton */}
            <Card className="p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/80">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="ml-6 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </Card>

            {/* Amenities Card Skeleton */}
            <Card className="p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-wrap -mx-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1/4 px-1 mb-2">
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Notes Card Skeleton */}
          <div className="max-w-6xl mx-auto mb-8">
            <Card className="p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-3/4 rounded-md" />
              </div>
            </Card>
          </div>

          {/* Get Directions Skeleton */}
          <Card className="w-full !max-w-6xl mx-auto p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-16 h-16 rounded-xl" />
              ))}
            </div>
          </Card>

          {/* Map Skeleton */}
          <div className="w-full max-w-6xl mx-auto">
            <Skeleton className="h-32 sm:h-60 w-full rounded-3xl mb-8" />
          </div>

          {/* Reviews Section Skeleton */}
          <Card className="w-full max-w-6xl mx-auto backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
              
              {/* Rating Distribution Skeleton */}
              <div className="mb-6 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-12" />
                    <div className="flex-1">
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>

              {/* Review Cards Skeleton */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="border border-border-dark/20 dark:border-text-secondary-dark/70 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, j) => (
                            <Skeleton key={j} className="w-4 h-4 rounded" />
                          ))}
                        </div>
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-16 w-full mt-2" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Nearby Parks Skeleton */}
          <Card className="w-full max-w-6xl mx-auto backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card dark:bg-card-dark rounded-3xl overflow-hidden">
                    <Skeleton className="h-[10.5rem] w-full" />
                    <div className="px-4 py-3 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!skatepark) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('notFound')}
          </h1>
          <Link href={`/${locale}/skateparks`}>
            <Button variant="primary">{t('backToSkateparks')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const parkName = getLocalizedText(skatepark.name);
  const parkNameEn = skatepark.name.en || skatepark.name.he || '';
  const address = getLocalizedText(skatepark.address);
  const notes = getLocalizedNotes(skatepark.notes);

  // Get featured image (first image sorted by orderNumber, or first isFeatured image)
  const getFeaturedImage = (images: SkateparkImage[]): string | null => {
    if (!images || images.length === 0) return null;
    const featuredImg = images.find(img => img.isFeatured);
    if (featuredImg) return featuredImg.url;
    const sortedImages = [...images].sort((a, b) => a.orderNumber - b.orderNumber);
    return sortedImages[0]?.url || null;
  };

  const featuredImage = getFeaturedImage(skatepark.images);
  
  // Handle both new format (coordinates array) and old format (lat/lng)
  const getCoordinates = () => {
    if (skatepark.location.coordinates && Array.isArray(skatepark.location.coordinates)) {
      return { lng: skatepark.location.coordinates[0], lat: skatepark.location.coordinates[1] };
    }
    // Fallback for old format or missing coordinates
    if ('lat' in skatepark.location && 'lng' in skatepark.location) {
      return { lat: (skatepark.location as any).lat, lng: (skatepark.location as any).lng };
    }
    // Default fallback
    return { lng: 0, lat: 0 };
  };
  
  const { lng, lat } = getCoordinates();

  // Structured Data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: parkName,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: lat,
      longitude: lng,
    },
  };

  return (
    <TooltipProvider>
      <Script
        id="skatepark-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Blurred Background Image */}
      {featuredImage && (
        <div 
          className="bg-white dark:bg-background-dark fixed inset-0 z-[-1] bg-no-repeat w-[102%] h-[102%] -mt-2 bg-cover bg-center"
          style={{
            backgroundImage: `url(${featuredImage})`,
            filter: 'blur(5px) saturate(2)',
            WebkitFilter: 'blur(5px) saturate(2)',
          }}
        >
          {/* Overlay to further reduce contrast and improve readability */}
          <div className="absolute inset-0 bg-background-dark/30 dark:bg-background-dark/50"></div>
        </div>
      )}

      <div className="min-h-screen">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: tCommon('skateparks'), href: '/skateparks' },
            { label: parkName },
          ]}
        />

        <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header */}
          <h1 className="-mb-5 mt-5 text-4xl font-bold text-center text-white">
                    {/* Mobile version - splits on hyphens */}
                    <span className="sm:hidden">
                      {parkName.includes('-') ? 
                        parkName.split('-').map((part, index, array) => (
                          <Fragment key={index}>
                            {part.trim()}
                            {index < array.length - 1 && <br />}
                          </Fragment>
                        ))
                        : parkName
                      }
                    </span>
                    {/* Desktop version - no splitting */}
                    <span className="hidden sm:inline">
                      {parkName}
                    </span>
                  </h1>

          {/* Image Gallery */}
        <div className="">
          <div className="max-w-7xl mx-auto p-4 lg:p-6 overflow-visible">
            <ImageSlider images={getImageSliderImages(skatepark.images, locale, parkNameEn)} />
          </div>
        </div>

          {/* Info Cards */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Hours Card - Now using FormattedHours component */}
            <Card className="text-text/80 dark:text-text-dark/80 p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/80">
              <div className="flex gap-4 mb-4 justify-between">
                <div className={locale === 'he' ? '-ml-10' : ''}>
                  <FormattedHours
                    operatingHours={skatepark.operatingHours}
                    lightingHours={skatepark.lightingHours}
                    closingYear={skatepark.closingYear}
                    locale={locale}
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: parkName,
                          text: `${parkName} - Skatepark in ${skatepark.area.charAt(0).toUpperCase() + skatepark.area.slice(1)}`,
                          url: window.location.href
                        }).catch(console.error);
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        setAddressCopied(true);
                        setTimeout(() => setAddressCopied(false), 2000);
                      }
                    }}
                    className={`p-2 h-[35px] flex items-center justify-center rounded-lg ${
                      skatepark.closingYear
                        ? 'text-red-600 dark:text-red-400 shadow-md active:shadow-none border border-b-[4px] border-red-600 dark:border-red-400/20 active:border-b-[1px] active:translate-y-[2px] transition-all duration-200'
                        : 'text-brand-main dark:text-brand-dark shadow-md active:shadow-none border border-b-[4px] border-brand-main dark:border-brand-dark/30 active:border-b-[1px] active:translate-y-[2px] transition-all duration-200'
                    }`}
                    aria-label="Share"
                  >
                    <Icon name="shareBold" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Address Section */}
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <div className="flex items-center mb-3">
                  <h2 className="text-lg font-medium flex items-center gap-2 text-text dark:text-text-dark">
                    <Icon name="locationBold" className={`w-5 h-5`} />
                    {t('address')}
                  </h2>
                </div>

                <div className="flex flex-col gap-2 mb-2">
                  <span itemProp="address">{address}.</span>
                </div>
              </div>

              {/* Opening/Closing Year Section */}
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <div className="flex flex-col flex-wrap gap-2 mb-2">
                  {skatepark.openingYear && (
                    <span>{t('opened')} {skatepark.openingYear}.</span>
                  )}
                  {skatepark.closingYear && (
                    <span className='text-red-600 dark:text-red-400'>{t('closedYear')} {skatepark.closingYear}.</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Amenities Card */}
            <Card className="p-4 overflow-visible backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
              <div className="flex items-center justify-between mb-3 text-text dark:text-text-dark">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Icon name="notesBold" className={`w-5 h-5`} />
                  {t('amenities.title')}
                </h2>
              </div>

              {/* Amenities grid */}
              <div className="flex flex-wrap -mx-1">
                {Object.entries(skatepark.amenities).map(([key, value]) => {
                  const isAvailable = Boolean(value);
                  const isParkClosed = Boolean(skatepark.closingYear);
                  const iconName = AMENITY_ICONS[key as keyof typeof AMENITY_ICONS];
                  
                  if (!iconName) return null;

                  return (
                    <div key={key} className="w-1/4 px-1 mb-2">
                      {isAvailable ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`rounded-lg p-2 h-full cursor-pointer ${
                                isParkClosed
                                  ? 'bg-error/[8%] dark:bg-error-bg-dark/[15%]'
                                  : 'bg-brand-main/[8%] dark:bg-white/[2%]'
                              }`}
                            >
                              <div className="text-center">
                                <div className="mb-1.5">
                                  <Icon
                                    name={iconName as any}
                                    className={`w-5 h-5 mx-auto ${
                                      isParkClosed
                                        ? 'text-error dark:text-error/80' 
                                        : 'text-brand-main dark:text-brand-dark/80' 
                                    }`} 
                                  />
                                </div>
                                <div className={`text-xs font-thin ${
                                  isParkClosed
                                    ? 'text-text dark:text-text-dark' 
                                  : 'text-text dark:text-text-dark' 
                                }`}>
                                  {t(`amenities.${key}`) || key.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px] whitespace-normal">
                            <div>{t(`amenities.${key}Description`)}</div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="rounded-lg p-2 h-full bg-black/[3%] dark:bg-black/[5%] dark:shadow-inner">
                          <div className="text-center">
                            <div className="mb-1.5">
                              <Icon
                                name={iconName as any}
                                className="w-5 h-5 mx-auto text-gray-400 dark:text-[#40535e]"
                                />
                            </div>
                            <div className="text-xs font-thin text-gray-400 dark:text-text-dark/50 line-through">
                              {t(`amenities.${key}`) || key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Notes Card */}
          {notes && notes.trim() !== '' && (
            <div className="max-w-6xl mx-auto mb-8">
              <Card className="p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70">
                <div className="flex items-center mb-3 text-text dark:text-text-dark">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <Icon name="infoBold" className={`w-5 h-5`} />
                    {t('notes')}
                  </h2>
                </div>

                <div className="space-y-2">
                  {notes.split('\n').filter(note => note.trim()).map((note, index) => (
                    <div key={index} className="bg-gray-50/40 dark:bg-gray-400/10 w-fit px-2.5 py-1.5 rounded-md text-gray-900 dark:text-gray-300">
                      <div className="text-sm">
                        • {note.trim()}.
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Get Directions Section */}
          <Card className="w-full !max-w-6xl mx-auto p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 transition-all duration-200 transform-gpu">
            <Suspense fallback={
              <div className="w-full h-32 flex items-center justify-center">
                <LoadingSpinner className="h-32" />
              </div>
            }>
              <section 
                aria-labelledby="directions-heading"
                key={`map-links-${locale}`}
                className="space-y-4"
              >
                <h2 id="directions-heading" className="sr-only">{t('getDirections')}</h2>
                <div className="flex flex-col space-y-4 !mt-0">
                  <div className="flex items-center gap-2 ">
                    <Icon name="map" className="w-5 h-5 text-gray-900 dark:text-[#f2f2f2]" />
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-[#f2f2f2]">
                      {t('getDirections')}
                    </h3>
                  </div>

                  <div className="mx-auto w-full max-w-[220px] xsm:max-w-none flex flex-wrap justify-center gap-6 items-center">
                    {/* Waze Map Link with Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={generateWazeUrl()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label={`${t('waze')} ${parkName}`}
                          className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                        >
                          <Icon 
                            name={theme === 'dark' ? "wazeDark" : "wazeBold"} 
                            className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-[#1acdff] dark:text-gray-100 drop-shadow-md dark:drop-shadow-lg overflow-visible"
                          />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('waze')}
                      </TooltipContent>
                    </Tooltip>

                    {/* Moovit Link with Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={generateMoovitUrl()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label={`${t('moovit')} ${parkName}`}
                          className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                        >
                          <Icon 
                            name={theme === 'dark' ? "moovitDark" : "moovit"} 
                            className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-white dark:text-text drop-shadow-md dark:drop-shadow-lg overflow-visible"
                          />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('moovit')}
                      </TooltipContent>
                    </Tooltip>

                    {/* Apple Maps Link with Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={generateAppleMapsUrl()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label={`${t('appleMaps')} ${parkName}`}
                          className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                        >
                          <Icon 
                            name={theme === 'dark' ? "newAppleMapsDark" : "newAppleMaps"} 
                            className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-[#3a3a3a] dark:text-gray-300 drop-shadow-md dark:drop-shadow-lg overflow-visible"
                          />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('appleMaps')}
                      </TooltipContent>
                    </Tooltip>

                    {/* Google Maps Link with Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href={generateGoogleMapsUrl()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          aria-label={`${t('googleMaps')} ${parkName}`}
                          className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                        >
                          <Icon 
                            name="newGoogleMaps" 
                            className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-white dark:text-text drop-shadow-md dark:drop-shadow-lg overflow-visible"
                          />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t('googleMaps')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </section>
            </Suspense>
          </Card>

          {/* YouTube Embed */}
          {skatepark.mediaLinks.youtube && (
            <Card className="w-full max-w-6xl mx-auto backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 transition-all duration-200 transform-gpu">
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Icon name="youtube" className="w-5 h-5" />
                  {t('video')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YouTubeEmbed url={skatepark.mediaLinks.youtube} />
              </CardContent>
            </Card>
          )}

          {/* Map Section - Always render if skatepark exists */}
          {skatepark && (
            <section aria-labelledby="location-heading" className="w-full max-w-6xl mx-auto">
              <h2 id="location-heading" className="sr-only">{parkName} {tCommon('location')}</h2>

              <div className="backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 h-32 sm:h-60 rounded-3xl mb-8 overflow-hidden relative">
                {/* Shadow Overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-lg shadow-container z-10 dark:bg-background-dark/15"></div>
                
                {/* Border */}
                <div className="absolute inset-0 pointer-events-none rounded-3xl bord"></div>
                
                {(() => {
                  const iframeSrc = getGoogleMapsIframeSrc();
                  
                  if (iframeSrc) {
                    return (
                      <>
                        {isMapLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-custom z-10">
                            <LoadingSpinner />
                          </div>
                        )}
                        <iframe
                          src={iframeSrc}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`${parkName} ${tCommon('location')} ${tCommon('map')}`}
                          className="rounded-lg"
                          onLoad={() => setIsMapLoading(false)}
                          onError={() => setIsMapLoading(false)}
                        />
                      </>
                    );
                  } else {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground">
                          {tCommon('mapNotAvailable')}
                        </p>
                      </div>
                    );
                  }
                })()}
              </div>
            </section>
          )}

          {/* Reviews Section */}
          <Card className="w-full max-w-6xl mx-auto backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 transition-all duration-200 transform-gpu">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Icon name="messages" className="w-5 h-5" />
                  {t('reviewsCount')}
                </CardTitle>
                {status === 'loading' ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner className="h-5" />
                  </div>
                ) : session?.user ? (
                  <Button variant="primary" onClick={() => setShowAddReview(true)}>
                    {t('addReview')}
                  </Button>
                ) : (
                  <Link href={`/${locale}/login`}>
                    <Button variant="primary">
                      {tCommon('signIn')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {reviews.length > 0 && (
                <>
                  {/* Rating Distribution */}
                  <div className="mb-6 space-y-2">
                    {ratingDistribution.map(({ rating, count, percentage }) => (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-12">{rating} {t('stars')}</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Review Cards */}
                  <div className="space-y-4">
                    {(reviewsExpanded ? sortedReviews : sortedReviews.slice(0, 3)).map((review) => (
                      <div
                        key={review._id}
                        className="border border-border-dark/20 dark:border-text-secondary-dark/70 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {review.userName}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Icon
                                  key={star}
                                  name="star"
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mt-2">
                          {review.comment}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Expand/Collapse Button */}
                  {sortedReviews.length > 3 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => setReviewsExpanded(!reviewsExpanded)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-dark/20 dark:border-text-secondary-dark/70 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        aria-label={reviewsExpanded ? t('showLessReviews') : t('showMoreReviews', { count: sortedReviews.length - 3 })}
                      >
                        {reviewsExpanded ? (
                          <Minus className="w-5 h-5" />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                        <span className="font-medium">
                          {reviewsExpanded 
                            ? t('showLessReviews')
                            : t('showMoreReviews', { count: sortedReviews.length - 3 })}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {reviews.length === 0 && (
                <div className="py-8 text-center text-text/70 dark:text-text-dark/70 transition-colors duration-200">
                  <Icon name="messages" className="w-12 h-12 mx-auto mb-3" />
                  <p className=" mb-4">
                    {t('noReviewsYet')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nearby Parks */}
          {nearbyParks.length > 0 && (
            <Card className="w-full max-w-6xl mx-auto backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/70 transition-all duration-200 transform-gpu">
              <CardHeader className="flex flex-row items-center justify-start gap-2  text-text dark:text-text-dark">
              <Icon name="map" className="w-5 h-5 text-gray-900 dark:text-[#f2f2f2]" />
                <CardTitle className="!mt-0 text-lg font-medium">{t('nearbySkateparks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:grid sm-grid-cols-2 md:grid-cols-3 gap-4">
                  {nearbyParks.map((park, index) => {
                    const nearbyName = park.name[locale] || park.name.en || park.name.he;
                    const currentCoords = getLocationCoords();
                    const distance = park.location 
                      ? calculateDistance(
                          currentCoords.lat,
                          currentCoords.lng,
                          park.location.lat,
                          park.location.lng
                        )
                      : null;
                    const distanceText = distance !== null
                      ? `(${distance.toFixed(1)} ${tr('km', 'ק"מ')})`
                      : null;
                    const areaLabel = locale === 'he' ? areaLabels[park.area]?.he : areaLabels[park.area]?.en || park.area;
                    
                    // Hide items based on breakpoint:
                    // - Mobile: show only first 2 (index 0, 1)
                    // - Tablet: show first 3 (index 0, 1, 2)
                    // - Desktop: show first 4 (index 0, 1, 2, 3)
                    let hideClass = '';
                    if (index >= 4) {
                      hideClass = 'hidden'; // Always hide items beyond index 3
                    } else if (index >= 3) {
                      hideClass = 'hidden lg:block'; // Hide on mobile/tablet, show on desktop
                    } else if (index >= 2) {
                      hideClass = 'hidden md:block'; // Hide on mobile, show on tablet+
                    }
                    
                    return (
                      <Link
                        key={park._id}
                        href={`/${locale}/skateparks/${park.slug}`}
                        className={`h-fit hover:shadow-lg dark:hover:!scale-[1.02] bord bg-card dark:bg-card-dark rounded-3xl overflow-hidden cursor-pointer relative group select-none transform-gpu transition-all duration-200 ${hideClass}`}
                      >
                        <div className="relative bg-black/25 h-[10.5rem] overflow-hidden">
                          <Image
                            src={park.imageUrl}
                            alt={nearbyName}
                            fill
                            className="object-cover saturate-150 group-hover:saturate-[1.75] transition-all duration-200 rounded-t-3xl"
                          />
                        </div>
                        
                        <div className="px-4 py-3 space-y-1">
                          <h3 className="text-lg font-semibold truncate">
                            {nearbyName}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-gray-600 dark:text-gray-400 gap-2">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-sm truncate">
                                {distanceText ? `${areaLabel} ${distanceText}` : areaLabel}
                              </span>
                            </div>
                            {park.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Icon name="star" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {park.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Review Modal - Only show if logged in */}
      {showAddReview && session?.user && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-custom"
            onClick={() => setShowAddReview(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-lg shadow-sm border border-border-dark/20 dark:border-text-secondary-dark/70 p-4 backdrop-blur-custom bg-white/80 dark:bg-gray-800/70">
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('writeReview')}</h2>
                <button
                  onClick={() => setShowAddReview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  aria-label={t('closeModal')}
                >
                  <Icon name="X" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <ReviewForm
                  slug={slug}
                  onSubmitted={handleReviewSubmitted}
                  onCancel={() => setShowAddReview(false)}
                  inModal={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}


