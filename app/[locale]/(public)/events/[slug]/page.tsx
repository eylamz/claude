'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Icon } from '@/components/icons';
import { Skeleton, Button } from '@/components/ui';
import ParkImageGallery from '@/components/skateparks/ParkImageGallery';
import { getMetaTitleWithFallback, DEFAULT_META_TITLE } from '@/lib/seo/utils';
import { Separator } from '@/components/ui';
import {
  parseEventsVersion,
  isEventsCacheFresh,
  getEventsFetchedAtReadable,
} from '@/lib/search-from-cache';

interface IEvent {
  _id: string;
  slug: string;
  relatedSports: string[];
  type: 'competition' | 'workshop' | 'event' | 'meetup' | 'jam';
  status: 'draft' | 'published' | 'archived' | 'cancelled';
  isFeatured: boolean;
  
  // Event timing
  dateTime: {
    startDate: Date | string;
    endDate?: Date | string;
    startTime?: string;
    endTime?: string;
    timezone: {
      he: string;
      en: string;
    };
  };
  
  // Event location
  location: {
    name: {
      he: string;
      en: string;
    };
    address?: {
      he: string;
      en: string;
    };
    url?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Engagement metrics
  viewCount: number;
  interestedCount: number;
  attendingCount: number;
  
  // Localized content
  content: {
    he: {
      title: string;
      description: string;
      tags: string[];
      sections: any[];
    };
    en: {
      title: string;
      description: string;
      tags: string[];
      sections: any[];
    };
  };
  
  // Media management
  media: any[];
  featuredImage: {
    url: string;
    cloudinaryId?: string;
    altText: {
      he: string;
      en: string;
    };
  };
  
  // Event specific fields
  isOnline: boolean;
  isFree: boolean;
  registrationRequired: boolean;
  registrationUrl?: string;
  registrationClosesAt?: string;

  // SEO (from model / events_cache)
  metaTitle?: { en: string; he: string };
  metaDescription?: { en: string; he: string };
  metaKeywords?: { en: string; he: string };
}

export default function EventPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'he';
  const slug = params.slug as string;
  const t = useTranslations('events');

  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [, setCurrentVersion] = useState<number | null>(null);

