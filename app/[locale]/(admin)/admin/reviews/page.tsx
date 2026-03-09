'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Textarea,
  Skeleton,
  SegmentedControls,
} from '@/components/ui';
import { NumberInput } from '@/components/ui/number-input';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Star, Edit2, Check, X } from 'lucide-react';
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';

type ReviewContentByLocale = { en?: string; he?: string };

interface Review {
  _id: string;
  entityType: string;
  entityId: any;
  slug: string;
  userId?: string;
  userName: string | ReviewContentByLocale;
  rating: number;
  comment: string | ReviewContentByLocale;
  helpfulCount: number;
  reportsCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

function resolveContent(value: string | ReviewContentByLocale | undefined | null, locale: 'en' | 'he'): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.he ?? '';
}

/** Returns only the content for the given locale (no fallback). Use for edit form so each section shows only its own locale. */
function getContentForLocale(value: string | ReviewContentByLocale | undefined | null, locale: 'en' | 'he'): string {
  if (value == null) return '';
  if (typeof value === 'string') return locale === 'en' ? value : '';
  return value[locale] ?? '';
}

/** True if the review has any content (userName or comment) for the given locale. Legacy string = en only. */
function reviewHasContentForLocale(review: Review, locale: 'en' | 'he'): boolean {
  const hasValue = (v: string | ReviewContentByLocale | undefined | null): boolean => {
    if (v == null) return false;
    if (typeof v === 'string') return locale === 'en' && v.trim().length > 0; // legacy = en only
    const s = (v[locale] ?? '').trim();
    return s.length > 0;
  };
  return hasValue(review.userName) || hasValue(review.comment);
}

