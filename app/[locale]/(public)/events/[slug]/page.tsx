'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import {
  Calendar,
  Clock,
  MapPin,
  Share2,
  Plus,
  Heart,
  Users,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  ChevronLeft,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea, Skeleton } from '@/components/ui';

interface Event {
  _id: string;
  slug: string;
  title: { en: string; he: string } | string;
  description: { en: string; he: string } | string;
  shortDescription: { en: string; he: string } | string;
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  location: {
    name: { en: string; he: string } | string;
    address: { en: string; he: string } | string;
    coordinates?: { latitude: number; longitude: number };
    venueUrl?: string;
  };
  images: Array<{ url: string; alt: { en: string; he: string } | string; order: number }>;
  featuredImage: string;
  videoUrl?: string;
  relatedSports: string[];
  category: string;
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  capacity?: number;
  isFree: boolean;
  price?: number;
  currency?: string;
  registrationUrl?: string;
  viewsCount: number;
  interestedCount: number;
  attendedCount: number;
  status: string;
  isFeatured: boolean;
  isPublic: boolean;
  registrationRequired: boolean;
  metaTitle?: { en: string; he: string } | string;
  metaDescription?: { en: string; he: string } | string;
  tags: string[];
}

interface Attendee {
  id: string;
  name: string;
  avatar?: string;
}

