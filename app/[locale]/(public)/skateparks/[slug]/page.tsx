
'use client';

import { useEffect, useState, useRef, useCallback, Suspense, Fragment } from 'react';
import {  useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { ChevronLeft, X } from 'lucide-react';
import { Icon } from '@/components/icons';
import { Button, Badge, Separator } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Breadcrumb from '@/components/common/Breadcrumb';
import ReviewForm from '@/components/reviews/ReviewForm';
import ParkImageGallery from '@/components/skateparks/ParkImageGallery';
import { ParkWeatherForecast } from '@/components/weather';
import {
  is24HourSchedule,
  groupDaysWithSameHours,
  formatDayRanges,
  formatLightingHours,
  formatTimeRange,
  type OperatingHours as OperatingHoursType,
} from '@/lib/utils/hoursFormatter';
import { generateLocalBusinessStructuredData, generateBreadcrumbStructuredData, getSkateparkMetaFromData } from '@/lib/seo/utils';
import { PLACEHOLDER_SKATEPARK_IMAGE } from '@/lib/constants/placeholders';
import { getSkateparksFetchedAtReadable } from '@/lib/search-from-cache';

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
  helpfulCount?: number;
  userHasMarkedHelpful?: boolean;
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
  nicknames?: {
    en?: string[];
    he?: string[];
  };
  qualityRating?: {
    elementDiversity?: number;
    cleanliness?: number;
    maintenance?: number;
  };
  isFeatured: boolean;
  status: 'active' | 'inactive';
  closingYear?: number | null;
  closingMonth?: number | null;
  openingYear?: number | null;
  openingMonth?: number | null;
  updatedAt?: string | Date;
  rating?: number;
  totalReviews?: number;
}

interface NearbyPark {
  _id: string;
  slug: string;
  name: { en: string; he: string };
  imageUrl: string;
  area: 'north' | 'center' | 'south';
  rating: number;
  totalReviews: number;
  closingYear?: number | null;
  location?: {
    lat: number;
    lng: number;
  };
}


const AMENITY_ICONS: Record<string, string> = {
  parking: 'parking',
  shade: 'shadeBold',
  bathroom: 'toilet',
  guard: 'securityGuard',
  seating: 'seatBold', // Using couch as closest match for seating
  nearbyRestaurants: 'foodBold',
  scootersAllowed: 'scooter',
  bikesAllowed: 'bmx-icon', // Using parking as placeholder
  entryFee: 'moneyBold',
  helmetRequired: 'helmet',
  bombShelter: 'safe-house',
  noWax: 'Wax', // Note: Wax icon exists, we'll show it crossed out for noWax
};

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
 * Google Maps Component for Detail Page
 */