export default function ReviewsPage() {
  const locale = useLocale();
  const t = useTranslations('admin.reviews');
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [rejectedReviews, setRejectedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [hasFetchedRejected, setHasFetchedRejected] = useState(false);
  const [loadingEntityType, setLoadingEntityType] = useState<Record<string, boolean>>({});
  const [loadedEntityTypes, setLoadedEntityTypes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  /** Which locale's content to display in the list (en / he) */
  const [contentLocale, setContentLocale] = useState<'en' | 'he' | 'all'>('all');

  // Edit modal state (per-locale)
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editUserNameEn, setEditUserNameEn] = useState('');
  const [editUserNameHe, setEditUserNameHe] = useState('');
  const [editCommentEn, setEditCommentEn] = useState('');
  const [editCommentHe, setEditCommentHe] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editHelpfulCount, setEditHelpfulCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch only pending reviews on initial load
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const baseParams = search ? `&search=${encodeURIComponent(search)}` : '';
      const pendingRes = await fetch(`/api/admin/reviews?status=pending&limit=1000${baseParams}`);

      if (!pendingRes.ok) {
        const errorData = await pendingRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch pending reviews: ${errorData.error || pendingRes.statusText}`);
      }

      const pendingData = await pendingRes.json();
      setPendingReviews(pendingData.reviews || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch reviews';
      setError(errorMessage);
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Fetch approved reviews on demand (not used directly, but kept for status change refresh)
  const fetchApprovedReviews = useCallback(async () => {
    try {
      setError(null);
      
      const baseParams = search ? `&search=${encodeURIComponent(search)}` : '';
      const approvedRes = await fetch(`/api/admin/reviews?status=approved&limit=1000${baseParams}`);

      if (!approvedRes.ok) {
        const errorData = await approvedRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch approved reviews: ${errorData.error || approvedRes.statusText}`);
      }

      const approvedData = await approvedRes.json();
      setApprovedReviews(approvedData.reviews || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch approved reviews';
      setError(errorMessage);
      console.error('Error fetching approved reviews:', err);
    }
  }, [search]);

  // Fetch rejected reviews on demand
  const fetchRejectedReviews = useCallback(async () => {
    try {
      setLoadingRejected(true);
      setError(null);
      
      const baseParams = search ? `&search=${encodeURIComponent(search)}` : '';
      const rejectedRes = await fetch(`/api/admin/reviews?status=rejected&limit=1000${baseParams}`);

      if (!rejectedRes.ok) {
        const errorData = await rejectedRes.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch rejected reviews: ${errorData.error || rejectedRes.statusText}`);
      }

      const rejectedData = await rejectedRes.json();
      setRejectedReviews(rejectedData.reviews || []);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch rejected reviews';
      setError(errorMessage);
      console.error('Error fetching rejected reviews:', err);
    } finally {
      setLoadingRejected(false);
      setHasFetchedRejected(true);
    }
  }, [search]);

  // Fetch reviews for a specific entity type
  const fetchEntityTypeReviews = useCallback(async (entityType: string, status: 'approved' | 'rejected') => {
    try {
      setLoadingEntityType(prev => ({ ...prev, [`${entityType}-${status}`]: true }));
      setError(null);
      
      const baseParams = search ? `&search=${encodeURIComponent(search)}` : '';
      // Fetch only the specific entity type from the API
      const res = await fetch(`/api/admin/reviews?status=${status}&entityType=${entityType}&limit=1000${baseParams}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Failed to fetch ${entityType} reviews: ${errorData.error || res.statusText}`);
      }

      const data = await res.json();
      const filteredReviews = data.reviews || [];
      
      if (status === 'approved') {
        setApprovedReviews(prev => {
          const otherTypes = prev.filter(r => r.entityType?.toLowerCase() !== entityType.toLowerCase());
          return [...otherTypes, ...filteredReviews];
        });
      } else {
        setRejectedReviews(prev => {
          const otherTypes = prev.filter(r => r.entityType?.toLowerCase() !== entityType.toLowerCase());
          return [...otherTypes, ...filteredReviews];
        });
      }
      
      setLoadedEntityTypes(prev => ({ ...prev, [`${entityType}-${status}`]: true }));
    } catch (err: any) {
      const errorMessage = err.message || `Failed to fetch ${entityType} reviews`;
      setError(errorMessage);
      console.error(`Error fetching ${entityType} reviews:`, err);
    } finally {
      setLoadingEntityType(prev => ({ ...prev, [`${entityType}-${status}`]: false }));
    }
  }, [search]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStatusChange = async (reviewId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update review');
      }

      // Refresh pending reviews
      fetchReviews();
      // If approved/rejected reviews are loaded, refresh them too
      if (approvedReviews.length > 0 || Object.keys(loadedEntityTypes).some(k => k.includes('approved'))) {
        fetchApprovedReviews();
      }
      if (rejectedReviews.length > 0 || Object.keys(loadedEntityTypes).some(k => k.includes('rejected'))) {
        fetchRejectedReviews();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update review');
    }
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditUserNameEn(getContentForLocale(review.userName, 'en'));
    setEditUserNameHe(getContentForLocale(review.userName, 'he'));
    setEditCommentEn(getContentForLocale(review.comment, 'en'));
    setEditCommentHe(getContentForLocale(review.comment, 'he'));
    setEditRating(review.rating);
    setEditHelpfulCount(review.helpfulCount ?? 0);
    setError(null);
  };

  const closeEditModal = () => {
    setEditingReview(null);
    setEditUserNameEn('');
    setEditUserNameHe('');
    setEditCommentEn('');
    setEditCommentHe('');
    setEditRating(5);
    setEditHelpfulCount(0);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingReview._id,
          rating: editRating,
          userNameEn: editUserNameEn,
          userNameHe: editUserNameHe,
          commentEn: editCommentEn,
          commentHe: editCommentHe,
          helpfulCount: editHelpfulCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update review');
      }

      closeEditModal();
      fetchReviews();
      if (approvedReviews.length > 0 || Object.keys(loadedEntityTypes).some(k => k.includes('approved'))) {
        fetchApprovedReviews();
      }
      if (rejectedReviews.length > 0 || Object.keys(loadedEntityTypes).some(k => k.includes('rejected'))) {
        fetchRejectedReviews();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update review');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? 'fill-brand-text dark:fill-brand-dark text-brand-text dark:text-brand-dark'
            : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
        }`}
      />
    ));
  };

  // Group approved reviews by entityType
  const groupApprovedByEntityType = (reviews: Review[]) => {
    const grouped: Record<string, Review[]> = {
      event: [],
      skatepark: [],
      guide: [],
      product: [],
      trainer: [],
    };
    
    reviews.forEach(review => {
      const entityType = review.entityType?.toLowerCase() || 'skatepark';
      if (grouped[entityType]) {
        grouped[entityType].push(review);
      } else {
        // Fallback to skatepark if unknown type
        grouped.skatepark.push(review);
      }
    });
    
    return grouped;
  };

  // Group rejected reviews by entityType
  const groupRejectedByEntityType = (reviews: Review[]) => {
    const grouped: Record<string, Review[]> = {
      event: [],
      skatepark: [],
      guide: [],
      product: [],
      trainer: [],
    };
    
    reviews.forEach(review => {
      const entityType = review.entityType?.toLowerCase() || 'skatepark';
      if (grouped[entityType]) {
        grouped[entityType].push(review);
      } else {
        grouped.skatepark.push(review);
      }
    });
    
    return grouped;
  };

  // Group skatepark reviews by area, then by park
  const groupSkateparksByAreaAndPark = (reviews: Review[]) => {
    const grouped: Record<string, Record<string, Review[]>> = {
      north: {},
      center: {},
      south: {},
    };
    
    reviews.forEach(review => {
      // Get area from entityId, default to 'center' if not found
      const entityArea = (review.entityId as any)?.area;
      const area = entityArea && ['north', 'center', 'south'].includes(entityArea) 
        ? entityArea 
        : 'center';
      const parkSlug = review.slug;
      
      // Ensure the area key exists
      if (!grouped[area]) {
        grouped[area] = {};
      }
      if (!grouped[area][parkSlug]) {
        grouped[area][parkSlug] = [];
      }
      grouped[area][parkSlug].push(review);
    });
    
    return grouped;
  };

  // Group reviews by entity (for events and guides)
  const groupByEntity = (reviews: Review[]) => {
    const grouped: Record<string, Review[]> = {};
    
    reviews.forEach(review => {
      const entitySlug = review.slug;
      if (!grouped[entitySlug]) {
        grouped[entitySlug] = [];
      }
      grouped[entitySlug].push(review);
    });
    
    return grouped;
  };

  const getEntityLink = (review: Review) => {
    const entityType = review.entityType?.toLowerCase() || 'skatepark';
    switch (entityType) {
      case 'event':
        return `/${locale}/events/${review.slug}`;
      case 'guide':
        return `/${locale}/guides/${review.slug}`;
      case 'skatepark':
      default:
        return `/${locale}/skateparks/${review.slug}`;
    }
  };

  // Render a single review item as an accordion (displays content for contentLocale)
  const renderReviewItem = (review: Review) => {
    const isOpen = openReview === review._id;
    const displayLocale = contentLocale === 'all' ? 'en' : contentLocale;
    const displayUserName = resolveContent(review.userName, displayLocale);
    const displayComment = resolveContent(review.comment, displayLocale);
    const commentPreview = displayComment ? (displayComment.length > 100 ? displayComment.substring(0, 100) + '...' : displayComment) : '';
    
    return (
      <div
        key={review._id}
        className={`border-b border-border dark:border-border-dark last:border-none ${
          review.status === 'pending' ? 'bg-card dark:bg-card-dark' : ''
        }`}
      >
        {/* Accordion Button - Summary View */}
        <button
          onClick={() => setOpenReview(isOpen ? null : review._id)}
          className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors"
        >
          <div className="flex-1 flex items-center space-x-3 flex-wrap">
            <div className="flex items-center space-x-1">
              {renderStars(review.rating)}
            </div>
            <span className="font-medium text-gray-900 dark:text-white">
              {displayUserName || '—'}
            </span>
            <span className="text-sm text-gray dark:text-gray-dark">
              {t('on')}{' '}
              <Link
                href={getEntityLink(review)}
                className="text-brand-main dark:text-brand-dark hover:underline"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                {review.entityId?.name?.[locale as 'en' | 'he'] || review.entityId?.name?.en || review.entityId?.name?.he || review.slug}
              </Link>
            </span>
            <span className="text-xs text-gray dark:text-gray-dark capitalize">
              ({review.entityType || 'skatepark'})
            </span>
            {commentPreview && (
              <span className="text-xs text-gray dark:text-gray-dark italic">
                - {commentPreview}
              </span>
            )}
            <span className="text-xs text-gray dark:text-gray-dark">
              {formatDate(review.createdAt)}
            </span>
            {(review.helpfulCount > 0 || review.reportsCount > 0) && (
              <div className="flex items-center space-x-2 text-xs">
                {review.helpfulCount > 0 && (
                  <span>👍 {review.helpfulCount} {t('helpful')}</span>
                )}
                {review.reportsCount > 0 && (
                  <span className="text-red-600 dark:text-red-400">⚠️ {review.reportsCount}</span>
                )}
              </div>
            )}
          </div>
          <svg 
            className={`w-4 h-4 text-gray dark:text-gray-dark transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expanded Content */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 space-y-3">
            {/* Full Comment (for selected locale) */}
            {displayComment && (
              <div className="pt-2">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {displayComment}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray dark:text-gray-dark">
              {review.helpfulCount > 0 && (
                <span>👍 {review.helpfulCount} {t('helpful')}</span>
              )}
              {review.reportsCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  ⚠️ {review.reportsCount} {t('reports')}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="gray"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(review);
                }}
                className="flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t('edit')}</span>
              </Button>
              {review.status === 'pending' && (
                <>
                  <Button
                    variant="green"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(review._id, 'approve');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t('approve')}</span>
                  </Button>
                  <Button
                    variant="red"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(review._id, 'reject');
                    }}
                    className="flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('reject')}</span>
                  </Button>
                </>
              )}
              {review.status === 'approved' && (
                <Button
                  variant="red"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(review._id, 'reject');
                  }}
                  className="flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>{t('reject')}</span>
                </Button>
              )}
              {review.status === 'rejected' && (
                <Button
                  variant="green"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(review._id, 'approve');
                  }}
                  className="flex items-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('approve')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a review section
  const renderReviewSection = (reviews: Review[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="md:p-6 flex items-center justify-center min-h-[170px]">
          <LoadingSpinner size={48} variant="default" />
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="p-12 text-center">
          <p className="text-gray dark:text-gray-dark">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border-dark dark:divide-border-dark">
        {reviews.map(renderReviewItem)}
      </div>
    );
  };

  // Filter reviews to only those that have content for the selected locale (en/he/all)
  const filteredPendingReviews = useMemo(
    () =>
      contentLocale === 'all'
        ? pendingReviews
        : pendingReviews.filter((r) => reviewHasContentForLocale(r, contentLocale)),
    [pendingReviews, contentLocale]
  );
  const filteredApprovedReviews = useMemo(
    () =>
      contentLocale === 'all'
        ? approvedReviews
        : approvedReviews.filter((r) => reviewHasContentForLocale(r, contentLocale)),
    [approvedReviews, contentLocale]
  );
  const filteredRejectedReviews = useMemo(
    () =>
      contentLocale === 'all'
        ? rejectedReviews
        : rejectedReviews.filter((r) => reviewHasContentForLocale(r, contentLocale)),
    [rejectedReviews, contentLocale]
  );

  const groupedApproved = groupApprovedByEntityType(filteredApprovedReviews);
  const groupedRejected = groupRejectedByEntityType(filteredRejectedReviews);
  const skateparksByArea = groupSkateparksByAreaAndPark(groupedApproved.skatepark);
  const eventsByEntity = groupByEntity(groupedApproved.event);
  const guidesByEntity = groupByEntity(groupedApproved.guide);
  const productsByEntity = groupByEntity(groupedApproved.product);
  const trainersByEntity = groupByEntity(groupedApproved.trainer);

  // Accordion state
  const [openSkateparks, setOpenSkateparks] = useState<boolean>(true); // Default to open
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [openPark, setOpenPark] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [openReview, setOpenReview] = useState<string | null>(null); // Track which review is expanded

  /** Which approved entity type tab is selected (events / skateparks / guides / products / trainers) */
  const [approvedEntityTab, setApprovedEntityTab] = useState<'event' | 'skatepark' | 'guide' | 'product' | 'trainer'>('skatepark');

  const areaLabels: Record<string, string> = {
    north: t('areaNorth'),
    center: t('areaCenter'),
    south: t('areaSouth'),
  };

  const entityLabelKeys: Record<string, string> = {
    event: 'events',
    skatepark: 'skateparks',
    guide: 'guides',
    product: 'products',
    trainer: 'trainers',
  };

  return (
    <div className="pt-16 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-gray dark:text-gray-dark mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Locale tabs: show reviews by English or Hebrew content */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('showContentIn')}
            </span>
            <SegmentedControls
              name="reviews-content-locale"
              options={[
                { value: 'all', label: t('all'), variant: 'blue' },
                { value: 'en', label: t('englishEn'), variant: 'blue' },
                { value: 'he', label: t('hebrewHe'), variant: 'blue' },
              ]}
              value={contentLocale}
              onValueChange={(value) => setContentLocale(value as 'en' | 'he' | 'all')}
              className="min-w-[240px]"
            />
            <div className="flex-1 min-w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder={t('searchPlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && !editingReview && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Pending Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('pendingReviews')} {filteredPendingReviews.length > 0 && `(${filteredPendingReviews.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {renderReviewSection(
              filteredPendingReviews,
              contentLocale === 'en' ? t('noPendingEn') : contentLocale === 'he' ? t('noPendingHe') : t('noPendingAll')
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approved Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('approvedReviews')} {filteredApprovedReviews.length > 0 && `(${filteredApprovedReviews.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="md:p-6 space-y-4">
              {/* Entity type tabs – show only the selected accordion */}
              <div className="flex flex-wrap items-center gap-4">
                <SegmentedControls
                  name="approved-reviews-entity"
                  value={approvedEntityTab}
                  onValueChange={(v) => setApprovedEntityTab(v as typeof approvedEntityTab)}
                  hideLabelBelow="sm"
                  options={[
                    { value: 'skatepark', label: t('skateparks'), icon: <Icon name="parkBold" className="w-4 h-4" />, variant: 'green' },
                    { value: 'event', label: t('events'), icon: <Icon name="calendarBold" className="w-4 h-4" />, variant: 'purple' },
                    { value: 'guide', label: t('guides'), icon: <Icon name="bookBold" className="w-4 h-4" />, variant: 'yellow' },
                    { value: 'product', label: t('products'), icon: <Icon name="shopBold" className="w-4 h-4" />, variant: 'lime' },
                    { value: 'trainer', label: t('trainers'), icon: <Icon name="trainersBold" className="w-4 h-4" />, variant: 'lime' },
                  ]}
                  className="min-w-0 flex-1"
                />
              </div>

                {approvedEntityTab === 'event' && (
                /* Events Accordion */
                <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('events')} ({groupedApproved.event.length})
                      </h3>
                      {groupedApproved.event.length === 0 && !loadingEntityType['event-approved'] && (
                        <Button
                          variant="gray"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('event', 'approved')}
                          disabled={loadingEntityType['event-approved']}
                        >
                          {loadingEntityType['event-approved'] ? t('loading') : t('fetch')}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['event-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : !loadedEntityTypes['event-approved'] ? (
                      <div className="overflow-hidden max-h-0 opacity-0" aria-hidden />
                    ) : groupedApproved.event.length > 0 ? (
                      <div className="divide-y divide-border-dark dark:divide-border-dark">
                        {Object.entries(eventsByEntity).map(([eventSlug, eventReviews]) => {
                          const eventName = eventReviews[0]?.entityId?.name?.[locale as 'en' | 'he'] || eventReviews[0]?.entityId?.name?.en || eventReviews[0]?.entityId?.name?.he || eventSlug;
                          const isOpen = openEvent === eventSlug;
                          return (
                            <div key={eventSlug} className="border-b border-border dark:border-border-dark last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : eventSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue dark:text-blue-dark' : 'text-gray-900 dark:text-white'}`}>
                                    {eventName}
                                  </span>
                                  <span className="text-sm text-gray dark:text-gray-dark">
                                    ({eventReviews.length} {eventReviews.length === 1 ? t('review') : t('reviewsCount')})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray dark:text-gray-dark transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-6 pb-4 space-y-4">
                                  {eventReviews.map(renderReviewItem)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-gray dark:text-gray-dark">{t('noApprovedEventReviews')}</p>
                      </div>
                    )}
                  </div>
                )}

                {approvedEntityTab === 'skatepark' && (
                /* Skateparks Accordion - By Area, then by Park */
                <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setOpenSkateparks(!openSkateparks)}
                          className="flex-1 flex justify-between items-center text-left"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {t('skateparks')} ({groupedApproved.skatepark.length})
                          </h3>
                          <svg 
                            className={`w-5 h-5 text-gray dark:text-gray-dark transition-transform duration-300 ${openSkateparks ? 'rotate-180' : ''}`} 
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {groupedApproved.skatepark.length === 0 && !loadingEntityType['skatepark-approved'] && (
                          <Button
                            variant="gray"
                            size="sm"
                            onClick={() => fetchEntityTypeReviews('skatepark', 'approved')}
                            disabled={loadingEntityType['skatepark-approved']}
                            className="ml-4"
                          >
                            {loadingEntityType['skatepark-approved'] ? t('loading') : t('fetch')}
                          </Button>
                        )}
                      </div>
                    </div>
                    {loadingEntityType['skatepark-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : !loadedEntityTypes['skatepark-approved'] ? (
                      <div className="overflow-hidden max-h-0 opacity-0" aria-hidden />
                    ) : groupedApproved.skatepark.length > 0 ? (
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      openSkateparks ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="p-2 md:p-6 ">
                        {(['north', 'center', 'south'] as const).map((area) => {
                          const areaParks = skateparksByArea[area] || {};
                          const areaReviews = Object.values(areaParks).flat();
                          const parkCount = Object.keys(areaParks).length;
                          const isAreaOpen = openArea === area;
                          
                          const areaIcons: Record<string, string> = {
                            north: '🏔️',
                            center: '🏙️',
                            south: '🌴',
                          };
                          
                          const areaDescription = parkCount > 0 
                            ? `${parkCount} ${parkCount === 1 ? t('park') : t('parks')}, ${areaReviews.length} ${areaReviews.length === 1 ? t('review') : t('reviewsCount')}`
                            : `${areaReviews.length} ${areaReviews.length === 1 ? t('review') : t('reviewsCount')}`;
                          
                          return (
                            <div key={area} className={cn(
                              "transition-all duration-300",
                              isAreaOpen ? "mb-4" : ""
                            )}>
                              {/* Area Card using AccordionCard style */}
                              <div 
                                onClick={() => {
                                  setOpenArea(isAreaOpen ? null : area);
                                  if (isAreaOpen) setOpenPark(null);
                                }}
                                className={cn(
                                  "group relative flex items-center justify-between p-6 rounded-[18px] bg-card dark:bg-card-dark border border-border dark:border-border-dark cursor-pointer transition-all duration-300 hover:bg-sidebar-hover dark:hover:bg-sidebar-hover-dark hover:-translate-y-1",
                                  isAreaOpen && "bg-blue-bg dark:bg-blue-bg-dark border-blue-border dark:border-blue-border-dark"
                                )}
                              >
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-full bg-blue-bg dark:bg-blue-bg-dark flex items-center justify-center text-xl">
                                    {areaIcons[area]}
                                  </div>
                                  <div>
                                    <h3 className={cn(
                                      "text-lg font-semibold transition-colors",
                                      isAreaOpen 
                                        ? "text-blue dark:text-blue-dark" 
                                        : "text-gray-900 dark:text-white group-hover:text-blue dark:group-hover:text-blue-dark"
                                    )}>
                                      {locale === 'he' ? `${t('areaSuffix')} ${areaLabels[area]}` : `${areaLabels[area]} ${t('areaSuffix')}`}
                                    </h3>
                                    <p className="text-sm text-gray dark:text-gray-dark">{areaDescription}</p>
                                  </div>
                                </div>
                                <svg 
                                  className={cn(
                                    "w-5 h-5 transition-all duration-300",
                                    isAreaOpen 
                                      ? "text-blue dark:text-blue-dark rotate-180" 
                                      : "text-gray-600 dark:text-gray-400 group-hover:text-blue dark:group-hover:text-blue-dark group-hover:translate-x-1"
                                  )}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                
                                {/* Glossy Border Effect */}
                                <div className={cn(
                                  "absolute inset-0 rounded-[18px] border-2 border-transparent pointer-events-none transition-all",
                                  isAreaOpen && "border-blue-border dark:border-blue-border-dark"
                                )} />
                              </div>
                              
                              {/* Area Content */}
                              <div className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out mt-4",
                                isAreaOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                              )}>
                                <div className="px-2 space-y-2">
                                  {areaReviews.length === 0 ? (
                                    <p className="text-sm text-gray dark:text-gray-dark py-2 px-4">
                                      {t('noReviewsInArea')}
                                    </p>
                                  ) : (
                                    Object.entries(areaParks).map(([parkSlug, parkReviews]) => {
                                      const parkName = parkReviews[0]?.entityId?.name?.[locale as 'en' | 'he'] || parkReviews[0]?.entityId?.name?.en || parkReviews[0]?.entityId?.name?.he || parkSlug;
                                      const isParkOpen = openPark === `${area}-${parkSlug}`;
                                      return (
                                        <div key={parkSlug} className="border border-border dark:border-border-dark rounded-lg overflow-hidden bg-card dark:bg-card-dark">
                                          {/* Park Level Accordion */}
                                          <button
                                            onClick={() => setOpenPark(isParkOpen ? null : `${area}-${parkSlug}`)}
                                            className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                          >
                                            <div className="flex flex-col items-start gap-1">
                                              <span className={`text-sm font-medium ${isParkOpen ? 'text-blue dark:text-blue-dark' : 'text-gray-900 dark:text-white'}`}>
                                                {parkName}
                                              </span>
                                              <span className="text-xs text-gray dark:text-gray-dark">
                                                ({parkReviews.length} {parkReviews.length === 1 ? t('review') : t('reviewsCount')})
                                              </span>
                                            </div>
                                            <svg 
                                              className={`w-4 h-4 text-gray dark:text-gray-dark transition-transform duration-300 ${isParkOpen ? 'rotate-180' : ''}`} 
                                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          <div className={`overflow-auto transition-all duration-300 ease-in-out pb-6 ${isParkOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="divide-y divide-border dark:divide-border-dark">
                                              {parkReviews.map(renderReviewItem)}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-gray dark:text-gray-dark">{t('noApprovedSkateparkReviews')}</p>
                      </div>
                    )}
                  </div>
                )}

                {approvedEntityTab === 'guide' && (
                /* Guides Accordion */
                <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('guides')} ({groupedApproved.guide.length})
                      </h3>
                      {groupedApproved.guide.length === 0 && !loadingEntityType['guide-approved'] && (
                        <Button
                          variant="gray"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('guide', 'approved')}
                          disabled={loadingEntityType['guide-approved']}
                        >
                          {loadingEntityType['guide-approved'] ? t('loading') : t('fetch')}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['guide-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : !loadedEntityTypes['guide-approved'] ? (
                      <div className="overflow-hidden max-h-0 opacity-0" aria-hidden />
                    ) : groupedApproved.guide.length > 0 ? (
                      <div className="divide-y divide-border dark:divide-border-dark">
                        {Object.entries(guidesByEntity).map(([guideSlug, guideReviews]) => {
                          const guideName = guideReviews[0]?.entityId?.name?.[locale as 'en' | 'he'] || guideReviews[0]?.entityId?.name?.en || guideReviews[0]?.entityId?.name?.he || guideSlug;
                          const isOpen = openGuide === guideSlug;
                          return (
                            <div key={guideSlug} className="border-b border-border-dark dark:border-border-dark last:border-none">
                              <button
                                onClick={() => setOpenGuide(isOpen ? null : guideSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue dark:text-blue-dark' : 'text-gray-900 dark:text-white'}`}>
                                    {guideName}
                                  </span>
                                  <span className="text-sm text-gray dark:text-gray-dark">
                                    ({guideReviews.length} {guideReviews.length === 1 ? t('review') : t('reviewsCount')})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray dark:text-gray-dark transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-6 pb-4 space-y-4">
                                  {guideReviews.map(renderReviewItem)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-gray dark:text-gray-dark">{t('noApprovedGuideReviews')}</p>
                      </div>
                    )}
                  </div>
                )}

                {approvedEntityTab === 'product' && (
                /* Products Accordion */
                <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('products')} ({groupedApproved.product.length})
                      </h3>
                      {groupedApproved.product.length === 0 && !loadingEntityType['product-approved'] && (
                        <Button
                          variant="gray"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('product', 'approved')}
                          disabled={loadingEntityType['product-approved']}
                        >
                          {loadingEntityType['product-approved'] ? t('loading') : t('fetch')}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['product-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : !loadedEntityTypes['product-approved'] ? (
                      <div className="overflow-hidden max-h-0 opacity-0" aria-hidden />
                    ) : groupedApproved.product.length > 0 ? (
                      <div className="divide-y divide-border dark:divide-border-dark">
                        {Object.entries(productsByEntity).map(([productSlug, productReviews]) => {
                          const productName = productReviews[0]?.entityId?.name?.[locale as 'en' | 'he'] || productReviews[0]?.entityId?.name?.en || productReviews[0]?.entityId?.name?.he || productSlug;
                          const isOpen = openEvent === productSlug;
                          return (
                            <div key={productSlug} className="border-b border-border dark:border-border-dark last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : productSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue dark:text-blue-dark' : 'text-gray-900 dark:text-white'}`}>
                                    {productName}
                                  </span>
                                  <span className="text-sm text-gray dark:text-gray-dark">
                                    ({productReviews.length} {productReviews.length === 1 ? t('review') : t('reviewsCount')})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray dark:text-gray-dark transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-6 pb-4 space-y-4">
                                  {productReviews.map(renderReviewItem)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-gray dark:text-gray-dark">{t('noApprovedProductReviews')}</p>
                      </div>
                    )}
                  </div>
                )}

                {approvedEntityTab === 'trainer' && (
                /* Trainers Accordion */
                <div className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('trainers')} ({groupedApproved.trainer.length})
                      </h3>
                      {groupedApproved.trainer.length === 0 && !loadingEntityType['trainer-approved'] && (
                        <Button
                          variant="gray"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('trainer', 'approved')}
                          disabled={loadingEntityType['trainer-approved']}
                        >
                          {loadingEntityType['trainer-approved'] ? t('loading') : t('fetch')}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['trainer-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : !loadedEntityTypes['trainer-approved'] ? (
                      <div className="overflow-hidden max-h-0 opacity-0" aria-hidden />
                    ) : groupedApproved.trainer.length > 0 ? (
                      <div className="divide-y divide-border dark:divide-border-dark">
                        {Object.entries(trainersByEntity).map(([trainerSlug, trainerReviews]) => {
                          const trainerName = trainerReviews[0]?.entityId?.name?.[locale as 'en' | 'he'] || trainerReviews[0]?.entityId?.name?.en || trainerReviews[0]?.entityId?.name?.he || trainerSlug;
                          const isOpen = openEvent === trainerSlug;
                          return (
                            <div key={trainerSlug} className="border-b border-border dark:border-border-dark last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : trainerSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue dark:text-blue-dark' : 'text-gray-900 dark:text-white'}`}>
                                    {trainerName}
                                  </span>
                                  <span className="text-sm text-gray dark:text-gray-dark">
                                    ({trainerReviews.length} {trainerReviews.length === 1 ? t('review') : t('reviewsCount')})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray dark:text-gray-dark transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-6 pb-4 space-y-4">
                                  {trainerReviews.map(renderReviewItem)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-gray dark:text-gray-dark">{t('noApprovedTrainerReviews')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Rejected Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {t('rejectedReviews')} {filteredRejectedReviews.length > 0 && `(${filteredRejectedReviews.length})`}
            </CardTitle>
            {rejectedReviews.length === 0 && !loadingRejected && (
              <Button
                variant="gray"
                onClick={fetchRejectedReviews}
                disabled={loadingRejected}
              >
                {loadingRejected ? t('loading') : t('fetch')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loadingRejected ? (
              <div className="md:p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : rejectedReviews.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray dark:text-gray-dark">
                  {hasFetchedRejected ? t('noRejectedAtServer') : t('noRejectedLoadedHint')}
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Group rejected reviews by entity type - Always show all entity types */}
                {(['event', 'skatepark', 'guide', 'product', 'trainer'] as const).map((entityType) => {
                  const reviews = groupedRejected[entityType] || [];
                  const entityLabel = t(entityLabelKeys[entityType]);
                  const isLoading = loadingEntityType[`${entityType}-rejected`];
                  const isLoaded = loadedEntityTypes[`${entityType}-rejected`];
                  
                  // Show section if it has reviews or if it's been loaded (even if empty)
                  if (reviews.length === 0 && !isLoaded) return null;
                  
                  return (
                    <div key={entityType} className="border border-border dark:border-border-dark rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-card dark:bg-card-dark border-b border-border dark:border-border-dark flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {entityLabel} ({reviews.length})
                        </h3>
                        {reviews.length === 0 && !isLoading && (
                          <Button
                            variant="gray"
                            size="sm"
                            onClick={() => fetchEntityTypeReviews(entityType, 'rejected')}
                            disabled={isLoading}
                          >
                            {isLoading ? t('loading') : t('fetch')}
                          </Button>
                        )}
                      </div>
                      {isLoading ? (
                        <div className="p-6">
                          <Skeleton className="h-32 w-full" />
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="divide-y divide-border dark:divide-border-dark">
                          {reviews.map(renderReviewItem)}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-gray dark:text-gray-dark">{t('noRejectedEntityReviews', { entity: entityLabel })}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show message if no rejected reviews loaded yet */}
                {rejectedReviews.length === 0 && Object.keys(loadedEntityTypes).filter(k => k.includes('rejected')).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray dark:text-gray-dark mb-4">{t('noRejectedLoadedHint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal – English and Hebrew sections */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="bg-sidebar dark:bg-sidebar-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4">
            <CardHeader>
              <CardTitle>{t('editReviewTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('ratingShared')}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setEditRating(rating)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating <= editRating
                            ? 'fill-brand-text dark:fill-brand-dark text-brand-text dark:text-brand-dark'
                            : 'text-text-secondary dark:text-text-secondary-dark'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ms-2 text-sm text-gray dark:text-gray-dark">
                    ({editRating}/5)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('helpfulCount')}
                </label>
                <NumberInput
                  min={0}
                  value={editHelpfulCount}
                  onChange={(e) =>
                    setEditHelpfulCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  placeholder="0"
                />
              </div>

              {/* English (en) section */}
              <div className="space-y-3 rounded-lg border border-border dark:border-border-dark p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sectionEn')}</h3>
                <Input
                  label={t('userNameEn')}
                  value={editUserNameEn}
                  onChange={(e) => setEditUserNameEn(e.target.value)}
                  placeholder={t('placeholderUserNameEn')}
                  maxLength={100}
                />
                <Textarea
                  label={t('commentEn')}
                  value={editCommentEn}
                  onChange={(e) => setEditCommentEn(e.target.value)}
                  rows={3}
                  placeholder={t('placeholderCommentEn')}
                  maxLength={2000}
                />
                <p className="text-xs text-gray dark:text-gray-dark">{editCommentEn.length}/2000</p>
              </div>

              {/* Hebrew (he) section */}
              <div className="space-y-3 rounded-lg border border-border dark:border-border-dark p-4" dir="rtl">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sectionHe')}</h3>
                <Input
                  label={t('userNameHe')}
                  value={editUserNameHe}
                  onChange={(e) => setEditUserNameHe(e.target.value)}
                  placeholder={t('placeholderUserNameHe')}
                  maxLength={100}
                />
                <Textarea
                  label={t('commentHe')}
                  value={editCommentHe}
                  onChange={(e) => setEditCommentHe(e.target.value)}
                  rows={3}
                  placeholder={t('placeholderCommentHe')}
                  maxLength={2000}
                />
                <p className="text-xs text-gray dark:text-gray-dark">{editCommentHe.length}/2000</p>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="primary"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? t('saving') : t('saveChanges')}
                </Button>
                <Button
                  variant="error"
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