  const fetchEvent = async () => {
    if (!cacheInitialized) return;

    setLoading(true);
    setError(null);

    const cacheKey = 'events_cache';
    const versionKey = 'events_version';

    const getEventFromCache = (): IEvent | null => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return null;
        const e = arr.find((x: any) => x.slug && x.slug.toLowerCase() === slug.toLowerCase());
        return e && e.content != null ? (e as IEvent) : null;
      } catch {
        return null;
      }
    };

    // 1) Try cache first (full format has content)
    let eventFromCache = getEventFromCache();
    if (eventFromCache) {
      setEvent(eventFromCache);
      setLoading(false);
      return;
    }

    // 2) Cache miss or list-format cache: ensure full cache then try again (no locale – full has he/en)
    try {
      const fullRes = await fetch(`/api/events?full=true`);
      if (fullRes.ok) {
        const { events: allEvents = [], version } = await fullRes.json();
        if (Array.isArray(allEvents) && allEvents.length > 0) {
          localStorage.setItem(cacheKey, JSON.stringify(allEvents));
          localStorage.setItem(
            versionKey,
            JSON.stringify({ version: version ?? 1, fetchedAt: getEventsFetchedAtReadable() })
          );
          eventFromCache = getEventFromCache();
          if (eventFromCache) {
            setEvent(eventFromCache);
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to refresh events cache:', err);
    }

    // 3) Still not found (e.g. draft/deleted): fallback to slug API
    try {
      const response = await fetch(`/api/events/${slug}?locale=${locale}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Event not found');
        } else {
          setError('Failed to load event');
        }
        setLoading(false);
        return;
      }
      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  // Check version and cache on mount (refetch only after 1 hour from last fetch)
  useEffect(() => {
    const checkVersionAndCache = async () => {
      const cacheKey = 'events_cache';
      const versionKey = 'events_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersionRaw = localStorage.getItem(versionKey);
      const { version: storedVersionNum, fetchedAt } = parseEventsVersion(cachedVersionRaw);

      if (!cachedData || !cachedVersionRaw) {
        try {
          const response = await fetch(`/api/events?full=true`);
          if (response.ok) {
            const data = await response.json();
            const currentVersion = data.version || 1;
            const allEvents = data.events || [];
            localStorage.setItem(cacheKey, JSON.stringify(allEvents));
            localStorage.setItem(
              versionKey,
              JSON.stringify({ version: currentVersion, fetchedAt: getEventsFetchedAtReadable() })
            );
            setCurrentVersion(currentVersion);
          }
        } catch (error) {
          console.error('Error fetching events for cache:', error);
        }
      } else if (isEventsCacheFresh(fetchedAt)) {
        setCurrentVersion(storedVersionNum ?? parseInt(cachedVersionRaw, 10));
      } else {
        try {
          const versionResponse = await fetch('/api/events?versionOnly=true');
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            const fetchedVersion = versionData.version || 1;
            setCurrentVersion(fetchedVersion);
            const storedVersion = storedVersionNum ?? parseInt(cachedVersionRaw, 10);
            if (storedVersion !== fetchedVersion) {
              const response = await fetch(`/api/events?full=true`);
              if (response.ok) {
                const data = await response.json();
                const newVersion = data.version || 1;
                const allEvents = data.events || [];
                localStorage.setItem(cacheKey, JSON.stringify(allEvents));
                localStorage.setItem(
                  versionKey,
                  JSON.stringify({ version: newVersion, fetchedAt: getEventsFetchedAtReadable() })
                );
                setCurrentVersion(newVersion);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to check events version', error);
        }
      }
      setCacheInitialized(true);
    };

    checkVersionAndCache();
  }, [locale]);

  // Fetch event only when cache is initialized
  useEffect(() => {
    if (!cacheInitialized) return;
    fetchEvent();
  }, [slug, locale, cacheInitialized]);

  // When event is loaded (from cache or API), set document title and meta from SEO so tab reflects cached/fetched data.
  // Fallback chain: locale metaTitle → English metaTitle → layout default (DEFAULT_META_TITLE).
  useEffect(() => {
    if (!event) return;
    const metaTitleResolved = getMetaTitleWithFallback(event.metaTitle, locale);
    const contentTitleFallback = event.content?.[locale]?.title || event.content?.en?.title || '';
    const titleBase = (metaTitleResolved !== DEFAULT_META_TITLE ? metaTitleResolved : null)
      || contentTitleFallback
      || DEFAULT_META_TITLE;
    const brand = locale === 'he' ? 'אנבוס' : 'ENBOSS';
    document.title = titleBase === DEFAULT_META_TITLE ? DEFAULT_META_TITLE : `${brand} | ${titleBase}`;
    const otherLocale = locale === 'he' ? 'en' : 'he';
    const getSeo = (field: { en: string; he: string } | undefined) => {
      if (!field) return '';
      const primary = (field[locale as 'en' | 'he'] ?? '').trim();
      const fallback = (field[otherLocale as 'en' | 'he'] ?? '').trim();
      return primary || fallback || '';
    };
    const description = getSeo(event.metaDescription) || event.content?.[locale]?.description || event.content?.en?.description || '';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description ? description.substring(0, 160) : '');
  }, [event, locale]);

  // Loading state - Skeleton matching event page structure
  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <main className="max-w-3xl mx-auto py-8 sm:py-12">
          {/* Article Header - matches header with my-10 px-4 sm:px-6 */}
          <header className="my-10 px-4 sm:px-6">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Skeleton className="h-7 w-24 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>

            {/* Title - Large and bold */}
            <Skeleton className="h-12 w-full mb-4 rounded-lg" />

            {/* Description/Subtitle */}
            <Skeleton className="h-5 w-4/5 mb-6 rounded" />

            {/* Date, Time, and Location row */}
            <div className="flex flex-wrap items-center gap-3 text-sm mb-8">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-36 rounded" />
            </div>

            {/* Event Details Card */}
            <div className="bg-card dark:bg-card-dark rounded-2xl p-6 mb-8">
              <div className="space-y-4">
                {/* Address block with share */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Skeleton className="w-4 h-4 rounded flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 max-w-xs rounded" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                </div>
                {/* Online / Free / Registration row */}
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 w-36 rounded" />
                </div>
                {/* Registration button area */}
                <div className="pt-2">
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              </div>
            </div>
          </header>

          {/* Photo Gallery - ParkImageGallery placeholder */}
          <div className="px-4 sm:px-6 mb-10">
            <Skeleton className="w-full aspect-[16/9] rounded-2xl" />
          </div>

          {/* Article Content - sections */}
          <article className="mb-12">
            <div className="space-y-6 px-4 sm:px-6">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-full rounded" />
              <Skeleton className="h-5 w-4/5 rounded" />
            </div>
          </article>

          {/* Tags Section */}
          <div className="px-4 sm:px-6 mb-8">
            <Separator />
            <div className="flex items-center gap-2 mb-4 pt-8">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
            </div>
          </div>

          {/* Back to Events - Bottom CTA */}
          <div className="text-center pt-8">
            <Skeleton className="h-12 w-40 rounded-full mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center px-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || (locale === 'he' ? 'אירוע לא נמצא' : 'Event not found')}
          </h1>
          <Link
            href={`/${locale}/events`}
            className="inline-flex items-center gap-2 text-brand-main hover:text-brand-main/80 dark:text-brand-dark font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירועים' : 'Back to Events'}
          </Link>
        </div>
      </div>
    );
  }

  // Check if event has passed and if registration has closed (by date/time)
  const now = new Date();
  const eventStartDate = event.dateTime?.startDate ? new Date(event.dateTime.startDate) : new Date();
  const isEventPassed = eventStartDate < now;
  const isRegistrationClosed = event.registrationClosesAt ? new Date(event.registrationClosesAt) < now : false;

  const getLocalizedTitle = () => {
    if (!event.content) return '';
    return locale === 'he' ? (event.content.he?.title || '') : (event.content.en?.title || '');
  };
  const getLocalizedDescription = () => {
    if (!event.content) return '';
    return locale === 'he' ? (event.content.he?.description || '') : (event.content.en?.description || '');
  };
  const getLocalizedTags = () => {
    if (!event.content) return [];
    const tags = locale === 'he' ? event.content.he?.tags : event.content.en?.tags;
    return tags || [];
  };
  const getLocalizedLocationName = () => {
    if (!event.location?.name) return '';
    return locale === 'he' ? (event.location.name.he || '') : (event.location.name.en || '');
  };
  const getLocalizedAddress = () => {
    if (!event.location?.address) return null;
    return locale === 'he' ? (event.location.address.he || null) : (event.location.address.en || null);
  };
  const getLocalizedTimezone = () => {
    if (!event.dateTime?.timezone) return locale === 'he' ? 'אסיה/ירושלים' : 'Asia/Jerusalem';
    return locale === 'he' ? (event.dateTime.timezone.he || 'אסיה/ירושלים') : (event.dateTime.timezone.en || 'Asia/Jerusalem');
  };
  const getLocalizedAltText = () => {
    if (!event.featuredImage?.altText) return getLocalizedTitle() || 'Event image';
    return locale === 'he' ? (event.featuredImage.altText.he || getLocalizedTitle()) : (event.featuredImage.altText.en || getLocalizedTitle());
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  // Same icon names as guides filter bar (guides-page-client SPORT_CONFIG)
  const getSportIcon = (sport: string) => {
    const iconMap: Record<string, string> = {
      roller: 'Roller',
      skate: 'Skate',
      scoot: 'scooter',
      bmx: 'bmx-icon',
      longboard: 'Longboard',
      bike: 'bmx-icon', // legacy
    };
    return iconMap[sport] || 'calendar';
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      competition: 'rankingBold',
      session: 'clock',
      camp: 'location',
      premiere: 'star',
      workshop: 'books',
      event: 'calendarBold',
      meetup: 'user',
      jam: 'music'
    };
    return iconMap[type] || 'calendar';
  };

  // Gallery images for ParkImageGallery (same format as skateparks)
  const galleryImages: { url: string; alt?: string }[] = [];
  if (event?.featuredImage?.url && typeof event.featuredImage.url === 'string' && event.featuredImage.url.trim() !== '') {
    galleryImages.push({ url: event.featuredImage.url, alt: getLocalizedAltText() });
  }
  if (event.media && Array.isArray(event.media)) {
    event.media.forEach((mediaItem: any) => {
      if (mediaItem && typeof mediaItem === 'object' && mediaItem.url && typeof mediaItem.url === 'string' && mediaItem.url.trim() !== '') {
        if (mediaItem.url !== event.featuredImage?.url) {
          galleryImages.push({ url: mediaItem.url, alt: mediaItem.altText?.[locale] || mediaItem.alt });
        }
      }
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = event ? `${siteUrl}/${locale}/events/${event.slug}` : '';

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-3xl mx-auto py-8 sm:py-12">
        {/* Article Header - Duolingo Style */}
        <header className="my-10 px-4 sm:px-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {event.isFeatured && (
              <span className="px-2 py-1 rounded-lg text-sm font-semibold bg-green-bg dark:bg-green-dark text-green dark:text-green-bg-dark flex items-center gap-1">
                <Icon name="star" className="w-4 h-4 fill-green dark:fill-green-bg-dark" />
                <span>{locale === 'he' ? 'אירוע מומלץ' : 'Featured Event'}</span>
              </span>
            )}
            {(event.relatedSports && event.relatedSports.length > 0 ? event.relatedSports : []).map((sport: string) => (
              <span key={sport} className="px-2 py-1 rounded-lg text-sm font-semibold bg-blue-bg dark:bg-blue-dark text-blue dark:text-blue-bg-dark flex items-center gap-1.5">
                <Icon name={getSportIcon(sport) as any} className="w-4 h-4" />
                {t(`sports.${sport}` as any) || sport}
              </span>
            ))}
            <span className="px-2 py-1 rounded-lg text-sm font-semibold bg-orange dark:bg-orange-dark text-orange-bg dark:text-orange-bg-dark flex items-center gap-1">
              <Icon name={getTypeIcon(event.type) as any} className="w-4 h-4" />
              {t(`types.${event.type}` as any) || event.type}
            </span>
          </div>

          {/* Title - Large and bold */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
            {getLocalizedTitle()}
          </h1>

          {/* Description/Subtitle - Hook line */}
          <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {getLocalizedDescription()}
          </p>

          {/* Date, Time, and Location - Second appearance (below description) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <div className="flex flex-wrap items-center gap-3">
              {event.dateTime?.startDate && (
                <>
                  <div className="flex items-center gap-1">
                    <Icon name="calendar" className="w-4 h-4" />
                    <span>{formatDate(event.dateTime.startDate)}</span>
                  </div>
                  {event.dateTime.startTime && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Icon name="clock" className="w-4 h-4" />
                        <span>{formatTime(event.dateTime.startTime)}</span>
                        {locale !== 'he' && (
                          <span className="text-xs opacity-80">({getLocalizedTimezone()})</span>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
              {getLocalizedLocationName() && (
                <>
                  {event.dateTime?.startDate && <span>•</span>}
                  <div className="flex items-center gap-1">
                    <Icon name="location" className="w-4 h-4" />
                    <span>{getLocalizedLocationName()}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Event Details Card */}
          <div className="bg-card dark:bg-card-dark rounded-2xl p-6 mb-8">
            <div className="space-y-4">
              
              {getLocalizedAddress() && (
                <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Icon name="location" className="w-4 h-4 text-brand-main mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{getLocalizedAddress()}</p>
                    {event.location.url && (
                      <a 
                        href={event.location.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-main hover:text-brand-main/80 dark:text-brand-dark text-sm mt-1"
                      >
                        <Icon name="link" className="w-3 h-3" />
                        <span>{locale === 'he' ? 'פתח במפה' : 'Open in Maps'}</span>
                      </a>
                    )}
                  </div>
                </div>
                            <Button
              variant="green"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.share) {
                  navigator.share({
                    title: getLocalizedTitle(),
                    text: `${getLocalizedTitle()} - ${locale === 'he' ? 'אירוע' : 'Event'}`,
                    url: typeof window !== 'undefined' ? window.location.href : canonicalUrl,
                  }).catch((error) => {
                    console.error('Error sharing:', error);
                  });
                } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : canonicalUrl);
                }
              }}
              className="!h-8 px-2 py-1 rounded-lg font-medium flex-shrink-0 "
              aria-label={locale === 'he' ? 'שתף אירוע' : 'Share event'}
            >
              <Icon name="shareBold" className="-mt-[1px] w-4 h-4" />
            </Button>

                </div>
              )}

              <div className="flex flex-wrap gap-4">
                {event.isOnline && (
                  <div className="flex items-center gap-2">
                    <Icon name="monitor" className="w-4 h-4 text-brand-main" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {locale === 'he' ? 'אירוע מקוון' : 'Online Event'}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Icon name={event.isFree ? "gift" : "tag"} className="w-4 h-4 text-brand-main" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {event.isFree ? 
                      (locale === 'he' ? 'השתתפות חינם' : 'Free participation') : 
                      (locale === 'he' ? 'השתתפות בתשלום' : 'Paid')
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="task" className="w-4 h-4 text-brand-main" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {event.registrationRequired ? 
                      (isEventPassed || isRegistrationClosed ? 
                        (locale === 'he' ? 'הרשמה סגורה' : 'Registration Closed') : 
                        (locale === 'he' ? 'נדרשת הרשמה מראש' : 'Registration Required')
                      ) : 
                      (locale === 'he' ? 'ללא הרשמה מראש' : 'No Registration')
                    }
                  </span>
                </div>
              </div>

              {/* Registration Button */}
              {event.registrationRequired && !isEventPassed && !isRegistrationClosed && (
                <div className="pt-2">
                  {event.registrationUrl ? (
                    <a 
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-brand-main hover:bg-brand-main/90 text-white font-semibold py-2.5 px-6 rounded-full text-center transition-colors"
                    >
                      {locale === 'he' ? 'הירשם עכשיו' : 'Register Now'}
                    </a>
                  ) : (
                    <Link 
                      href={`/${locale}/events/${event.slug}/signup`}
                      className="inline-block bg-brand-main hover:bg-brand-main/90 text-white font-semibold py-2.5 px-6 rounded-full text-center transition-colors"
                    >
                      {locale === 'he' ? 'הירשם עכשיו' : 'Register Now'}
                    </Link>
                  )}
                </div>
              )}

            </div>
          </div>
        </header>

        {/* Photo Gallery - same layout as skateparks (main + side, mobile swipe, show more) */}
        {galleryImages.length > 0 && (
          <ParkImageGallery
            images={galleryImages}
            className="mb-10"
            locale={locale}
          />
        )}

        {/* Article Content */}
        <article className="mb-12">
          {/* Content Sections */}
          {event.content?.[locale]?.sections && event.content[locale].sections.length > 0 && (
            <div className="space-y-6 px-4 sm:px-6">
              {(event.content[locale]?.sections || []).map((section: any, index: number) => {
                switch (section.type) {
                  case 'heading':
                    const HeadingTag = section.level === 1 ? 'h2' : section.level === 2 ? 'h3' : 'h4';
                    const headingClasses = {
                      h2: 'text-[1.225rem] sm:text-3xl font-extrabold mt-12 mb-4 text-gray-900 dark:text-white',
                      h3: 'text-xl sm:text-[1.225rem] font-bold mt-10 mb-3 text-gray-900 dark:text-white',
                      h4: 'text-lg sm:text-xl font-bold mt-8 mb-2 text-gray-900 dark:text-white',
                    };
                    return (
                      <HeadingTag
                        key={index}
                        className={headingClasses[HeadingTag as 'h2' | 'h3' | 'h4'] || headingClasses.h2}
                      >
                        {section.content}
                      </HeadingTag>
                    );

                  case 'text':
                    return (
                      <p key={index} className="text-[1rem] leading-relaxed text-gray-700 dark:text-gray-300">
                        {section.content}
                      </p>
                    );

                  case 'list':
                    const ListTag = section.listType === 'numbered' ? 'ol' : 'ul';
                    const isNumbered = section.listType === 'numbered';
                    const isRTL = locale === 'he';
                    return (
                      <ListTag 
                        key={index} 
                        className={`my-6 space-y-3 ${isNumbered ? 'list-decimal' : 'list-none'} ${isRTL ? 'pr-0' : 'pl-0'}`}
                      >
                        {section.items && section.items.map((item: { title: string; content: string }, itemIndex: number) => (
                          <li 
                            key={itemIndex} 
                            className={`text-lg text-gray-700 dark:text-gray-300 leading-relaxed flex gap-3`}
                          >
                            {!isNumbered && (
                              <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
                            )}
                            <div>
                              {item.title && (
                                <>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {item.title}
                                  </span>
                                  <br />
                                </>
                              )}
                              {item.content}
                            </div>
                          </li>
                        ))}
                      </ListTag>
                    );

                  case 'image':
                    return (
                      <figure key={index} className="my-8">
                        <Image
                          src={section.data.url}
                          alt={section.data.alt || ''}
                          width={section.data.width || 800}
                          height={section.data.height || 450}
                          className="w-full h-auto rounded-2xl"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                        />
                        {section.data.caption && (
                          <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3 italic">
                            {section.data.caption}
                          </figcaption>
                        )}
                      </figure>
                    );

                  case 'info-box':
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-lg text-sm ${
                          section.boxStyle === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200' :
                          section.boxStyle === 'highlight' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' :
                          'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {section.content}
                      </div>
                    );

                  case 'divider':
                    return (
                      <hr key={index} className="my-12 border-t-2 border-gray-200 dark:border-gray-700" />
                    );

                  default:
                    return null;
                }
              })}
            </div>
          )}

        </article>

        {/* Tags Section - Duolingo Style */}
        {getLocalizedTags().length > 0 && (
          <div className=" px-4 sm:px-6 mb-8">
            <Separator />

            <div className="flex items-center gap-2 mb-4 pt-8">
              <Icon name="tagBold" className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {locale === 'he' ? 'תגיות' : 'Tags'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {getLocalizedTags().map((tag, index) => (
                <Link
                  key={index}
                  href={`/${locale}/events?tag=${encodeURIComponent(tag)}`}
                  className="capitalize px-2 py-1 rounded-lg text-[12px] md:text-xs font-semibold bg-[#e7defc] dark:bg-[#472881] text-[#915bf5] dark:text-[#c5b6fd] border-[#b99ef867] dark:border-[#5f4cc54d] transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Events - Bottom CTA */}
        <div className="text-center pt-8">
          <Link
            href={`/${locale}/events`}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-main hover:bg-brand-main/90 text-white font-semibold transition-colors ${locale === 'he' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <ChevronLeft className="w-4 h-4" />
            {locale === 'he' ? 'חזרה לאירועים' : 'Back to Events'}
          </Link>
        </div>
      </main>
    </div>
  );
}