interface RelatedEvent {
  _id: string;
  slug: string;
  title: { en: string; he: string } | string;
  featuredImage: string;
  startDate: string;
  location: {
    name: { en: string; he: string } | string;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('events');
  
  const slug = params.slug as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction states
  const [isInterested, setIsInterested] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Countdown state
  const [countdown, setCountdown] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  
  // Registration form state
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState<string | null>(null);
  
  // Refresh attendance counter
  const refreshAttendance = async () => {
    if (!event) return;
    try {
      const response = await fetch(`/api/events/${slug}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      }
    } catch (error) {
      console.error('Error refreshing attendance:', error);
    }
  };

  useEffect(() => {
    fetchEvent();
    
    // Set up interval to refresh attendance every 30 seconds
    const interval = setInterval(refreshAttendance, 30000);
    return () => clearInterval(interval);
  }, [slug, locale]);

  // Countdown timer
  useEffect(() => {
    if (!event) return;
    
    const eventStart = new Date(event.startDate);
    const updateCountdown = () => {
      const now = new Date();
      const diff = eventStart.getTime() - now.getTime();
      
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      } else {
        setCountdown(null);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/events/${slug}?locale=${locale}`);
      if (!response.ok) {
        throw new Error('Event not found');
      }
      const data = await response.json();
      setEvent(data.event);
      setRelatedEvents(data.relatedEvents || []);
      setAttendees(data.attendees || []);
      
      // Check user's interaction status
      // TODO: Implement API to check if user is interested/going
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedField = (field: { en: string; he: string } | string): string => {
    if (typeof field === 'string') return field;
    return field[locale as 'en' | 'he'] || field.en || field.he;
  };

  const handleInterested = async () => {
    try {
      // TODO: Implement API call to toggle interest
      setIsInterested(!isInterested);
      if (event) {
        setEvent({
          ...event,
          interestedCount: event.interestedCount + (isInterested ? -1 : 1),
        });
      }
    } catch (error) {
      console.error('Error toggling interest:', error);
    }
  };

  const handleGoing = async () => {
    try {
      // TODO: Implement API call to toggle going
      setIsGoing(!isGoing);
    } catch (error) {
      console.error('Error toggling going:', error);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${pathname}`;
    const title = event ? getLocalizedField(event.title) : '';
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: event ? getLocalizedField(event.shortDescription || event.description) : '',
          url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShowShareMenu(false);
      // Show toast notification
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    
    const startDateTime = new Date(event.startDate);
    const endDateTime = new Date(event.endDate || event.startDate);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const calendarUrl = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDateTime)}`,
      `DTEND:${formatDate(endDateTime)}`,
      `SUMMARY:${getLocalizedField(event.title)}`,
      `DESCRIPTION:${getLocalizedField(event.description)}`,
      `LOCATION:${getLocalizedField(event.location.name || event.location.address)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([calendarUrl], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.slug}.ics`;
    link.click();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      // Convert form data to array format
      const formDataArray = Object.entries(formData).map(([name, value]) => ({
        name,
        value,
        type: name.toLowerCase().includes('email') ? 'email' : 
              name.toLowerCase().includes('phone') ? 'phone' :
              name.toLowerCase().includes('number') ? 'number' : 'text',
        label: name,
      }));
      
      const response = await fetch(`/api/events/${slug}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData: formDataArray }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        } else {
          setFormErrors({ submit: data.message || 'An error occurred' });
        }
        return;
      }
      
      setSubmissionSuccess(true);
      setConfirmationNumber(data.confirmationNumber);
      setShowRegistrationForm(false);
      
      // Refresh attendance
      setTimeout(refreshAttendance, 1000);
    } catch (error) {
      setFormErrors({ submit: 'Failed to submit registration' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPast = event ? new Date(event.endDate || event.startDate) < new Date() : false;
  const isHappeningNow = event ? 
    new Date(event.startDate) <= new Date() && new Date(event.endDate || event.startDate) >= new Date() : false;
  const hasSpotsAvailable = event?.capacity ? 
    (event.attendedCount < event.capacity) : true;
  const spotsRemaining = event?.capacity ? event.capacity - event.attendedCount : null;

  if (loading) {
    return (
      <div className="min-h-screen ">
        <Skeleton className="h-96 w-full" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || 'Event not found'}
          </h1>
          <Link href={`/${locale}/events`}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Social meta tags structured data
  const eventImage = event.featuredImage || event.images?.[0]?.url || '/placeholder-event.jpg';
  const eventTitle = getLocalizedField(event.title);
  const eventDescription = getLocalizedField(event.description);

  return (
    <>
      {/* Structured Data for SEO */}
      <Script
        id="event-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: eventTitle,
            description: eventDescription,
            startDate: event.startDate,
            endDate: event.endDate || event.startDate,
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            eventStatus: isPast ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
            location: {
              '@type': 'Place',
              name: getLocalizedField(event.location.name),
              address: {
                '@type': 'PostalAddress',
                streetAddress: getLocalizedField(event.location.address),
              },
              ...(event.location.coordinates && {
                geo: {
                  '@type': 'GeoCoordinates',
                  latitude: event.location.coordinates.latitude,
                  longitude: event.location.coordinates.longitude,
                },
              }),
            },
            image: eventImage,
            organizer: {
              '@type': 'Organization',
              name: event.organizer.name,
              email: event.organizer.email,
            },
            ...(event.price && {
              offers: {
                '@type': 'Offer',
                price: event.price,
                priceCurrency: event.currency || 'ILS',
                availability: hasSpotsAvailable
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/SoldOut',
              },
            }),
          }),
        }}
      />

      {/* Meta tags */}
      <meta property="og:title" content={eventTitle} />
      <meta property="og:description" content={eventDescription} />
      <meta property="og:image" content={eventImage} />
      <meta property="og:type" content="event" />
      <meta property="og:url" content={`${typeof window !== 'undefined' ? window.location.origin : ''}${pathname}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={eventTitle} />
      <meta name="twitter:description" content={eventDescription} />
      <meta name="twitter:image" content={eventImage} />

      <div className="min-h-screen ">
        {/* Hero Image with Overlay */}
        <div className="relative h-[60vh] min-h-[400px] bg-gray-900">
          <Image
            src={eventImage}
            alt={eventTitle}
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Overlay Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto w-full">
              {isHappeningNow && (
                <div className="mb-4 inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  {t('happeningNow')}
                </div>
              )}
              
              {countdown && (
                <div className="mb-4 flex gap-4 text-white">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{countdown.days}</div>
                    <div className="text-sm opacity-80">{t('countdown.days')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{countdown.hours}</div>
                    <div className="text-sm opacity-80">{t('countdown.hours')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{countdown.minutes}</div>
                    <div className="text-sm opacity-80">{t('countdown.minutes')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{countdown.seconds}</div>
                    <div className="text-sm opacity-80">{t('countdown.seconds')}</div>
                  </div>
                </div>
              )}
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {eventTitle}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-white">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(event.startDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                
                {!event.isAllDay && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>
                      {new Date(event.startDate).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{getLocalizedField(event.location.name || event.location.address)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Button
              variant={isInterested ? 'primary' : 'outline'}
              onClick={handleInterested}
            >
              <Heart className={`w-4 h-4 mr-2 ${isInterested ? 'fill-current' : ''}`} />
              {isInterested ? t('interested') : t('markInterested')}
            </Button>
            
            <Button
              variant={isGoing ? 'primary' : 'outline'}
              onClick={handleGoing}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isGoing ? t('going') : t('markGoing')}
            </Button>
            
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              {t('share')}
            </Button>
            
            <Button variant="outline" onClick={handleAddToCalendar}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addToCalendar')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Event Description */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('about')}
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {eventDescription}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Location Map */}
              {event.location.coordinates && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('location')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="aspect-video rounded-lg overflow-hidden mb-4">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${event.location.coordinates?.latitude},${event.location.coordinates?.longitude}&zoom=15`}
                        allowFullScreen
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {getLocalizedField(event.location.name)}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {getLocalizedField(event.location.address)}
                      </p>
                      {event.location.venueUrl && (
                        <a
                          href={event.location.venueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                        >
                          {t('viewVenue')} <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Related Sports */}
              {event.relatedSports.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {t('relatedSports')}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {event.relatedSports.map((sport) => (
                        <span
                          key={sport}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-900 dark:text-white"
                        >
                          {sport}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Registration Form */}
              {event.registrationRequired && !isPast && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('register')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {submissionSuccess ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {t('registrationSuccess')}
                        </h3>
                        {confirmationNumber && (
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {t('confirmationNumber')}: <strong>{confirmationNumber}</strong>
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('confirmationEmailSent')}
                        </p>
                      </div>
                    ) : (
                      <>
                        {!showRegistrationForm ? (
                          <div className="text-center py-8">
                            <Button onClick={() => setShowRegistrationForm(true)} disabled={!hasSpotsAvailable}>
                              {t('registerNow')}
                            </Button>
                            {spotsRemaining !== null && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                                {t('spotsRemaining', { count: spotsRemaining })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleFormSubmit} className="space-y-4">
                            <Input
                              label={t('form.name')}
                              type="text"
                              required
                              value={formData.name || ''}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              error={formErrors.name}
                            />
                            
                            <Input
                              label={t('form.email')}
                              type="email"
                              required
                              value={formData.email || ''}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              error={formErrors.email}
                            />
                            
                            <Input
                              label={t('form.phone')}
                              type="tel"
                              value={formData.phone || ''}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              error={formErrors.phone}
                            />
                            
                            {formErrors.submit && (
                              <div className="text-red-600 dark:text-red-400 text-sm">
                                {formErrors.submit}
                              </div>
                            )}
                            
                            <div className="flex gap-3">
                              <Button
                                type="submit"
                                variant="primary"
                                disabled={isSubmitting}
                                className="flex-1"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('submitting')}
                                  </>
                                ) : (
                                  t('submit')
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowRegistrationForm(false)}
                              >
                                {t('cancel')}
                              </Button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Related Events */}
              {relatedEvents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('relatedEvents')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {relatedEvents.map((relatedEvent) => (
                        <Link
                          key={relatedEvent._id}
                          href={`/${locale}/events/${relatedEvent.slug}`}
                          className="block"
                        >
                          <Card className="hover:shadow-lg transition-shadow">
                            <div className="relative aspect-video">
                              <Image
                                src={relatedEvent.featuredImage || '/placeholder-event.jpg'}
                                alt={getLocalizedField(relatedEvent.title)}
                                fill
                                className="object-cover rounded-t-lg"
                              />
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                                {getLocalizedField(relatedEvent.title)}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(relatedEvent.startDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Info Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('price')}
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {event.isFree ? t('free') : `₪${event.price}`}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('category')}
                      </div>
                      <div className="text-gray-900 dark:text-white">{event.category}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {t('organizer')}
                      </div>
                      <div className="text-gray-900 dark:text-white">{event.organizer.name}</div>
                      {event.organizer.email && (
                        <a
                          href={`mailto:${event.organizer.email}`}
                          className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                        >
                          <Mail className="w-4 h-4 inline mr-1" />
                          {event.organizer.email}
                        </a>
                      )}
                      {event.organizer.phone && (
                        <a
                          href={`tel:${event.organizer.phone}`}
                          className="text-blue-600 dark:text-blue-400 text-sm hover:underline block mt-1"
                        >
                          <Phone className="w-4 h-4 inline mr-1" />
                          {event.organizer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('attendance')}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('interested')}
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {event.interestedCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t('attending')}
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {event.attendedCount}
                          {event.capacity && ` / ${event.capacity}`}
                        </span>
                      </div>
                    </div>
                    
                    {/* Attendee Avatars */}
                    {attendees.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {t('attendees')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attendees.slice(0, 10).map((attendee) => (
                            <div
                              key={attendee.id}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300"
                              title={attendee.name}
                            >
                              {attendee.avatar ? (
                                <Image
                                  src={attendee.avatar}
                                  alt={attendee.name}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              ) : (
                                <User className="w-5 h-5" />
                              )}
                            </div>
                          ))}
                          {attendees.length > 10 && (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                              +{attendees.length - 10}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


