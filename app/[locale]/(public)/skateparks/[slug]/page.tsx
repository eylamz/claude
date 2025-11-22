'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { Icon } from '@/components/icons';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Select } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
  rating: number;
  totalReviews: number;
  mediaLinks: {
    youtube?: string;
    googleMapsFrame?: string;
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
}

type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

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
        <div className="flex items-center gap-2">
          <Icon name="clockBold" className="w-5 h-5" />
          <span className="font-semibold">{t('openingHours')}: </span>
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
        <div className="flex items-center gap-2">
          <Icon name="clockBold" className="w-5 h-5" />
          <span className="font-semibold">{t('openingHours')}: </span>
          <span className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700">
            {t('open247')}
          </span>
        </div>
        
        {/* ALWAYS show lighting hours for 24/7 parks when is24Hours is true */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-2">
            <Icon name="sunBold" className={`w-5 h-5 ${lightingHours?.endTime ? 'text-yellow-600/90' : 'text-gray-500'}`} />
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
        <div className="flex items-center gap-2">
          <Icon name="clockBold" className="w-5 h-5 " />
          <span className="font-semibold">{t('openingHours')}</span>
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
        <div className="flex items-center gap-2">
          <Icon name="clockBold" className="w-5 h-5 " />
          <span className="font-semibold">{t('openingHours')}</span>
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
      <div className="flex items-center gap-2">
        <Icon name="clockBold" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <span className="font-semibold">{t('openingHours')}</span>
      </div>
      
      {/* Hours by group */}
      <div className="ml-6 space-y-2">
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
              <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">
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
  const [reviewSort, setReviewSort] = useState<ReviewSort>('newest');
  const [showAddReview, setShowAddReview] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

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
      const response = await fetch(`/api/skateparks/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Handle 404
          return;
        }
        throw new Error('Failed to fetch skatepark');
      }

      const data = await response.json();
      setSkatepark(data.skatepark);
      setNearbyParks(data.nearbyParks || []);
      
      // Log operating hours for debugging
      console.log('Operating Hours:', data.skatepark.operatingHours);
      
      await fetchReviews();
    } catch (error) {
      console.error('Error fetching skatepark:', error);
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
    if (skatepark) {
      // Refresh skatepark data to get updated rating
      const response = await fetch(`/api/skateparks/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setSkatepark(data.skatepark);
      }
    }
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

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (reviewSort) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((r) => r.rating === rating).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { rating, count, percentage };
  });

  if (loading) {
    return (
      <div className="min-h-screen  p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-64 md:h-96 w-full rounded-lg" />
          <Skeleton className="h-32 w-full" />
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
    aggregateRating: skatepark.totalReviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: skatepark.rating,
      reviewCount: skatepark.totalReviews,
    } : undefined,
  };

  return (
    <>
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
        

        <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header */}
          <div className=" rounded-lg shadow-sm p-6 border border-border-dark/20 dark:border-text-secondary-dark/70 backdrop-blur-sm bg-white/80 dark:bg-gray-800/70">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {parkName}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {skatepark.area.charAt(0).toUpperCase() + skatepark.area.slice(1)}
                  </span>
                  {(() => {
                    // Check if park is currently open using the model's isOpenNow method
                    // For now, we'll check if it's 24/7 or if current time is within hours
                    const isCurrentlyOpen = skatepark.lightingHours?.is24Hours || 
                      (skatepark.operatingHours && Object.values(skatepark.operatingHours).some(day => day.isOpen));
                    return (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isCurrentlyOpen
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {isCurrentlyOpen ? t('openNow') : t('closed')}
                      </span>
                    );
                  })()}
                </div>
                {skatepark.rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                          key={star}
                          name="star"
                          className={`w-5 h-5 ${
                            star <= Math.round(skatepark.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {skatepark.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      ({skatepark.totalReviews} {skatepark.totalReviews === 1 ? t('review') : t('reviews')})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Gallery */}
        <div className="">
          <div className="max-w-7xl mx-auto p-4 lg:p-6 overflow-visible">
            <ImageSlider images={getImageSliderImages(skatepark.images, locale, parkNameEn)} />
          </div>
        </div>

          {/* Info Cards */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Hours Card - Now using FormattedHours component */}
            <Card className="text-text dark:text-[#7991a0] p-4 backdrop-blur-custom bg-background/80 dark:bg-background-secondary-dark/80">
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
                        : 'text-blue-600 dark:text-blue-400 shadow-md active:shadow-none border border-b-[4px] border-blue-600 dark:border-blue-400/20 active:border-b-[1px] active:translate-y-[2px] transition-all duration-200'
                    }`}
                    aria-label="Share"
                  >
                    <Icon name="shareBold" className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Address Section */}
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-secondary-dark/70 dark:text-gray-400">
                <div className="flex items-center mb-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Icon name="locationBold" className={`w-5 h-5`} />
                    {t('address')}
                  </h2>
                </div>

                <div className="flex flex-col gap-2 mb-2">
                  <span itemProp="address">{address}.</span>
                </div>
              </div>

              {/* Opening/Closing Year Section */}
              <div className="mt-6 pt-4 border-t border-border-dark/20 dark:border-text-secondary-dark/70 dark:text-gray-400">
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
            <Card className="p-4 overflow-visible backdrop-blur-sm bg-background/80 dark:bg-background-secondary-dark/70">
              <div className="flex items-center justify-between mb-3 text-text dark:text-[#7991a0]">
                <h2 className="text-lg font-semibold flex items-center">
                  <Icon name="notesBold" className={`w-5 h-5 me-1.5`} />
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
                                        : 'text-brand-color dark:text-brand-main/80' 
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
                          <TooltipContent side="top" className="max-w-[200px]">
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

              {/* Notes Section */}
              {notes && notes.trim() !== '' && (
                <div className="mt-3 pt-3 border-t border-border-dark/20 dark:border-text-secondary-dark/70 text-gray-900 dark:text-gray-400">
                  <div className="flex items-center mb-2">
                    <Icon name="infoBold" className={`w-5 h-5 ${locale === 'he' ? 'ml-1.5 mr-0' : 'mr-1.5 ml-0'}`} />
                    <h3 className="text-lg font-semibold">{t('notes')}</h3>
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
                </div>
              )}
            </Card>
          </div>

          {/* Get Directions Section */}
          <Card className="w-full p-4 backdrop-blur-sm bg-white/80 dark:bg-gray-800/70 transform-gpu">
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
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-2">
                    <Icon name="map" className="w-5 h-5 text-gray-900 dark:text-[#f2f2f2]" />
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-[#f2f2f2]">
                      {t('getDirections')}
                    </h3>
                  </div>

                  <div className="mx-auto max-w-[350px] flex flex-wrap justify-center gap-6 items-center">
                    {/* Waze Map Link with Tooltip */}
                    <div className="group relative">
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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t('waze')}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                      </div>
                    </div>

                    {/* Moovit Link with Tooltip */}
                    <div className="group relative">
                      <a 
                        href={generateMoovitUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`${t('moovit')} ${parkName}`}
                        className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                      >
                        <Icon 
                          name={theme === 'dark' ? "moovitDark" : "moovit"} 
                          className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-gray-900 dark:text-gray-100 drop-shadow-md dark:drop-shadow-lg overflow-visible"
                        />
                      </a>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t('moovit')}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                      </div>
                    </div>

                    {/* Apple Maps Link with Tooltip */}
                    <div className="group relative">
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
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t('appleMaps')}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                      </div>
                    </div>

                    {/* Google Maps Link with Tooltip */}
                    <div className="group relative">
                      <a 
                        href={generateGoogleMapsUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        aria-label={`${t('googleMaps')} ${parkName}`}
                        className="sm:p-3 rounded-xl sm:bg-white/30 sm:dark:bg-gray-800/5 flex items-center justify-center transition-transform duration-200 hover:scale-110"
                      >
                        <Icon 
                          name="newGoogleMaps" 
                          className="w-[3.15rem] h-[3.15rem] -mt-[2px] sm:w-[2.65rem] sm:h-[2.65rem] text-gray-900 dark:text-gray-100 drop-shadow-md dark:drop-shadow-lg overflow-visible"
                        />
                      </a>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {t('googleMaps')}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </Suspense>
          </Card>

          {/* Description */}
          {notes && notes.trim() !== '' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('about')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
                  {notes.split('\n').filter(note => note.trim()).map((note, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {note.trim()}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* YouTube Embed */}
          {skatepark.mediaLinks.youtube && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="youtube" className="w-5 h-5" />
                  {t('video')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YouTubeEmbed url={skatepark.mediaLinks.youtube} />
              </CardContent>
            </Card>
          )}

          {/* Google Maps Embed */}
          {skatepark.mediaLinks.googleMapsFrame && (
            <Card>
              <CardHeader>
                <CardTitle>{t('location')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  dangerouslySetInnerHTML={{ __html: skatepark.mediaLinks.googleMapsFrame }}
                  className="rounded-lg overflow-hidden"
                />
              </CardContent>
            </Card>
          )}

          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Icon name="messages" className="w-5 h-5" />
                  {t('reviewsCount')} ({reviews.length})
                </CardTitle>
                {reviews.length > 0 && (
                  <Select
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                    options={[
                      { value: 'newest', label: t('newestFirst') },
                      { value: 'oldest', label: t('oldestFirst') },
                      { value: 'highest', label: t('highestRated') },
                      { value: 'lowest', label: t('lowestRated') },
                    ]}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {skatepark.totalReviews > 0 && reviews.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('reviewsLoading')}
                  </p>
                </div>
              )}

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
                    {sortedReviews.map((review) => (
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
                </>
              )}

              {reviews.length === 0 && skatepark.totalReviews === 0 && (
                <div className="py-8 text-center">
                  <Icon name="messages" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('noReviewsYet')}
                  </p>
                </div>
              )}

              {/* Add Review Button - Only show if logged in */}
              <div className="mt-6">
                {status === 'loading' ? (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner className="h-6" />
                  </div>
                ) : session?.user ? (
                  <Button variant="primary" onClick={() => setShowAddReview(true)}>
                    <Icon name="messages" className="w-4 h-4 mr-2" />
                    {t('addReview')}
                  </Button>
                ) : (
                  <div className="text-center py-4 border border-border-dark/20 dark:border-text-secondary-dark/70 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {t('loginToReview')}
                    </p>
                    <Link href={`/${locale}/login`}>
                      <Button variant="primary">
                        {tCommon('signIn')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Nearby Parks */}
          {nearbyParks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('nearbySkateparks')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {nearbyParks.map((park) => {
                    const nearbyName = park.name[locale] || park.name.en || park.name.he;
                    return (
                      <Link
                        key={park._id}
                        href={`/${locale}/skateparks/${park.slug}`}
                        className="group"
                      >
                        <div className="relative h-48 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <Image
                            src={park.imageUrl}
                            alt={nearbyName}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="mt-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {nearbyName}
                          </h3>
                          {park.rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Icon name="star" className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{park.rating.toFixed(1)}</span>
                            </div>
                          )}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddReview(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-lg shadow-sm border border-border-dark/20 dark:border-text-secondary-dark/70 p-4 backdrop-blur-sm bg-white/80 dark:bg-gray-800/70">
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
    </>
  );
}