function SkateparkDetailMap({
  skatepark,
  nearbyParks,
  locale,
}: {
  skatepark: Skatepark;
  nearbyParks?: NearbyPark[];
  locale: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const scriptLoadedRef = useRef(false);

  // Helper function to create skatepark marker pin
  const createSkateparkPin = (isCurrent: boolean = false) => {
    const pinElement = document.createElement('div');
    const pinColor = isCurrent ? '#00cc0a' : '#31c438';
    pinElement.innerHTML = `
      <svg width="40" height="50" overflow="visible" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0 C9.4 0 0 9.4 0 20 C0 35 20 50 20 50 C20 50 40 35 40 20 C40 9.4 30.6 0 20 0 Z" fill="${pinColor}" stroke="#18671c" stroke-width="2"/>
        <circle cx="20" cy="20" r="8" fill="#18671c"/>
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

        // Get current park coordinates
        let currentParkLat = 0;
        let currentParkLng = 0;
        if (skatepark.location.coordinates && Array.isArray(skatepark.location.coordinates)) {
          currentParkLng = skatepark.location.coordinates[0];
          currentParkLat = skatepark.location.coordinates[1];
        } else if ('lat' in skatepark.location && 'lng' in skatepark.location) {
          currentParkLat = (skatepark.location as any).lat;
          currentParkLng = (skatepark.location as any).lng;
        }

        if (currentParkLat === 0 && currentParkLng === 0) {
          console.error('Invalid park coordinates');
          return;
        }

        const center = { lat: currentParkLat, lng: currentParkLng };

        // Check if AdvancedMarkerElement is available (new API)
        const useAdvancedMarkers = google.maps.marker?.AdvancedMarkerElement;

        // Initialize map - mapId is required for AdvancedMarkerElement
        const mapOptions: any = {
          center,
          zoom: 14,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          language: locale === 'he' ? 'he' : 'en',
          mode: 'dark',
        };

        // Only add mapId if using AdvancedMarkerElement
        if (useAdvancedMarkers) {
          mapOptions.mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
        }

        const map = new google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach((marker) => {
          if (marker.map) marker.map = null;
        });
        markersRef.current = [];

        // Add current park marker with highlighted pin
        const parkName = typeof skatepark.name === 'string' 
          ? skatepark.name 
          : (locale === 'he' ? skatepark.name.he : skatepark.name.en) || skatepark.name.en || skatepark.name.he;

        let currentMarker: any;
        if (useAdvancedMarkers) {
          const pinContent = createSkateparkPin(true);
          currentMarker = new google.maps.marker.AdvancedMarkerElement({
            map,
            position: center,
            title: parkName,
            content: pinContent,
          });
        } else {
          currentMarker = new google.maps.Marker({
            position: center,
            map,
            title: parkName,
            icon: {
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 7,
              fillColor: '#00cc0a',
              fillOpacity: 1,
              strokeColor: '#18671c',
              strokeWeight: 2,
            },
          });
        }
        markersRef.current.push(currentMarker);

        // Add nearby parks markers if available
        if (nearbyParks && nearbyParks.length > 0) {
          nearbyParks.forEach((park) => {
            let parkLat = 0;
            let parkLng = 0;
            
            if (park.location) {
              if ('coordinates' in park.location && Array.isArray((park.location as any).coordinates)) {
                const coords = (park.location as any).coordinates;
                if (coords.length >= 2) {
                  parkLng = coords[0];
                  parkLat = coords[1];
                }
              } else if ('lat' in park.location && 'lng' in park.location) {
                parkLat = park.location.lat;
                parkLng = park.location.lng;
              }
            }

            if (parkLat === 0 && parkLng === 0) return;

            const nearbyName = typeof park.name === 'string' 
              ? park.name 
              : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;

            let marker: any;
            if (useAdvancedMarkers) {
              const pinContent = createSkateparkPin(false);
              marker = new google.maps.marker.AdvancedMarkerElement({
                map,
                position: { lat: parkLat, lng: parkLng },
                title: nearbyName,
                content: pinContent,
              });
            } else {
              marker = new google.maps.Marker({
                position: { lat: parkLat, lng: parkLng },
                map,
                title: nearbyName,
                icon: {
                  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                  scale: 6,
                  fillColor: '#31c438',
                  fillOpacity: 1,
                  strokeColor: '#18671c',
                  strokeWeight: 2,
                },
              });
            }
            markersRef.current.push(marker);
          });
        }
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    initMap();
  }, [skatepark, nearbyParks, locale]);

  return <div ref={mapRef} className="w-full h-full min-h-[400px] rounded-xl overflow-hidden" />;
}


/**
 * Image Gallery helper to convert SkateparkImage format to ImageSlider format
 */
function getImageSliderImages(images: SkateparkImage[], parkName: string): { url: string; alt?: string }[] {
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
    <div
       className="relative w-full aspect-video rounded-lg overflow-hidden"
       style={{
        filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
      }}
       >
      
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
 * Get month name by number (1-12) based on locale
 */
function getMonthName(monthNumber: number, locale: string): string {
  const monthNames: Record<string, string[]> = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
  };
  
  if (monthNumber >= 1 && monthNumber <= 12) {
    return monthNames[locale]?.[monthNumber - 1] || monthNames.en[monthNumber - 1];
  }
  return '';
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
        <div className="flex text-text dark:text-text-dark">
          <span className="flex gap-2 items-center px-2 py-1 rounded text-base sm:text-xl font-semibold border border-red-border dark:border-red-border-dark bg-red-bg dark:bg-red-bg-dark text-red dark:text-red-dark">
            {t('permanentlyClosed')}
          <Icon name="closedPark" className="w-5 h-5" />
          </span>
        </div>
        
        {/* Still show lighting hours for historical reference */}
        <div className="flex ltr:flex-col xsm:ltr:flex-row items-start gap-2">
          <div className="flex items-center gap-2">
            <Icon name="sunset" className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-semibold">{t('lightingHours')}: </h3>
          </div>
          <div>
            <p className="ps-7 xsm:ps-0 text-base sm:text-lg text-gray-500">{t('notApplicable')}</p>
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
          <h2 className="text-base sm:text-xl font-semibold">{t('openingHours')}: </h2>
          <Badge 
          variant="brandOutline" 
          className="inline-flex items-center px-2 py-1 !rounded !text-base sm:text-lg font-semibold"
            >
          {t('open247')}
          </Badge>
        </div>
        
        {/* ALWAYS show lighting hours for 24/7 parks when is24Hours is true */}
        <div className={`flex flex-col lg:flex-row items-start gap-2 ${locale === 'he' ? 'flex-col xsm:flex-row' : ''}`}>
          <div className="flex items-center gap-2">
            <Icon name="sunset" className={`w-5 h-5 ${lightingHours?.endTime ? 'text-yellow-500 dark:text-yellow-300' : 'text-gray-500'}`} />
            <h3 className="text-base sm:text-lg font-semibold text-text dark:text-text-dark">{t('lightingHours')}: </h3>
          </div>
          <div>
            <p className={`ps-7 lg:ps-0 text-base sm:text-lg ${!lightingHours?.endTime ? 'text-gray-500' : 'text-text dark:text-text-dark'}`}>
              {lightingHours?.endTime 
                ? formatLightingHours(lightingHours.endTime, locale)
                : t('noLighting')}
            </p>
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
          <h2 className="text-base font-semibold">{t('openingHours')}</h2>
        </div>
        
        {/* All week hours */}
        <div className="flex items-start gap-1">
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mr-2">
            {t('allWeek')} :
          </p>
          
          <p className={`text-base ${schedule.isOpen ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
            {schedule.isOpen 
              ? scheduleKey === 'openAllDay'
                ? t('openAllDay')
                : formatTimeRange(schedule.openTime, schedule.closeTime, locale)
              : t('closedStatus')}
          </p>
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
          <h2 className="text-base font-semibold">{t('openingHours')}</h2>
        </div>
        
        {/* All week hours */}
        <div className="space-y-2">
          <div className="flex items-start gap-1">
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mr-2">
              {t('allWeek')} :
            </p>
            
            <p className={`text-base ${weekSchedule.isOpen ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
              {weekSchedule.isOpen 
                ? formatTimeRange(weekSchedule.openTime, weekSchedule.closeTime, locale)
                : t('closedStatus')}
            </p>
          </div>
          
          {/* Holidays hours */}
          <div className="flex items-start gap-1">
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mr-2">
              {t('holidays')} :
            </p>
            
            <p className={`text-base ${holidaySchedule.isOpen ? 'text-gray-900 dark:text-white' : 'font-semibold text-red-600 dark:text-red-400'}`}>
              {holidaySchedule.isOpen 
                ? formatTimeRange(holidaySchedule.openTime, holidaySchedule.closeTime, locale)
                : t('closedStatus')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-text dark:text-text-dark">
        <Icon name="clockBold" className="w-4 h-4" />
        <h2 className="text-base sm:text-xl font-semibold">{t('openingHours')}</h2>
      </div>
      
      {/* Hours by group */}
      <div className="space-y-2 text-text dark:text-text-dark">
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
            <div key={scheduleKey} className="flex items-center gap-1">
              <p className="text-base sm:text-lg font-semibold text-text dark:text-text-dark mr-2">
                {daysDisplay} :
              </p>
              
              <p className={`text-base sm:text-lg ${schedule.isOpen ? 'text-text dark:text-text-dark' : 'font-semibold text-red-600 dark:text-red-400'}`}>
                {schedule.isOpen 
                  ? (scheduleKey === 'openAllDay' || (schedule.openTime === '00:00' && schedule.closeTime === '00:00'))
                    ? t('openAllDay')
                    : formatTimeRange(schedule.openTime, schedule.closeTime, locale)
                  : t('closedStatus')}
              </p>
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
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('skateparks');
  const tCommon = useTranslations('common');
  const { data: session, status } = useSession();
  const slug = params.slug as string;

  const [skatepark, setSkatepark] = useState<Skatepark | null>(null);
  const [nearbyParks, setNearbyParks] = useState<NearbyPark[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userHasReviewed, setUserHasReviewed] = useState<boolean | undefined>(undefined);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showAddReview, setShowAddReview] = useState(false);
  const [reviewModalClosing, setReviewModalClosing] = useState(false);
  const reviewModalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showThankYouPopup, setShowThankYouPopup] = useState(false);
  const thankYouPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [helpedReviewIds, setHelpedReviewIds] = useState<Set<string>>(new Set());
  const pendingHelpfulRef = useRef<Map<string, { method: 'PATCH' | 'DELETE'; timeoutId: ReturnType<typeof setTimeout> }>>(new Map());
  const [amenitiesActive, setAmenitiesActive] = useState(false);
  const [clickedNearbyParkId, setClickedNearbyParkId] = useState<string | null>(null);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  useEffect(() => {
    fetchSkatepark();
  }, [slug]);

  useEffect(() => {
    return () => {
      if (thankYouPopupTimeoutRef.current) clearTimeout(thankYouPopupTimeoutRef.current);
      if (reviewModalCloseTimeoutRef.current) clearTimeout(reviewModalCloseTimeoutRef.current);
      pendingHelpfulRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
      pendingHelpfulRef.current.clear();
    };
  }, []);

  const closeReviewModal = useCallback(() => {
    if (reviewModalClosing) return;
    setReviewModalClosing(true);
    reviewModalCloseTimeoutRef.current = setTimeout(() => {
      setShowAddReview(false);
      setReviewModalClosing(false);
      reviewModalCloseTimeoutRef.current = null;
    }, 320);
  }, [reviewModalClosing]);

  // Debug: Log environment variables (remove after debugging)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Review env vars:', {
        NEXT_PUBLIC_ENABLE_USERREVIEWS: process.env.NEXT_PUBLIC_ENABLE_USERREVIEWS,
        NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS: process.env.NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS,
      });
    }
  }, []);


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

  useEffect(() => {
    // Reset and activate amenities after 1s delay when skatepark loads
    setAmenitiesActive(false);
    const timer = setTimeout(() => {
      setAmenitiesActive(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [skatepark]);

  // Sync document head (title, meta) when skatepark loads so SEO meta tags are set
  // even when server metadata wasn't applied (e.g. client-side nav without cache)
  useEffect(() => {
    if (!skatepark || !slug || typeof locale !== 'string') return;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
    const meta = getSkateparkMetaFromData(skatepark as any, locale, slug);
    const imageUrl = meta.image.startsWith('http') ? meta.image : `${siteUrl}${meta.image}`;
    const canonicalUrl = meta.url.startsWith('http') ? meta.url : `${siteUrl}${meta.url}`;

    document.title = meta.title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`${selector}[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta('meta', 'name', 'description', meta.description);
    setMeta('meta', 'property', 'og:title', meta.title);
    setMeta('meta', 'property', 'og:description', meta.description);
    setMeta('meta', 'property', 'og:image', imageUrl);
    setMeta('meta', 'property', 'og:url', canonicalUrl);
    setMeta('meta', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta', 'name', 'twitter:title', meta.title);
    setMeta('meta', 'name', 'twitter:description', meta.description);
    setMeta('meta', 'name', 'twitter:image', imageUrl);
    if (meta.keywords) {
      setMeta('meta', 'name', 'keywords', meta.keywords);
    }
  }, [skatepark, slug, locale]);

  // Validate image URL and return a safe fallback if invalid
  const getValidImageUrl = (url: string | undefined | null): string => {
    if (!url) return PLACEHOLDER_SKATEPARK_IMAGE;

    // Check if URL is from allowed domains or is a relative path
    const allowedDomains = ['res.cloudinary.com', 'placehold.co'];
    const isRelative = url.startsWith('/');
    const isAllowedDomain = allowedDomains.some(domain => url.includes(domain));

    // If it's a relative path or from allowed domain, use it
    if (isRelative || isAllowedDomain) {
      return url;
    }

    // Otherwise, use inline placeholder (no network request)
    return PLACEHOLDER_SKATEPARK_IMAGE;
  };

  const fetchSkatepark = async () => {
    setLoading(true);
    try {
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';

      const getCachedPark = (): Skatepark | null => {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const park = parsed.find((p: Skatepark) => p.slug === slug) || null;
              if (park) return park;
            }
          }
          const inactiveRaw = localStorage.getItem('skateparks_cache_inactive');
          if (inactiveRaw) {
            const inactive = JSON.parse(inactiveRaw);
            if (Array.isArray(inactive)) {
              return inactive.find((p: Skatepark) => p.slug === slug) || null;
            }
          }
        } catch {
          // ignore
        }
        return null;
      };

      const refreshSkateparksCache = async (): Promise<void> => {
        const res = await fetch('/api/skateparks');
        if (!res.ok) return;
        const data = await res.json();
        const version = data.version || 1;
        const parks = data.skateparks || [];
        localStorage.setItem(cacheKey, JSON.stringify(parks));
        localStorage.setItem(
          versionKey,
          JSON.stringify({ version, fetchedAt: getSkateparksFetchedAtReadable() })
        );
      };

      // 1) Try to find park in cache (active + inactive)
      let cachedSkatepark: Skatepark | null = getCachedPark();

      // 2) If not in cache, refresh skateparks_cache then look again
      if (!cachedSkatepark) {
        await refreshSkateparksCache();
        cachedSkatepark = getCachedPark();
      }

      // 3) If still no data for this park after refresh, show 404
      if (!cachedSkatepark) {
        setSkatepark(null);
        setReviewsLoading(false);
        setLoading(false);
        return;
      }

      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersion = localStorage.getItem(versionKey);
      let cachedSkateparks: Skatepark[] = [];
      
      if (cachedData && cachedVersion) {
        try {
          const parsedData = JSON.parse(cachedData);
          if (Array.isArray(parsedData)) {
            cachedSkateparks = parsedData;
            // cachedSkatepark already set above from getCachedPark()
          }
        } catch (e) {
          // Failed to parse active parks cache
        }
      }
      
      // If not found in active parks, ensure we have it from inactive (getCachedPark already did that)
      if (!cachedSkateparks.find((p: Skatepark) => p.slug === slug)) {
        try {
          const inactiveCacheKey = 'skateparks_cache_inactive';
          const inactiveCachedData = localStorage.getItem(inactiveCacheKey);
          if (inactiveCachedData) {
            const inactiveParks = JSON.parse(inactiveCachedData);
            if (Array.isArray(inactiveParks)) {
              cachedSkateparks = [...cachedSkateparks, ...inactiveParks];
            }
          }
        } catch (e) {
          // Failed to parse inactive parks cache
        }
      }
      
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
        
        // Calculate nearby parks from cache (sorted by distance, limit 4, excluding current)
        // Extract current park coordinates - handle multiple formats
        let currentCoords = { lat: 0, lng: 0 };
        
        if (cachedSkatepark.location) {
          // Try GeoJSON format first: { coordinates: [lng, lat] }
          if (cachedSkatepark.location.coordinates && Array.isArray(cachedSkatepark.location.coordinates)) {
            const coords = cachedSkatepark.location.coordinates;
            if (coords.length >= 2) {
              currentCoords = { lat: coords[1], lng: coords[0] };
            }
          }
          // Try { lat, lng } format
          else if ('lat' in cachedSkatepark.location && 'lng' in cachedSkatepark.location) {
            currentCoords = {
              lat: (cachedSkatepark.location as any).lat,
              lng: (cachedSkatepark.location as any).lng
            };
          }
        }
        
        // Only proceed if current park has valid coordinates
        if (currentCoords.lat !== 0 && currentCoords.lng !== 0) {
          // Get inactive parks from cache and merge with active parks
          let allCachedParks = [...cachedSkateparks];
          try {
            const inactiveCacheKey = 'skateparks_cache_inactive';
            const inactiveCachedData = localStorage.getItem(inactiveCacheKey);
            if (inactiveCachedData) {
              const inactiveParks = JSON.parse(inactiveCachedData);
              if (Array.isArray(inactiveParks)) {
                // Merge inactive parks, avoiding duplicates by slug
                const activeSlugs = new Set(cachedSkateparks.map((p: Skatepark) => p.slug));
                const uniqueInactiveParks = inactiveParks.filter((p: Skatepark) => !activeSlugs.has(p.slug));
                allCachedParks = [...cachedSkateparks, ...uniqueInactiveParks];
              }
            }
          } catch (e) {
            // Failed to merge inactive parks, continue with active parks only
          }
          
          // Filter parks (same area only, now includes both active and inactive)
          const currentArea = cachedSkatepark.area;
          const filteredParks = allCachedParks.filter((park: Skatepark) => {
            const sameArea = currentArea && park.area === currentArea;
            const hasValidSlug = park.slug !== slug;
            const hasValidLocation = park.location && (
              (park.location.coordinates && Array.isArray(park.location.coordinates) && park.location.coordinates.length >= 2) ||
              (park.location && 'lat' in park.location && 'lng' in park.location)
            );
            
            return sameArea && hasValidSlug && hasValidLocation;
          });
          
          // Shuffle for variety so it won't show the same parks every time
          const shuffleArray = <T,>(arr: T[]): T[] => {
            const out = [...arr];
            for (let i = out.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [out[i], out[j]] = [out[j], out[i]];
            }
            return out;
          };
          
          const nearbyFromCache = shuffleArray(
            filteredParks
            .map((park: Skatepark) => {
              // Extract coordinates - handle both formats
              let parkCoords = { lat: 0, lng: 0 };
              
              if (park.location) {
                // Try GeoJSON format first: { coordinates: [lng, lat] }
                if (park.location.coordinates && Array.isArray(park.location.coordinates)) {
                  const coords = park.location.coordinates;
                  if (coords.length >= 2) {
                    parkCoords = { lat: coords[1], lng: coords[0] };
                  }
                }
                // Try { lat, lng } format
                else if ('lat' in park.location && 'lng' in park.location) {
                  parkCoords = {
                    lat: (park.location as any).lat,
                    lng: (park.location as any).lng
                  };
                }
              }
              
              // Skip parks with invalid coordinates
              if (parkCoords.lat === 0 && parkCoords.lng === 0) {
                return null;
              }
              
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
                imageUrl: getValidImageUrl(park.images?.[0]?.url),
                area: park.area,
                rating: (park as any).rating || 0, // Use rating from cache if available
                totalReviews: (park as any).totalReviews || 0, // Use totalReviews from cache if available
                closingYear: (park as any).closingYear || null, // Include closingYear from cache
                location: {
                  lat: parkCoords.lat,
                  lng: parkCoords.lng,
                },
                distance,
              };
            })
            .filter((park): park is NonNullable<typeof park> => park !== null) // Remove null entries
          )
            .slice(0, 4) // Take 4 after shuffle for variety
            .map(({ distance, ...park }) => park); // Remove distance from final result
          
          setNearbyParks(nearbyFromCache);
          setLoading(false);
          
          // Only fetch reviews (not cached)
          await fetchReviews();
          
          return;
        } else {
          // Don't return - continue to fetch from API
          // But still set the skatepark from cache for faster display
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
          setSkatepark(null);
          setReviewsLoading(false);
          setLoading(false);
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
          // Failed to parse existing cache for merge
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
      
      await fetchReviews();
    } catch (error) {
      // Error fetching skatepark
      
      // Try to use cache as fallback even if version doesn't match
      // Check both active and inactive parks cache
      const cacheKey = 'skateparks_cache';
      const cachedData = localStorage.getItem(cacheKey);
      let fallbackSkatepark: Skatepark | null = null;
      
      if (cachedData) {
        try {
          const allSkateparks = JSON.parse(cachedData);
          if (Array.isArray(allSkateparks)) {
            fallbackSkatepark = allSkateparks.find((park: Skatepark) => park.slug === slug) || null;
          }
        } catch (e) {
          // Failed to parse active parks cache
        }
      }
      
      // If not found in active parks, check inactive parks cache
      if (!fallbackSkatepark) {
        try {
          const inactiveCacheKey = 'skateparks_cache_inactive';
          const inactiveCachedData = localStorage.getItem(inactiveCacheKey);
          if (inactiveCachedData) {
            const inactiveParks = JSON.parse(inactiveCachedData);
            if (Array.isArray(inactiveParks)) {
              fallbackSkatepark = inactiveParks.find((park: Skatepark) => park.slug === slug) || null;
            }
          }
        } catch (e) {
          // Failed to parse inactive parks cache
        }
      }
      
      if (fallbackSkatepark) {
        setSkatepark(fallbackSkatepark);
        setNearbyParks([]); // Nearby parks not available from cache
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    try {
      // NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS=true  → show all reviews (en + he) regardless of current locale
      // NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS=false → show only reviews that have content for the current locale
      const filterByLocale = process.env.NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS !== 'true';
      const url = `/api/skateparks/${slug}/reviews?locale=${locale}${filterByLocale ? '&filterByLocale=1' : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setHelpedReviewIds(
          new Set(
            (data.reviews || []).filter((r: Review) => r.userHasMarkedHelpful).map((r: Review) => r._id)
          )
        );
        if (typeof data.userHasReviewed === 'boolean') {
          setUserHasReviewed(data.userHasReviewed);
        }
      }
    } catch (error) {
      // Error fetching reviews
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleReviewSubmitted = async () => {
    setShowAddReview(false);
    setShowThankYouPopup(true);
    const autoApprove = process.env.NEXT_PUBLIC_ENABLE_AUTO_APPROVE_REVIEWS === 'true';
    const popupDurationMs = autoApprove ? 1750 : 3500;
    if (thankYouPopupTimeoutRef.current) clearTimeout(thankYouPopupTimeoutRef.current);
    thankYouPopupTimeoutRef.current = setTimeout(() => {
      setShowThankYouPopup(false);
      thankYouPopupTimeoutRef.current = null;
    }, popupDurationMs);
    if (autoApprove) {
      await fetchReviews();
    }
  };

  const DEFERRED_HELPFUL_DELAY_MS = 2500;

  const handleToggleHelpful = (review: Review) => {
    const reviewId = review._id;
    const isCurrentlyHelpful = hasMarkedHelpful(review);
    const method = isCurrentlyHelpful ? 'DELETE' : 'PATCH';
    const currentCount = Math.max(0, review.helpfulCount ?? 0);
    const nextCount = isCurrentlyHelpful ? Math.max(0, currentCount - 1) : currentCount + 1;

    // Clear any pending request for this review
    const pending = pendingHelpfulRef.current.get(reviewId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingHelpfulRef.current.delete(reviewId);
    }

    // 1. Optimistic UI: update state immediately (no server call yet)
    if (isCurrentlyHelpful) {
      setHelpedReviewIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    } else {
      setHelpedReviewIds((prev) => new Set(prev).add(reviewId));
    }
    setReviews((prev) =>
      prev.map((r) =>
        r._id === reviewId
          ? {
              ...r,
              helpfulCount: nextCount,
              userHasMarkedHelpful: !isCurrentlyHelpful,
            }
          : r
      )
    );

    // 2. Send to server after a delay
    const timeoutId = setTimeout(() => {
      pendingHelpfulRef.current.delete(reviewId);
      fetch(`/api/reviews/${reviewId}/helpful`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Helpful request failed');
        })
        .then((data) => {
          setReviews((prev) =>
            prev.map((r) =>
              r._id === reviewId
                ? {
                    ...r,
                    helpfulCount: data.helpfulCount ?? r.helpfulCount,
                    userHasMarkedHelpful: !isCurrentlyHelpful,
                  }
                : r
            )
          );
        })
        .catch(() => {
          // Revert optimistic update on failure
          if (isCurrentlyHelpful) {
            setHelpedReviewIds((prev) => new Set(prev).add(reviewId));
          } else {
            setHelpedReviewIds((prev) => {
              const next = new Set(prev);
              next.delete(reviewId);
              return next;
            });
          }
          setReviews((prev) =>
            prev.map((r) =>
              r._id === reviewId
                ? {
                    ...r,
                    helpfulCount: currentCount,
                    userHasMarkedHelpful: isCurrentlyHelpful,
                  }
                : r
            )
          );
        });
    }, DEFERRED_HELPFUL_DELAY_MS);

    pendingHelpfulRef.current.set(reviewId, { method, timeoutId });
  };

  const getLocalizedText = (text: { en: string; he: string } | string): string => {
    if (typeof text === 'string') return text;
    return (text as any)[locale] || text.en || text.he || '';
  };

  const getLocalizedNotes = (notes: { en?: string[]; he?: string[] } | string | undefined): string => {
    if (!notes) return '';
    if (typeof notes === 'string') return notes;
    const localeNotes = (notes as any)[locale] || notes.en || notes.he || [];
    return Array.isArray(localeNotes) ? localeNotes.join('\n') : localeNotes;
  };

  const formatRating = (rating: number): string => {
    return Number.isInteger(rating) ? rating.toString() : rating.toFixed(1);
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

  const tr = (enText: string, heText: string) => (locale === 'he' ? heText : enText);

  const generateMoovitUrl = (): string => {
    if (!skatepark) return '#';
    const { lng, lat } = getLocationCoords();
    const parkName = `סקייטפארק ${getLocalizedNameHe()}`;
    const encodedName = encodeURIComponent(parkName);
  
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
    if (isMobile) {
      /**
       * Using 'directions' instead of 'nearby'
       * auto_run=true triggers the search immediately
       */
      return `moovit://directions?dest_lat=${lat}&dest_lon=${lng}&dest_name=${encodedName}&auto_run=true&partner_id=SkateApp`;
    }
  
    // Desktop/Web Fallback
    return `https://moovitapp.com/directions?dest_lat=${lat}&dest_lon=${lng}&dest_name=${encodedName}&auto_run=true&lang=${locale}`;
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

  /** True if the review's displayed content contains Hebrew script (use font-assistant). */
  const reviewFontClass = (review: Review) =>
    /[\u0590-\u05FF]/.test((review.userName || '') + (review.comment || ''))
      ? 'font-assistant'
      : 'font-poppins';

  const hasMarkedHelpful = (review: Review) =>
    helpedReviewIds.has(review._id) || !!review.userHasMarkedHelpful;

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  if (loading) {
    return (
      <div className="pt-[4.3rem] min-h-screen">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto overflow-visible">
          {/* Breadcrumb Skeleton */}
          <div className="hidden md:block mb-4">
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Header Skeleton */}
          <div className="hidden sm:flex justify-center -mb-5 mt-5">
            <Skeleton className="h-10 w-64 sm:w-96" />
          </div>

          {/* Image Gallery Skeleton - skeleton while images load */}
          <div className="w-full">
            <div className="-overflow-hidden">
              <div className="hidden md:flex md:flex-row gap-2 p-2">
                <Skeleton className="w-2/3 aspect-[4/3] rounded-xl" />
                <div className="flex flex-col w-1/3 gap-2">
                  <Skeleton className="flex-1 rounded-xl" />
                  <Skeleton className="flex-1 rounded-xl" />
                </div>
              </div>
              <div className="md:hidden relative">
                <div
                  className="relative w-full flex overflow-hidden"
                  style={{ height: 'calc(70vh - 200px)' }}
                >
                  <Skeleton className="flex-shrink-0 w-full h-full rounded-none" />
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards Skeleton - Hours + Amenities */}
          <div className="w-full px-2 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="pt-6 md:p-4 rounded-lg shadow-none">
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
            <Card className="md:p-4 rounded-lg shadow-none">
              <div className="flex items-center md:justify-center gap-2 mb-3">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-wrap -mx-1">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="w-1/4 px-1 mb-2">
                    <Skeleton className="h-20 w-full rounded-md" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Notes and Get Directions Combined Section Skeleton */}
          <div className="w-full px-2 max-w-6xl mx-auto mb-8">
            <Card className="!overflow-visible !p-0 shadow-none grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-6">
              {/* Notes Section Skeleton */}
              <div className="md:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-3/4 rounded-md" />
                </div>
              </div>

              {/* Get Directions Section Skeleton */}
              <div className="md:p-4 space-y-4">
                <div className="flex items-center gap-2 justify-start md:justify-center">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="mx-auto w-full max-w-[380px] grid grid-cols-4 gap-4 items-center">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-16 h-16 rounded-xl" />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Weather Forecast Skeleton - matches ParkWeatherForecast layout */}
          <div className="w-full px-2 max-w-6xl mx-auto">
            <Card className="!p-0 shadow-none rounded-none">
              <div className="p-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="px-2 pb-2">
                <div className="flex gap-1 sm:gap-2 pb-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[65px] flex-1 py-3 px-1 rounded-lg bg-gray-bg/50 dark:bg-gray-bg-dark/50">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-4 w-10 mt-1" />
                      <div className="my-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-8" />
                      <div className="mt-2 h-4 flex items-center justify-center">
                        <Skeleton className="h-3 w-9" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Map Section Skeleton */}
          <div className="w-full px-2 max-w-6xl mx-auto">
            <Card className="shadow-none rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="w-full h-40 sm:h-60 rounded-xl" />
            </Card>
          </div>

          {/* Quality Rating Section Skeleton */}
          <div className="w-full px-2 max-w-6xl mx-auto">
            <Card className="shadow-none rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Reviews Section Skeleton */}
          <div className="w-full px-2 max-w-6xl mx-auto">
            <Card className="shadow-none rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-2 flex-1 rounded-full" />
                      <Skeleton className="h-4 w-6" />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            </Card>
          </div>

          {/* Nearby Parks Section Skeleton */}
          <div className="w-full px-2 max-w-6xl mx-auto mb-12">
            <Card className="shadow-none rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-6 w-40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!skatepark) {
    const backHref = `/${locale}/skateparks`;
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            {t('notFound')}
          </h1>
          <Button
            variant="primary"
            disabled={isNavigatingBack}
            className={`inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full flex-shrink-0 min-w-[110px] ${locale === 'he' ? 'flex-row' : 'flex-row'}`}
            onClick={() => {
              setIsNavigatingBack(true);
              router.push(backHref);
            }}
          >
            {isNavigatingBack ? (
              <LoadingSpinner size={20} variant="brandText" className="!h-5 !w-5" />
            ) : (
              <>
                <ChevronLeft className={`w-4 h-4 ${locale === 'he' ? 'rotate-180' : ''}`} />
                {t('backToSkateparks')}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const parkName = getLocalizedText(skatepark.name);
  const address = getLocalizedText(skatepark.address);
  const notes = getLocalizedNotes(skatepark.notes);
  const nicknamesLocale = (skatepark.nicknames?.[locale === 'he' ? 'he' : 'en'] ?? []).filter(Boolean);
  const nicknamesStr = nicknamesLocale.join(', ');

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

  // Enhanced Structured Data for SEO using LocalBusiness schema
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const is24Hours = skatepark.lightingHours?.is24Hours || is24HourSchedule(convertOperatingHoursForFormatter(skatepark.operatingHours));
  
  // Convert operating hours to the format expected by the schema generator
  const operatingHoursForSchema = skatepark.operatingHours ? convertOperatingHoursForFormatter(skatepark.operatingHours) : undefined;
  
  const structuredData = generateLocalBusinessStructuredData({
    name: skatepark.name,
    address: skatepark.address,
    location: { lat, lng },
    rating: (skatepark.rating && skatepark.rating > 0) ? skatepark.rating : undefined,
    totalReviews: (skatepark.totalReviews && skatepark.totalReviews > 0) ? skatepark.totalReviews : undefined,
    operatingHours: operatingHoursForSchema,
    is24Hours,
    slug: skatepark.slug,
    locale,
    siteUrl,
  });

  // Add additional structured data fields
  if (skatepark.images && skatepark.images.length > 0) {
    const images = skatepark.images
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .slice(0, 5)
      .map(img => img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`);
    structuredData.image = images;
  }

  // Add amenities if available
  const availableAmenities: string[] = [];
  Object.entries(skatepark.amenities).forEach(([key, value]) => {
    if (value) {
      availableAmenities.push(key);
    }
  });
  if (availableAmenities.length > 0) {
    structuredData.amenityFeature = availableAmenities.map(amenity => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity,
      value: true,
    }));
  }

  // Add quality rating if available
  if (skatepark.qualityRating) {
    const qualityScores: number[] = [];
    if (skatepark.qualityRating.elementDiversity) qualityScores.push(skatepark.qualityRating.elementDiversity);
    if (skatepark.qualityRating.cleanliness) qualityScores.push(skatepark.qualityRating.cleanliness);
    if (skatepark.qualityRating.maintenance) qualityScores.push(skatepark.qualityRating.maintenance);
    
    if (qualityScores.length > 0) {
      const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      structuredData.starRating = {
        '@type': 'Rating',
        ratingValue: avgQuality.toFixed(1),
        bestRating: '5',
        worstRating: '1',
      };
    }
  }

  // Breadcrumb structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: tCommon('home'), url: `/${locale}` },
    { name: tCommon('skateparks'), url: `/${locale}/skateparks` },
    { name: parkName, url: `/${locale}/skateparks/${skatepark.slug}` },
  ]);

  return (
    <TooltipProvider>
      {/* Main Skatepark Structured Data */}
      <Script
        id="skatepark-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Breadcrumb Structured Data */}
      <Script
        id="skatepark-breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />


      <div className="pt-[4.3rem] min-h-screen">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: tCommon('skateparks'), href: '/skateparks' },
            { label: parkName },
          ]}
        />

        <div className="max-w-6xl mx-auto overflow-x-hidden">
          {/* Header */}
          <h1 className="my-5 text-3xl font-bold text-center text-text dark:text-text-dark z-10 hidden sm:block">
            <span className="hidden ">
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
            <span className="inline">
              {parkName}
            </span>
          </h1>
          {nicknamesStr && (
            <p className="text-center text-sm text-text-secondary dark:text-text-secondary-dark -mt-2 mb-2 hidden sm:block">
              {t('alsoKnownAs')}: {nicknamesStr}
            </p>
          )}

          {/* Image Gallery - skeleton shown while images load inside ParkImageGallery */}
          <div className="relative z-0">
            <div className="max-w-5xl mx-auto overflow-visible">
              <ParkImageGallery
                images={getImageSliderImages(skatepark.images, parkName)}
                parkName={parkName}
                closingYear={skatepark.closingYear}
                area={skatepark.area}
                updatedAt={skatepark.updatedAt}
                locale={locale}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-4">
            <div>
              <h1 className={`sm:hidden text-2xl mb-1 text-text dark:text-text-dark ${locale === 'he' ? 'font-bold' : 'font-semibold'}`}>
                {parkName}
              </h1>
              {nicknamesStr && (
                <p className="sm:hidden text-sm text-text-secondary dark:text-text-secondary-dark -mt-0.5">
                  {t('alsoKnownAs')}: {nicknamesStr}
                </p>
              )}
            </div>
            <div className="sm:hidden shrink-0">
              <Button
                variant="brand"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({
                      title: parkName,
                      text: `${parkName} - Skatepark`,
                      url: typeof window !== 'undefined' ? window.location.href : '',
                    }).catch((error) => {
                      console.error('Error sharing:', error);
                    });
                  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '');
                  }
                }}
                className=" !p-2 rounded-lg font-medium flex-shrink-0"
                aria-label={locale === 'he' ? 'שתף סקייטפארק' : 'Share skatepark'}
              >
                <Icon name="shareBold" className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Info Cards - Hours + Amenities */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-2 sm:px-0">
            <Card className="text-text/80 dark:text-text-dark/80 md:p-4 shadow-none">
              <div className="flex gap-4 mb-4 justify-between items-start">
                <div className={locale === 'he' ? '-ml-10' : ''}>
                  <FormattedHours
                    operatingHours={skatepark.operatingHours}
                    lightingHours={skatepark.lightingHours}
                    closingYear={skatepark.closingYear}
                    locale={locale}
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <div className="flex items-center mb-3">
                  <h3 className="text-base sm:text-xl font-semibold flex items-center gap-2 text-text dark:text-text-dark">
                    <Icon name="locationBold" className={`w-4 h-4`} />
                    {t('address')}
                  </h3>
                </div>
                <div className="flex flex-col gap-2 mb-2 text-text dark:text-text-dark">
                  <p className="text-base sm:text-lg" itemProp="address">{address}.</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-dark/20">
                <div className="flex flex-col flex-wrap gap-2 mb-2 text-text dark:text-text-dark">
                  {skatepark.openingYear && (
                    <p className="text-base sm:text-lg">
                      {skatepark.openingMonth 
                        ? `${t('openedDate')}${getMonthName(skatepark.openingMonth, locale)} ${skatepark.openingYear}`
                        : `${t('opened')} ${skatepark.openingYear}`
                      }.
                    </p>
                  )}
                  {skatepark.closingYear && (
                    <p className="text-base sm:text-lg text-red dark:text-red-dark">
                      {skatepark.closingMonth 
                        ? locale === 'he' 
                          ? `${t('closedYearDate')}${getMonthName(skatepark.closingMonth, locale)} ${skatepark.closingYear}`
                          : `${t('closedYearDate')} ${getMonthName(skatepark.closingMonth, locale)} ${skatepark.closingYear}`
                        : `${t('closedYear')} ${skatepark.closingYear}`
                      }.
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="md:p-4 text-clip shadow-none">
              <div className="flex items-center md:justify-center mb-3 text-text dark:text-text-dark">
                <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Icon name="notesBold" className={`w-5 h-5`} />
                  {t('amenities.title')}
                </h2>
              </div>

              {/* Amenities grid */}
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(skatepark.amenities).map(([key, value]) => {
                  const isAvailable = Boolean(value);
                  const isParkClosed = Boolean(skatepark.closingYear);
                  const iconName = AMENITY_ICONS[key as keyof typeof AMENITY_ICONS];
                  
                  if (!iconName) return null;

                  return (
                    <div key={key} className="w-full">
                      {isAvailable ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`border border-transparent dark:border-gray-border-dark rounded-lg p-2 cursor-pointer transition-all duration-300 ease-out flex items-center justify-center ${locale === 'he' ? 'h-[80px]' : 'h-[88px]'} ${
                                amenitiesActive
                                  ? isParkClosed
                                    ? 'bg-red-bg dark:bg-red-bg-dark !border-red-border dark:!border-red-border-dark'
                                    : 'bg-blue-bg dark:bg-[#1432524d] !border-blue-border dark:!border-[#183d65]'
                                  : ' bg-gray-bg dark:bg-gray-bg-dark dark:shadow-inner'
                              }`}
                            >
                              <div className={`text-center ${amenitiesActive ? 'animate-pop' : ''}`}>
                                <div className="mb-1.5">
                                  <Icon
                                    name={iconName as any}
                                    className={`w-5 h-5 mx-auto transition-colors duration-300 ease-out overflow-visible ${
                                      amenitiesActive
                                        ? isParkClosed
                                          ? 'text-red dark:text-red-dark'
                                          : 'text-blue dark:text-blue-dark'
                                        : 'text-gray-dark dark:text-gray'
                                    }`}
                                  />
                                </div>
                                <p className={`text-xs xsm:text-sm font-medium transition-all duration-300 ${
                                  amenitiesActive
                                  ? isParkClosed
                                    ? 'text-red dark:text-red-dark'
                                    : 'text-blue dark:text-blue-dark'
                                    : 'text-gray-dark dark:text-gray line-through'
                                }`}>
                                  {t(`amenities.${key}`) || key.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                          variant={isParkClosed ? 'red' : 'blue'}
                          side="top"
                           className="max-w-[200px] whitespace-normal">
                            <p className="text-sm">{t(`amenities.${key}Description`)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className={`border border-gray-border dark:border-gray-border-dark rounded-lg p-2 bg-gray-bg dark:bg-gray-bg-dark dark:shadow-inner flex items-center justify-center ${locale === 'he' ? 'h-[80px]' : 'h-[88px]'}`}>
                          <div className="text-center">
                            <div className="mb-1.5">
                              <Icon
                                name={iconName as any}
                                className="w-5 h-5 mx-auto text-gray-dark dark:text-gray"
                                />
                            </div>
                            <p className="text-xs xsm:text-sm font-medium text-gray-dark dark:text-gray line-through">
                              {t(`amenities.${key}`) || key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>


          {/* Notes and Get Directions Combined Section */}
          <div className="max-w-6xl mx-auto mb-8 px-4 sm:px-0">
            <Card className={`!overflow-visible !p-0 shadow-none transition-all duration-200 transform-gpu ${
              (notes && notes.trim() !== '') || 
              (skatepark.qualityRating && (
                skatepark.qualityRating.elementDiversity || 
                skatepark.qualityRating.cleanliness || 
                skatepark.qualityRating.maintenance
              ))
                ? 'grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-6 overflow-visible' 
                : ''
            }`}>
              {/* Notes Section */}
              {notes && notes.trim() !== '' && (
                <div className="sm:px-2 md:p-4">
                  <div className="flex items-center mb-3 text-text dark:text-text-dark">
                    <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                      <Icon name="infoBold" className={`w-5 h-5`} />
                      {t('notes')}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {notes.split('\n').filter(note => note.trim()).map((note, index) => (
                      <div key={index} className="w-fit px-2.5 py-1.5 rounded-md text-text dark:text-text-dark">
                        <p className="text-base sm:text-lg">
                          • {note.trim()}.
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Rating Section - Show here if no notes */}
              {!notes || notes.trim() === '' ? (
                skatepark.qualityRating && (
                  skatepark.qualityRating.elementDiversity || 
                  skatepark.qualityRating.cleanliness || 
                  skatepark.qualityRating.maintenance
                ) ? (
                  <div className="px-1 sm:px-0 md:p-4 space-y-6">
                    <div className="flex items-center justify-center mb-4 text-text dark:text-text-dark">
                      <h3 className={`text-base sm:text-xl font-semibold flex items-center gap-1 ${locale === 'he' ? '' : 'flex-row-reverse'}`}>
                        {tr('Rating', 'דירוג')}
                        <Icon 
                          name="logo" 
                          style={{
                            paintOrder: 'stroke',
                          }}
                          className={`w-auto  overflow-visible ${locale === 'he' ? 'h-3 -mb-[2px]' : 'h-3.5'}
                            ${
                            skatepark.closingYear 
                              ? 'text-error dark:text-error/80' 
                              : 'text-brand-main stroke-[7px] stroke-brand-stroke dark:stroke-transparent dark:text-brand-dark'
                          }`} 
                        />
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 xsm:grid-cols-3 gap-4 h-fit">
                      {skatepark.qualityRating.elementDiversity && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex md:justify-center gap-2">
                            <Icon name="objectsBold" className="w-4 h-4 overflow-visible" />
                            <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                              {tr('Element Diversity', 'מגוון מתקנים')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-orange-bg dark:bg-orange-bg-dark rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange dark:bg-orange-dark transition-all duration-300 rounded-full"
                                style={{ width: `${(skatepark.qualityRating.elementDiversity / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-md font-semibold text-text/80 dark:text-text-dark/80 whitespace-nowrap">
                              {formatRating(skatepark.qualityRating.elementDiversity)}/5
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {skatepark.qualityRating.cleanliness && (
                        <div className="space-y-2 h-full flex flex-col justify-between">
                          <div className="flex md:justify-center gap-2">
                            <Icon name="broomBold" className="w-4 h-4 overflow-visible" />
                            <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                              {tr('Cleanliness', 'רמת ניקיון')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-purple-bg dark:bg-purple-bg-dark rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple dark:bg-purple-dark transition-all duration-300 rounded-full"
                                style={{ width: `${(skatepark.qualityRating.cleanliness / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-md font-semibold text-text/80 dark:text-text-dark/80 whitespace-nowrap">
                              {formatRating(skatepark.qualityRating.cleanliness)}/5
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {skatepark.qualityRating.maintenance && (
                        <div className="space-y-2 h-full flex flex-col justify-between max-h-[5rem]">
                          <div className="flex md:justify-center gap-2">
                            <Icon name="wrenchBold" className="w-4 h-4 overflow-visible" />
                            <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                              {tr('Maintenance level', 'רמת תחזוקה')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-blue-bg dark:bg-blue-bg-dark rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue dark:bg-blue-dark transition-all duration-300 rounded-full"
                                style={{ width: `${(skatepark.qualityRating.maintenance / 5) * 100}%` }}
                              />
                            </div>
                            <span className="text-md font-semibold text-text/80 dark:text-text-dark/80 whitespace-nowrap">
                              {formatRating(skatepark.qualityRating.maintenance)}/5
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              ) : null}

              {/* Get Directions Section */}
              <Suspense fallback={
                <div className="w-full h-32 flex items-center justify-center px-2 sm:px-0">
                  <LoadingSpinner className="h-32" />
                </div>
              }>
                <section 
                  aria-labelledby="directions-heading "
                  key={`map-links-${locale}`}
                  className="space-y-4 sm:px-2 md:p-4"
                >
                  <h3 id="directions-heading" className="sr-only">{t('getDirections')}</h3>
                  <div className="flex flex-col space-y-4 !mt-0">
                    <div className="flex items-center gap-2 justify-start md:justify-center">
                      <Icon name="mapBold" className="w-5 h-5 text-gray-900 dark:text-[#f2f2f2]" />
                      <h3 className="font-semibold text-base sm:text-xl text-gray-900 dark:text-[#f2f2f2]">
                        {t('getDirections')}
                      </h3>
                    </div>

                    <div className="mx-auto w-full max-w-[380px] grid grid-cols-4 gap-4 items-center">
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
                              className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-[#1acdff] dark:text-gray-100 overflow-visible"
                              style={{
                                filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
                              }}
                            />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" variant="gray">
                          <p className="text-sm">{t('waze')}</p>
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
                              className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-white dark:text-[#1a1a1a] overflow-visible"
                              style={{
                                filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
                              }}
                            />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" variant="orange">
                          <p className="text-sm">{t('moovit')}</p>
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
                              className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-[#3a3a3a] dark:text-gray-300 overflow-visible"
                              style={{
                                filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
                              }}
                            />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" variant="blue">
                          <p className="text-sm">{t('appleMaps')}</p>
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
                              name="newestGoogleMaps" 
                              className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-white dark:text-[#1a1a1a] overflow-visible"
                              style={{
                                filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
                              }}
                            />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" variant="green">
                          <p className="text-sm">{t('googleMaps')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </section>
              </Suspense>
            </Card>
          </div>

        {/* Weather Forecast */}
        <div className="max-w-6xl mx-auto mb-8 px-4 sm:px-4">
            <ParkWeatherForecast slug={slug} closingYear={skatepark.closingYear} />
          </div>

          {/* YouTube Embed */}
          {skatepark.mediaLinks.youtube && (
            <Card className="!rounded-none !shadow-none !px-4 sm:!px-0 !py-0 md:!p-4 w-full max-w-6xl mx-auto transition-all duration-200 transform-gpu mb-8">
              <CardHeader>
                <CardTitle className="text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Icon name="youtube" className="w-5 h-5" />
                  {t('video')}
                </CardTitle>
              </CardHeader>
              <CardContent className="bord rounded-xl">
                <YouTubeEmbed url={skatepark.mediaLinks.youtube} />
              </CardContent>
            </Card>
          )}

          {/* Map Section - Always render if skatepark exists */}
          {skatepark && (() => {
            const iframeSrc = getGoogleMapsIframeSrc();
            
            return (
              <section aria-labelledby="location-heading" className="w-full max-w-6xl mx-auto px-4 md:px-4">
                <h2 id="location-heading" className="text-base sm:text-xl font-semibold flex items-center gap-2 mb-4">
                  <Icon name="mapBold" className="w-5 h-5" />
                  {tCommon('map')}
                </h2>

                <div className={`h-32 sm:h-60  rounded-xl mb-8 overflow-hidden relative border-2 border-gray-200 dark:border-gray-700`}>

                  {iframeSrc ? (
                    // Show iframe if googleMapsFrame is available
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
                        className="w-full h-full map"
                        onLoad={() => setIsMapLoading(false)}
                        onError={() => setIsMapLoading(false)}
                      />
                    </>
                  ) : (
                    // Show Google Maps API component if iframe is not available
                    <SkateparkDetailMap
                      skatepark={skatepark}
                      nearbyParks={nearbyParks}
                      locale={locale}
                    />
                  )}
                </div>
              </section>
            );
          })()}


          {/* Quality Rating Section - Show here if notes exist */}
          {notes && notes.trim() !== '' && skatepark.qualityRating && (
            skatepark.qualityRating.elementDiversity || 
            skatepark.qualityRating.cleanliness || 
            skatepark.qualityRating.maintenance
          ) ? (
            <Card className="px-5 sm:px-4 md:p-4 shadow-none w-full max-w-6xl mx-auto mb-8">
              <div className="flex items-center md:justify-center mb-4 text-text dark:text-text-dark">
                <h3 className={`text-base sm:text-xl font-semibold flex items-center gap-2 ${locale === 'he' ? '' : 'flex-row-reverse'}`}>
                {tr('Rating', 'דירוג')}
                <Icon 
                  name="logo" 
                  style={{
                    paintOrder: 'stroke',
                  }}
                  className={`w-auto overflow-visible ${locale === 'he' ? 'h-[0.7rem] -mb-[1px]' : 'h-[0.95rem]'} ${
                    skatepark.closingYear 
                      ? 'text-error dark:text-error/80' 
                      : 'text-brand-main stroke-[7px] stroke-brand-stroke dark:stroke-transparent dark:text-brand-dark'

                  }`} 
                />

                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {skatepark.qualityRating.elementDiversity && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="objectsBold" className="w-4 h-4 overflow-visible" />
                        <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                          {tr('Element Diversity', 'מגוון אלמנטים')}
                        </p>
                      </div>
                    </div>
                     
                    <div className="flex items-center justify-between gap-3">

                    <div className="w-full bg-orange-bg dark:bg-orange-bg-dark rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-orange dark:bg-orange-dark transition-all duration-300 rounded-full"
                        style={{ width: `${(skatepark.qualityRating.elementDiversity / 5) * 100}%` }}
                      />
                      </div>
                       <span className="text-sm font-semibold text-text/80 dark:text-text-dark/80">
                        {formatRating(skatepark.qualityRating.elementDiversity)}/5
                      </span>
                    </div>
                  </div>
                )}
                
                {skatepark.qualityRating.cleanliness && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="broomBold" className="w-4 h-4 overflow-visible" />
                        <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                          {tr('Cleanliness', 'רמת ניקיון')}
                        </p>
                      </div>
                    </div>
                     <div className="flex items-center justify-between gap-3">

                    <div className="w-full bg-purple-bg dark:bg-purple-bg-dark rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-purple dark:bg-purple-dark transition-all duration-300 rounded-full"
                        style={{ width: `${(skatepark.qualityRating.cleanliness / 5) * 100}%` }}
                      />
                      </div>
                       <span className="text-sm font-semibold text-text/80 dark:text-text-dark/80">
                        {formatRating(skatepark.qualityRating.cleanliness)}/5
                      </span>
                    </div>
                  </div>
                )}
                
                {skatepark.qualityRating.maintenance && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ">
                      <div className="flex items-center gap-2 ">
                        <Icon name="wrenchBold" className="w-4 h-4 overflow-visible" />
                        <p className="text-md font-medium text-text/80 dark:text-text-dark/80">
                          {tr('Maintenance level', 'רמת תחזוקה')}
                        </p>
                      </div>
                    </div>
                     <div className="flex items-center justify-between gap-3">

                    <div className="w-full bg-blue-bg dark:bg-blue-bg-dark rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-blue dark:bg-blue-dark transition-all duration-300 rounded-full"
                        style={{ width: `${(skatepark.qualityRating.maintenance / 5) * 100}%` }}
                      />
                      </div>
                       <span className="text-sm font-semibold text-text/80 dark:text-text-dark/80">
                        {formatRating(skatepark.qualityRating.maintenance)}/5
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : null}



          {/* Reviews Section */}
          <Card
            className="!px-4 !py-2 md:!p-4 !shadow-none m w-full max-w-6xl mx-auto transition-all duration-200 transform-gpu">
            <CardHeader className="">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-xl font-semibold flex items-center gap-2">
                  <Icon name="messagesBold" className="w-5 h-5" />
                  {t('reviewsCount')}
                </CardTitle>
                {(() => {
                  // Check environment variables for review permissions (env vars are always string | undefined)
                  const userReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_USERREVIEWS;
                  const everyoneReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS;
                  const enableMultipleReviews = process.env.NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS === 'true';
                  const userReviewsEnabled = userReviewsEnv === 'true';
                  const everyoneReviewsEnabled = everyoneReviewsEnv === 'true';
                  
                  // Priority: If both are true, treat as userReviews only
                  const allowUserReviews = userReviewsEnabled;
                  const allowAnonymousReviews = !userReviewsEnabled && everyoneReviewsEnabled;
                  
                  // If both are false, don't show button
                  if (!allowUserReviews && !allowAnonymousReviews) {
                    return null;
                  }
                  
                  // While session is loading, hide the button (it will fade in when ready)
                  if (status === 'loading') {
                    return null;
                  }
                  
                  // If user reviews enabled, require login
                  if (allowUserReviews) {
                    if (session?.user) {
                      // When multiple reviews disabled and user already reviewed, show message instead of button
                      if (!enableMultipleReviews && userHasReviewed) {
                        return (
                          <span className="opacity-0 animate-fadeIn text-sm text-text-secondary dark:text-text-secondary-dark">
                            {t('youAlreadyReviewed')}
                          </span>
                        );
                      }
                      return (
                        <Button 
                          className="opacity-0 animate-fadeIn"
                          variant={'primary'}
                          onClick={() => setShowAddReview(true)}
                        >
                          {t('addReview')}
                        </Button>
                      );
                    } else {
                      return (
                        <Link href={`/${locale}/login`} className="opacity-0 animate-fadeIn inline-block">
                          <Button variant={skatepark.closingYear && skatepark.closingYear <= new Date().getFullYear() ? 'error' : 'primary'}>
                            {tCommon('signInToReview')}
                          </Button>
                        </Link>
                      );
                    }
                  }
                  
                  // If anonymous reviews enabled, show button for everyone
                  if (allowAnonymousReviews) {
                    return (
                      <Button 
                        className="opacity-0 animate-fadeIn"
                        variant={
                          'primary'}
                        onClick={() => setShowAddReview(true)}
                      >
                        {t('addReview')}
                      </Button>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </CardHeader>
            <CardContent className="">
              {reviewsLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <LoadingSpinner size={40} className="flex-shrink-0" />
                </div>
              ) : reviews.length > 0 ? (
                <>
                  {/* 2-Column Layout: Rating Distribution + First 2 Reviews */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Rating Distribution */}
                    <div className="space-y-2">
                      {ratingDistribution.map(({ rating, count, percentage }) => (
                        <div key={rating} className="flex items-center justify-center gap-3">
                          <p className="text-base font-medium w-15">{rating} {t('stars')}</p>
                          <div className="w-full flex-1 h-2 bg-card dark:bg-card-dark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-main rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-base text-gray-600 dark:text-gray-400 w-4 text-right">
                            {count}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* First Review Card */}
                    <div className="space-y-4">
                      {sortedReviews.slice(0, 1).map((review) => (
                        <div
                          key={review._id}
                          className={`h-full opacity-0 bg-card dark:bg-card-dark rounded-lg p-4 animate-fadeInDown ${reviewFontClass(review)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {review.userName}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Icon
                                    key={star}
                                    name="star"
                                    className={`w-4 h-4 ${
                                      star <= review.rating
                                        ? 'fill-brand-main text-brand-main'
                                        : 'text-text-secondary dark:text-text-secondary'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <time className="text-base text-gray-500 dark:text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </time>
                          </div>
                          <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                            {review.comment}
                          </p>
                          <div className="mt-3 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleHelpful(review)}
                              className="flex items-center justify-end gap-1.5 cursor-pointer text-text-secondary dark:text-text-secondary-dark hover:text-red dark:hover:text-red-dark transition-colors"
                              aria-label={hasMarkedHelpful(review) ? (locale === 'he' ? 'מועיל' : 'Helpful') : (locale === 'he' ? 'סימון כמועיל' : 'Mark as helpful')}
                            >
                              {(review.helpfulCount ?? 0) > 0 && (
                                <span className="text-sm font-medium tabular-nums">
                                  {review.helpfulCount}
                                </span>
                              )}
                              <Icon
                                name={hasMarkedHelpful(review) ? 'heartBold' : 'heart'}
                                className={`w-4 h-4 ${hasMarkedHelpful(review) ? 'text-red dark:text-red-dark' : ''}`}
                              />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Reviews (shown when expanded) */}
                  {reviewsExpanded && sortedReviews.length > 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                      {sortedReviews.slice(2).map((review) => (
                        <div
                          key={review._id}
                          className={`opacity-0 bg-card dark:bg-card-dark rounded-lg p-4 animate-fadeInDown ${reviewFontClass(review)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {review.userName}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Icon
                                    key={star}
                                    name="star"
                                    className={`w-4 h-4 ${
                                      star <= review.rating
                                        ? 'fill-brand-main text-brand-main'
                                        : 'text-text-secondary dark:text-text-secondary'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <time className="text-base text-gray-500 dark:text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </time>
                          </div>
                          <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                            {review.comment}
                          </p>
                          <div className="mt-3 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleHelpful(review)}
                              className="flex items-center justify-end gap-1.5 cursor-pointer text-text-secondary dark:text-text-secondary-dark hover:text-red dark:hover:text-red-dark transition-colors"
                              aria-label={hasMarkedHelpful(review) ? (locale === 'he' ? 'מועיל' : 'Helpful') : (locale === 'he' ? 'סימון כמועיל' : 'Mark as helpful')}
                            >
                              <Icon
                                name={hasMarkedHelpful(review) ? 'heartBold' : 'heart'}
                                className={`w-4 h-4 ${hasMarkedHelpful(review) ? 'text-red dark:text-red-dark' : ''}`}
                              />
                              {(review.helpfulCount ?? 0) > 0 && (
                                <span className="text-sm font-medium tabular-nums">
                                  {review.helpfulCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  {sortedReviews.length > 2 && (
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => setReviewsExpanded(!reviewsExpanded)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/[7.5%] dark:hover:bg-white/[7.5%] transition-colors text-text-secondary dark:text-text-dark/70"
                        aria-label={reviewsExpanded ? t('showLessReviews') : t('showMoreReviews', { count: sortedReviews.length - 2 })}
                      >
                        <span className=" text-sm font-medium">
                          {reviewsExpanded 
                            ? t('showLessReviews')
                            : t('showMoreReviews', { count: sortedReviews.length - 2 })}
                        </span>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center text-text-secondary dark:text-text-secondary-dark transition-colors duration-200">
                  <Icon name="messages" className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-base mb-4">
                    {t('noReviewsYet')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nearby Parks */}
          {nearbyParks.length > 0 && (
            <Card className="!overflow-visible !shadow-none w-full max-w-6xl mb-12 mx-auto transition-all duration-200 transform-gpu !px-4 ">
              <CardHeader className="flex flex-row items-center justify-start gap-2  text-text dark:text-text-dark">
              <Icon name="treesBold" className="w-5 h-5 text-gray-900 dark:text-[#f2f2f2]" />
                <CardTitle className="!mt-0 text-base font-medium">{t('nearbySkateparks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${
                  nearbyParks.length === 1 
                    ? 'grid-cols-1' 
                    : nearbyParks.length === 2 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : nearbyParks.length === 3
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                }`}>
                  {nearbyParks.map((park, index) => {
                    const nearbyName = (park.name as any)[locale] || park.name.en || park.name.he;
                    
                    // Check if park is closed
                    const currentYear = new Date().getFullYear();
                    const isClosed = park.closingYear && park.closingYear <= currentYear;
                    
                    // Get current park's coordinates directly from skatepark.location
                    let currentParkLat = 0;
                    let currentParkLng = 0;
                    if (skatepark?.location?.coordinates && Array.isArray(skatepark.location.coordinates)) {
                      // GeoJSON format: [longitude, latitude]
                      currentParkLng = skatepark.location.coordinates[0];
                      currentParkLat = skatepark.location.coordinates[1];
                    } else if (skatepark?.location && 'lat' in skatepark.location && 'lng' in skatepark.location) {
                      // Old format: { lat, lng }
                      currentParkLat = (skatepark.location as any).lat;
                      currentParkLng = (skatepark.location as any).lng;
                    }
                    
                    // Get nearby park's coordinates - handle both formats
                    let nearbyParkLat: number | null = null;
                    let nearbyParkLng: number | null = null;
                    if (park.location) {
                      // Check if it's in GeoJSON format (coordinates array)
                      if ('coordinates' in park.location && Array.isArray((park.location as any).coordinates)) {
                        const coords = (park.location as any).coordinates;
                        if (coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
                          nearbyParkLng = coords[0]; // longitude
                          nearbyParkLat = coords[1]; // latitude
                        }
                      } 
                      // Check if it's in { lat, lng } format
                      else if ('lat' in park.location && 'lng' in park.location) {
                        const lat = park.location.lat;
                        const lng = park.location.lng;
                        // Only use if both are non-zero (0,0 is invalid)
                        // Check that at least one is non-zero (to handle edge cases) but prefer both non-zero
                        if (lat !== 0 && lng !== 0) {
                          nearbyParkLat = lat;
                          nearbyParkLng = lng;
                        }
                      }
                    }
                    
                    // Fallback: If coordinates are invalid, try to get from cache
                    if (nearbyParkLat === null || nearbyParkLng === null) {
                      try {
                        const cacheKey = 'skateparks_cache';
                        const cachedData = localStorage.getItem(cacheKey);
                        if (cachedData) {
                          const cachedSkateparks = JSON.parse(cachedData);
                          if (Array.isArray(cachedSkateparks)) {
                            const cachedPark = cachedSkateparks.find((p: any) => p.slug === park.slug);
                            if (cachedPark) {
                              // Try GeoJSON format first
                              if (cachedPark.location?.coordinates && Array.isArray(cachedPark.location.coordinates)) {
                                const coords = cachedPark.location.coordinates;
                                if (coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0) {
                                  nearbyParkLng = coords[0]; // longitude
                                  nearbyParkLat = coords[1]; // latitude
                                }
                              }
                              // Try { lat, lng } format
                              else if (cachedPark.location && 'lat' in cachedPark.location && 'lng' in cachedPark.location) {
                                const lat = (cachedPark.location as any).lat;
                                const lng = (cachedPark.location as any).lng;
                                if (lat !== 0 && lng !== 0) {
                                  nearbyParkLat = lat;
                                  nearbyParkLng = lng;
                                }
                              }
                            }
                          }
                        }
                      } catch (e) {
                        // Silently fail cache fallback
                      }
                    }
                    
                    const distance = nearbyParkLat !== null && nearbyParkLng !== null && 
                                     currentParkLat !== 0 && currentParkLng !== 0
                      ? calculateDistance(
                          currentParkLat,
                          currentParkLng,
                          nearbyParkLat,
                          nearbyParkLng
                        )
                      : null;
                    
                    const distanceText = distance !== null
                      ? `${distance.toFixed(1)} ${locale === 'he' ? 'ק"מ מפארק זה' : 'km from this park'}`
                      : null;
                    
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
                        className={`h-fit cursor-pointer relative group select-none transform-gpu transition-all duration-200 ${hideClass}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setClickedNearbyParkId(park._id);
                          setTimeout(() => {
                            router.push(`/${locale}/skateparks/${park.slug}`);
                          }, 300);
                        }}
                      >
                        <div
                         className="rounded-2xl relative h-[10.5rem] overflow-hidden"
                         style={{
                          filter: 'drop-shadow(0 1px 1px #66666612) drop-shadow(0 2px 2px #5e5e5e12) drop-shadow(0 4px 4px #7a5d4413) drop-shadow(0 8px 8px #5e5e5e12) drop-shadow(0 16px 16px #5e5e5e12)'
                        }}
                         >
                          {/* Loading overlay when navigating to park page */}
                          {clickedNearbyParkId === park._id && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 rounded-2xl">
                              <LoadingSpinner variant="imageOverlay" size={40} />
                            </div>
                          )}
                          {/* Closed Badge */}
                          {isClosed && (
                            <div className="absolute bottom-2 left-0 z-10">
                              <div className="flex gap-1 justify-center items-center bg-red-500 dark:bg-red-600 text-white text-xs px-2 py-1 shadow-lg rounded-r-3xl">
                                {tr('Permanently Closed', 'נסגר לצמיתות')}
                                <Icon name="closedPark" className="w-3 h-3" />
                              </div>
                            </div>
                          )}
                          
                          <Image
                            src={getValidImageUrl(park.imageUrl)}
                            alt={nearbyName}
                            fill
                            quality={60}
                            loading="lazy"
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover saturate-150 group-hover:saturate-[1.75] transition-all duration-200"
                          />
                        </div>
                        
                        <div className="pt-1">
                            <div className="flex items-center text-text/80 dark:text-text-dark/80 gap-1">
                              <Icon name="locationBold" className="w-3.5 h-3.5 shrink-0" />
                              <p className="text-base truncate">
                                {distanceText || ''}
                              </p>
                            </div>
                          <h3 className="text-base font-semibold truncate px-1">
                            {nearbyName}
                          </h3>
                          <div className="flex items-center justify-between">                          </div>
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

      {/* Add Review Modal - Show if logged in OR if anonymous reviews are enabled */}
      {showAddReview && (() => {
        const userReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_USERREVIEWS;
        const everyoneReviewsEnv = process.env.NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS;
        const userReviewsEnabled = userReviewsEnv === 'true';
        const everyoneReviewsEnabled = everyoneReviewsEnv === 'true';
        const allowUserReviews = userReviewsEnabled;
        const allowAnonymousReviews = !userReviewsEnabled && everyoneReviewsEnabled;
        
        // Show modal if user is logged in (and user reviews enabled) OR if anonymous reviews are enabled
        return (allowUserReviews && session?.user) || allowAnonymousReviews;
      })() && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${reviewModalClosing ? 'animate-fadeOut' : ''}`}>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/50 dark:bg-black/40 backdrop-blur-[2px] ${reviewModalClosing ? 'animate-fadeOut' : ''}`}
            onClick={closeReviewModal}
          />

          {/* Modal */}
          <div className={`fixed inset-0 flex items-center justify-center p-4 ${reviewModalClosing ? 'animate-fadeOut' : 'animate-scaleFadeUp'}`}>
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-2xl bord p-4 bg-sidebar dark:bg-sidebar-dark"
            >
              {/* Header */}
              <div className="sticky top-0  flex items-center justify-between z-10">
                <h2 className="text-base font-bold text-text dark:text-text-dark">
                  {t('writeReview')}
                  </h2>
                <button
                  onClick={closeReviewModal}
                  className="p-2"
                  aria-label={t('closeModal')}
                >
                  <X className="w-5 h-5 text-text dark:text-text-dark" />
                </button>
              </div>
              <Separator className="my-2"/>

              {/* Content */}
              <div className="">
                <ReviewForm
                  slug={slug}
                  onSubmitted={handleReviewSubmitted}
                  onCancel={closeReviewModal}
                  inModal={true}
                  user={session?.user ?? undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thank you for review popup */}
      <AnimatePresence>
        {showThankYouPopup && (
          <motion.div
            key="thank-you-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="backdrop-blur-sm fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            aria-live="polite"
          >
            <div
              dir={locale === 'he' ? 'rtl' : 'ltr'}
              className="pointer-events-auto rounded-xl px-6 py-4 shadow-lg bg-sidebar dark:bg-sidebar-dark border border-border dark:border-border-dark text-center max-w-sm"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
            >
              <p className="text-base font-medium text-text dark:text-text-dark">
                {t('thankYouForReview')}
              </p>
              {process.env.NEXT_PUBLIC_ENABLE_AUTO_APPROVE_REVIEWS !== 'true' && (
                <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                  {t('reviewPendingApproval')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

