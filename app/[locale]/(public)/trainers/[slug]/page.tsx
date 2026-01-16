'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Script from 'next/script';
import { isTrainersEnabled } from '@/lib/utils/ecommerce';
import {
  MapPin,
  Star,
  X,
  Share2,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Eye,
  EyeOff,
  MessageSquare,
  Filter,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Select } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { Input } from '@/components/ui';
import ImageSlider from '@/components/skateparks/ImageSlider';
import ReviewCard from '@/components/reviews/ReviewCard';

interface TrainerImage {
  url: string;
  alt: { en: string; he: string } | string;
  order: number;
  publicId: string;
}

interface Review {
  _id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Trainer {
  _id: string;
  slug: string;
  name: { en: string; he: string } | string;
  description: { en: string; he: string } | string;
  shortDescription: { en: string; he: string } | string;
  profileImage: string;
  galleryImages: TrainerImage[];
  area: 'north' | 'center' | 'south';
  relatedSports: string[];
  contactDetails: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    visible?: boolean;
  };
  rating: number;
  totalReviews: number;
  approvedReviews: number;
  isFeatured: boolean;
  linkedSkateparks: Array<{
    _id: string;
    slug: string;
    name: { en: string; he: string } | string;
    imageUrl: string;
    area: string;
    rating: number;
    totalReviews: number;
  }>;
  reviews: Review[];
}

type ReviewSort = 'newest' | 'oldest' | 'highest' | 'lowest';

const areaLabels: Record<'north' | 'center' | 'south', { en: string; he: string }> = {
  north: { en: 'North', he: 'צפון' },
  center: { en: 'Center', he: 'מרכז' },
  south: { en: 'South', he: 'דרום' },
};

/**
 * Image Gallery helper
 */
function getImageSliderImages(images: TrainerImage[], locale: string, trainerName: string): { url: string; alt?: string }[] {
  const getImageAlt = (alt: TrainerImage['alt']): string => {
    if (typeof alt === 'string') return alt;
    return alt[locale] || alt.en || alt.he || trainerName;
  };

  return images.map(img => ({
    url: img.url,
    alt: getImageAlt(img.alt)
  }));
}

/**
 * Main Trainer Page
 */
