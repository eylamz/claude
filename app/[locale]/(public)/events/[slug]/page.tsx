'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, Share2 } from 'lucide-react';
import { Icon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import FullscreenImageViewer from '@/components/skateparks/FullscreenImageViewer';

interface IEvent {
  _id: string;
  slug: string;
  category: 'roller' | 'skate' | 'scoot' | 'bike';
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
}

export default function EventPage() {
  const params = useParams();
  const locale = useLocale() as 'en' | 'he';
  const t = useTranslations('events');
  const slug = params.slug as string;

  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const fetchEvent = async () => {
    setLoading(true);
    setError(null);

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
      setLoading(false);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError('Failed to load event');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [slug, locale]);

  // Loading state - Duolingo style skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-12">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-6 w-3/4 mb-8" />
          <Skeleton className="h-80 w-full rounded-2xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
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

  // Check if event has passed
  const now = new Date();
  const eventStartDate = event.dateTime?.startDate ? new Date(event.dateTime.startDate) : new Date();
  const isEventPassed = eventStartDate < now;

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

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, string> = {
      roller: 'roller',
      skate: 'skate',
      scoot: 'scoot',
      bike: 'bike'
    };
    return iconMap[category] || 'calendar';
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      competition: 'rankingBold',
      workshop: 'books',
      event: 'calendarBold',
      meetup: 'user',
      jam: 'music'
    };
    return iconMap[type] || 'calendar';
  };

  /**
   * Share Button Component
   */
  const ShareButton = ({ title, url }: { title: string; url: string }) => {
    const [copied, setCopied] = useState(false);
    
    const handleShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
        } catch (err) {
          // User cancelled or error
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    };
    
    return (
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
        aria-label={locale === 'he' ? 'שתף את האירוע' : 'Share this event'}
      >
        <Share2 className="w-4 h-4" />
        <span>{copied ? (locale === 'he' ? 'הועתק!' : 'Copied!') : (locale === 'he' ? 'שתף' : 'Share')}</span>
      </button>
    );
  };

  // Handle opening the image viewer
  const handleOpenImageViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageViewerOpen(true);
  };

  // Handle closing the image viewer
  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false);
  };

  // Prepare media array for the fullscreen viewer
  const mediaArray: { url: string }[] = [];
  
  // Add featured image first if it exists
  if (event?.featuredImage?.url && typeof event.featuredImage.url === 'string' && event.featuredImage.url.trim() !== '') {
    mediaArray.push({ url: event.featuredImage.url });
  }
  
  // Add other media items
  if (event.media && Array.isArray(event.media)) {
    event.media.forEach((mediaItem: any) => {
      if (mediaItem && typeof mediaItem === 'object' && mediaItem.url && typeof mediaItem.url === 'string' && mediaItem.url.trim() !== '') {
        // Don't add featured image twice
        if (mediaItem.url !== event.featuredImage?.url) {
          mediaArray.push({ url: mediaItem.url });
        }
      }
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = event ? `${siteUrl}/${locale}/events/${event.slug}` : '';

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Article Header - Duolingo Style */}
        <header className="my-10">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {event.isFeatured && (
              <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                <Icon name="star" className="w-3 h-3" />
                <span>{locale === 'he' ? 'אירוע מומלץ' : 'Featured Event'}</span>
              </span>
            )}
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-brand-main/10 text-brand-main dark:bg-brand-main/20 dark:text-brand-dark flex items-center gap-1 capitalize">
              <Icon name={getCategoryIcon(event.category) as any} className="w-3 h-3" />
              {event.category}
            </span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 flex items-center gap-1 capitalize">
              <Icon name={getTypeIcon(event.type) as any} className="w-3 h-3" />
              {event.type}
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-8">
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
                      <Icon name="clockBold" className="w-4 h-4" />
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

          {/* Event Details Card */}
          <div className="bg-card dark:bg-card-dark rounded-2xl p-6 mb-8">
            <div className="space-y-4">
              {getLocalizedAddress() && (
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
                      (isEventPassed ? 
                        (locale === 'he' ? 'הרשמה סגורה' : 'Registration Closed') : 
                        (locale === 'he' ? 'נדרשת הרשמה מראש' : 'Registration Required')
                      ) : 
                      (locale === 'he' ? 'ללא הרשמה מראש' : 'No Registration')
                    }
                  </span>
                </div>
              </div>

              {/* Registration Button */}
              {event.registrationRequired && event.registrationUrl && !isEventPassed && (
                <div className="pt-2">
                  <a 
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-brand-main hover:bg-brand-main/90 text-white font-semibold py-2.5 px-6 rounded-full text-center transition-colors"
                  >
                    {locale === 'he' ? 'הירשם עכשיו' : 'Register Now'}
                  </a>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {event.viewCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {locale === 'he' ? 'צפיות' : 'Views'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {event.interestedCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isEventPassed ? 
                      (locale === 'he' ? 'התעניינו' : 'Were Interested') : 
                      (locale === 'he' ? 'מתעניינים' : 'Interested')
                    }
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {event.attendingCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isEventPassed ? 
                      (locale === 'he' ? 'הגיעו' : 'Attended') : 
                      (locale === 'he' ? 'מגיעים' : 'Attending')
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Cover Image - Full width with rounded corners */}
        {event.featuredImage?.url && (
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-10">
            <Image
              src={event.featuredImage.url}
              alt={getLocalizedAltText()}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
            />
          </div>
        )}

        {/* Article Content */}
        <article className="mb-12">
          {/* Content Sections */}
          {event.content?.[locale]?.sections && event.content[locale].sections.length > 0 && (
            <div className="space-y-6">
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

          {/* Media Gallery */}
          {mediaArray.length > 0 && (
            <div className="my-8">
              <h2 className="text-[1.225rem] sm:text-3xl font-extrabold mb-6 text-gray-900 dark:text-white">
                {locale === 'he' ? 'גלריית תמונות' : 'Photo Gallery'}
              </h2>
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                role="region"
                aria-label={locale === 'he' ? 'גלריית תמונות אירוע' : 'Event media gallery'}
              >
                {mediaArray.map((mediaItem: any, index: number) => {
                  if (!mediaItem || typeof mediaItem !== 'object' || !mediaItem.url || typeof mediaItem.url !== 'string' || mediaItem.url.trim() === '') return null;
                  
                  return (
                    <div 
                      key={index} 
                      className="relative h-[250px] rounded-2xl overflow-hidden cursor-pointer group"
                      onClick={() => handleOpenImageViewer(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenImageViewer(index);
                        }
                      }}
                      aria-label={`${locale === 'he' ? 'לחץ להגדלה' : 'Click to zoom'} - ${locale === 'he' ? 'פריט מדיה' : 'Media item'} ${index + 1} ${locale === 'he' ? 'עבור' : 'for'} ${getLocalizedTitle() || (locale === 'he' ? 'אירוע' : 'event')}`}
                    >
                      <Image
                        src={mediaItem.url}
                        alt={`${locale === 'he' ? 'פריט מדיה' : 'Media item'} ${index + 1} ${locale === 'he' ? 'עבור' : 'for'} ${getLocalizedTitle() || (locale === 'he' ? 'אירוע' : 'event')}`}
                        fill
                        className="object-cover transition-all duration-200 group-hover:scale-[1.02]"
                      />
                      {/* Overlay with zoom icon */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 shadow-lg transition-opacity duration-200 bg-white/20 backdrop-blur-sm rounded-full p-2">
                          <Icon name="zoomIn" className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </article>

        {/* Tags Section - Duolingo Style */}
        {getLocalizedTags().length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
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

        {/* Share Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mb-12">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {locale === 'he' ? 'שתף אירוע' : 'Share Event'}
            </span>
            <ShareButton title={getLocalizedTitle()} url={canonicalUrl} />
          </div>
        </div>

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

      {/* Fullscreen Image Viewer */}
      {isImageViewerOpen && Array.isArray(mediaArray) && mediaArray.length > 0 && mediaArray.some(item => item && item.url) && (
        <FullscreenImageViewer
          images={mediaArray}
          initialIndex={selectedImageIndex}
          isOpen={isImageViewerOpen}
          onClose={handleCloseImageViewer}
        />
      )}
    </div>
  );
}