export default function TrainerPage() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';
  const slug = params.slug as string;
  const trainersEnabled = isTrainersEnabled();

  const tr = useCallback((enText: string, heText: string) => (locale === 'he' ? heText : enText), [locale]);

  // Show "Page in construction" if trainers is disabled
  if (!trainersEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'דף בבנייה' : 'Page in Construction'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {locale === 'he' 
              ? 'הדף זמין בקרוב. אנא נסו מאוחר יותר.'
              : 'Page is coming soon. Please check back later.'
            }
          </p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="brand"
            className="px-6 py-3"
          >
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Homepage'}
          </Button>
        </div>
      </div>
    );
  }

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewSort, setReviewSort] = useState<ReviewSort>('newest');
  const [ratingFilter, setRatingFilter] = useState<number | ''>('');
  const [showContact, setShowContact] = useState(false);
  const [showAddReview, setShowAddReview] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ average: number; breakdown: Record<number, number>; total: number } | null>(null);

  useEffect(() => {
    fetchTrainer();
  }, [slug]);

  useEffect(() => {
    if (trainer) {
      fetchReviews();
    }
  }, [slug, reviewSort, ratingFilter, trainer]);

  const fetchTrainer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trainers/${slug}`);
      if (!response.ok) {
        if (response.status === 404) {
          return;
        }
        throw new Error('Failed to fetch trainer');
      }

      const data = await response.json();
      setTrainer(data.trainer);
    } catch (error) {
      console.error('Error fetching trainer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!trainer) return;
    
    try {
      const params = new URLSearchParams();
      params.set('sort', reviewSort);
      if (ratingFilter) params.set('rating', String(ratingFilter));
      
      const response = await fetch(`/api/trainers/${slug}/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleReviewSubmitted = async () => {
    setShowAddReview(false);
    setRating(0);
    setReviewComment('');
    await fetchReviews();
    await fetchTrainer();
  };

  const handleSubmitReview = async () => {
    if (rating < 1 || submittingReview) return;
    
    setSubmittingReview(true);
    setReviewError(null);
    
    try {
      const response = await fetch(`/api/trainers/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: reviewComment }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit review');
      }
      
      await handleReviewSubmitted();
    } catch (e: any) {
      setReviewError(e.message || 'Failed to submit');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    
    try {
      // TODO: Implement contact form submission
      console.log('Contact form:', contactFormData);
      alert(tr('Message sent successfully!', 'הודעה נשלחה בהצלחה!'));
      setContactFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error submitting contact form:', error);
      alert(tr('Failed to send message. Please try again.', 'שליחת ההודעה נכשלה. נסה שוב.'));
    } finally {
      setSubmittingContact(false);
    }
  };

  const getLocalizedText = (text: { en: string; he: string } | string): string => {
    if (typeof text === 'string') return text;
    return text[locale] || text.en || text.he || '';
  };

  const handleShare = async () => {
    if (!trainer) return;
    
    const trainerName = getLocalizedText(trainer.name);
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: trainerName,
          text: `${trainerName} - ${tr('Professional Trainer', 'מאמן מקצועי')}`,
          url,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert(tr('Profile link copied to clipboard!', 'קישור הפרופיל הועתק ללוח!'));
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen ">
        <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {tr('Trainer Not Found', 'מאמן לא נמצא')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tr('The trainer you are looking for does not exist.', 'המאמן שאתה מחפש לא קיים.')}
            </p>
            <Link href={`/${locale}/trainers`}>
              <Button variant="primary">
                {tr('Back to Trainers', 'חזרה למאמנים')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trainerName = getLocalizedText(trainer.name);
  const trainerDescription = getLocalizedText(trainer.description);
  const trainerShortDescription = getLocalizedText(trainer.shortDescription);
  const areaLabel = locale === 'he' ? areaLabels[trainer.area]?.he : areaLabels[trainer.area]?.en || trainer.area;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';

  // Structured data for SEO (Person schema)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: trainerName,
    description: trainerShortDescription || trainerDescription,
    image: trainer.profileImage.startsWith('http') ? trainer.profileImage : `${siteUrl}${trainer.profileImage}`,
    jobTitle: tr('Professional Trainer', 'מאמן מקצועי'),
    ...(trainer.rating > 0 && trainer.totalReviews > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: trainer.rating,
        reviewCount: trainer.totalReviews,
      },
    }),
    ...(trainer.contactDetails.email && {
      email: trainer.contactDetails.email,
    }),
    ...(trainer.contactDetails.phone && {
      telephone: trainer.contactDetails.phone,
    }),
    ...(trainer.relatedSports.length > 0 && {
      knowsAbout: trainer.relatedSports,
    }),
    url: `${siteUrl}/${locale}/trainers/${trainer.slug}`,
  };

  return (
    <>
      {/* Structured Data */}
      <Script
        id="trainer-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <div className="min-h-screen " dir={locale === 'he' ? 'rtl' : 'ltr'}>
        {/* Hero Section with Profile Image */}
        {trainer.profileImage && (
          <div className="relative h-64 md:h-96 overflow-hidden">
            <img
              src={trainer.profileImage}
              alt={trainerName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        )}

        <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Header Section */}
          <Card className="rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/80 dark:bg-gray-800/70">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {trainerName}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    {areaLabel}
                  </span>
                  {trainer.isFeatured && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      {tr('Featured', 'מומלץ')}
                    </span>
                  )}
                </div>

                {/* Sports Expertise */}
                {trainer.relatedSports.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {trainer.relatedSports.map((sport, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {sport}
                      </span>
                    ))}
                  </div>
                )}

                {/* Rating */}
                {trainer.rating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(trainer.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {trainer.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      ({trainer.totalReviews} {trainer.totalReviews === 1 ? tr('review', 'ביקורת') : tr('reviews', 'ביקורות')})
                    </span>
                  </div>
                )}
              </div>

              {/* Share Button */}
              <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                {tr('Share', 'שתף')}
              </Button>
            </div>
          </Card>

          {/* About Section */}
          {(trainerDescription || trainerShortDescription) && (
            <Card>
              <CardHeader>
                <CardTitle>{tr('About', 'אודות')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {trainerDescription || trainerShortDescription}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Image Gallery */}
          {trainer.galleryImages && trainer.galleryImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{tr('Gallery', 'גלריה')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ImageSlider images={getImageSliderImages(trainer.galleryImages, locale, trainerName)} />
              </CardContent>
            </Card>
          )}

          {/* Linked Skateparks */}
          {trainer.linkedSkateparks && trainer.linkedSkateparks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{tr('Skateparks Where Available', 'סקייטפארקים זמינים')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainer.linkedSkateparks.map((park) => {
                    const parkName = getLocalizedText(park.name);
                    return (
                      <Link
                        key={park._id}
                        href={`/${locale}/skateparks/${park.slug}`}
                        className="group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-700">
                          <img
                            src={park.imageUrl}
                            alt={parkName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {parkName}
                          </h3>
                          {park.rating > 0 && (
                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{park.rating.toFixed(1)}</span>
                              {park.totalReviews > 0 && (
                                <span>({park.totalReviews})</span>
                              )}
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

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{tr('Contact Information', 'פרטי יצירת קשר')}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContact(!showContact)}
                  className="flex items-center gap-2"
                >
                  {showContact ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      {tr('Hide', 'הסתר')}
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      {tr('Show', 'הצג')}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showContact && (
              <CardContent className="space-y-4">
                {trainer.contactDetails.phone && (
                  <a
                    href={`tel:${trainer.contactDetails.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{trainer.contactDetails.phone}</span>
                  </a>
                )}
                {trainer.contactDetails.email && (
                  <a
                    href={`mailto:${trainer.contactDetails.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{trainer.contactDetails.email}</span>
                  </a>
                )}
                {trainer.contactDetails.website && (
                  <a
                    href={trainer.contactDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{trainer.contactDetails.website}</span>
                  </a>
                )}
                {trainer.contactDetails.instagram && (
                  <a
                    href={`https://instagram.com/${trainer.contactDetails.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Instagram className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">
                      @{trainer.contactDetails.instagram.replace('@', '')}
                    </span>
                  </a>
                )}
                {trainer.contactDetails.facebook && (
                  <a
                    href={trainer.contactDetails.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-white">{tr('Facebook Profile', 'פרופיל פייסבוק')}</span>
                  </a>
                )}
                {!trainer.contactDetails.phone && !trainer.contactDetails.email && !trainer.contactDetails.website && 
                 !trainer.contactDetails.instagram && !trainer.contactDetails.facebook && (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                    {tr('No contact information available.', 'אין פרטי יצירת קשר זמינים.')}
                  </p>
                )}
              </CardContent>
            )}
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>{tr('Send a Message', 'שלח הודעה')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={tr('Name', 'שם')}
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                    required
                  />
                  <Input
                    label={tr('Email', 'אימייל')}
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                    required
                  />
                </div>
                <Input
                  label={tr('Phone (Optional)', 'טלפון (אופציונלי)')}
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                />
                <Textarea
                  label={tr('Message', 'הודעה')}
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                  required
                  rows={5}
                />
                <Button type="submit" variant="primary" disabled={submittingContact}>
                  {submittingContact ? tr('Sending...', 'שולח...') : tr('Send Message', 'שלח הודעה')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>{tr('Reviews', 'ביקורות')}</CardTitle>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddReview(true)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {tr('Write a Review', 'כתוב ביקורת')}
                </Button>
              </div>

              {/* Review Summary */}
              {summary && summary.total > 0 && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-gray-900 dark:text-white">
                      {summary.average.toFixed(1)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= Math.round(summary.average)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {summary.total} {summary.total === 1 ? tr('review', 'ביקורת') : tr('reviews', 'ביקורות')}
                      </p>
                    </div>
                  </div>

                  {/* Rating Breakdown */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = summary.breakdown[r] || 0;
                      const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-3">
                          <span className="w-10 text-sm">{r}★</span>
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right text-sm text-gray-600 dark:text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Select
                  value={reviewSort}
                  onChange={(e) => setReviewSort(e.target.value as ReviewSort)}
                  options={[
                    { value: 'newest', label: tr('Newest', 'החדשים ביותר') },
                    { value: 'oldest', label: tr('Oldest', 'הישנים ביותר') },
                    { value: 'highest', label: tr('Highest Rated', 'דירוג גבוה') },
                    { value: 'lowest', label: tr('Lowest Rated', 'דירוג נמוך') },
                  ]}
                />
                <Select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value === '' ? '' : parseInt(e.target.value))}
                  options={[
                    { value: '', label: tr('All Ratings', 'כל הדירוגים') },
                    { value: '5', label: '5 ⭐' },
                    { value: '4', label: '4 ⭐' },
                    { value: '3', label: '3 ⭐' },
                    { value: '2', label: '2 ⭐' },
                    { value: '1', label: '1 ⭐' },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                  {tr('No reviews yet.', 'אין ביקורות עדיין.')}
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review._id} review={review} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Review Modal */}
        {showAddReview && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAddReview(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 backdrop-blur-sm bg-white/80 dark:bg-gray-800/70">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {tr('Write a Review', 'כתוב ביקורת')}
                  </h2>
                  <button
                    onClick={() => setShowAddReview(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label={tr('Close', 'סגור')}
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1"
                        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            (hoverRating || rating) >= star
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Comment */}
                  <Textarea
                    label={tr('Comment (Optional)', 'תגובה (אופציונלי)')}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={5}
                    maxLength={1000}
                  />

                  {reviewError && (
                    <p className="text-sm text-red-600">{reviewError}</p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmitReview}
                      disabled={rating < 1 || submittingReview}
                      variant="primary"
                      className="flex-1"
                    >
                      {submittingReview ? tr('Submitting...', 'שולח...') : tr('Submit Review', 'שלח ביקורת')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddReview(false)}>
                      {tr('Cancel', 'ביטול')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}








