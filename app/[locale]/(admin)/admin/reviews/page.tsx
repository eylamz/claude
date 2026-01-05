'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Skeleton } from '@/components/ui';
import { Star, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  _id: string;
  entityType: string;
  entityId: any;
  slug: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  reportsCount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export default function ReviewsPage() {
  const locale = useLocale();
  const [pendingReviews, setPendingReviews] = useState<Review[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<Review[]>([]);
  const [rejectedReviews, setRejectedReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [loadingEntityType, setLoadingEntityType] = useState<Record<string, boolean>>({});
  const [loadedEntityTypes, setLoadedEntityTypes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  
  // Edit modal state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
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
    setEditComment(review.comment || '');
    setEditRating(review.rating);
    setError(null);
  };

  const closeEditModal = () => {
    setEditingReview(null);
    setEditComment('');
    setEditRating(5);
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
          comment: editComment,
          rating: editRating,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update review');
      }

      closeEditModal();
      fetchReviews();
    } catch (err: any) {
      setError(err.message || 'Failed to update review');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
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
            ? 'fill-yellow-400 text-yellow-400'
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

  // Render a single review item
  const renderReviewItem = (review: Review) => (
                  <div
                    key={review._id}
                    className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      review.status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-wrap">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {review.userName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              on{' '}
                              <Link
                  href={getEntityLink(review)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                target="_blank"
                              >
                                {review.entityId?.name?.en || review.slug}
                              </Link>
                            </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                ({review.entityType || 'skatepark'})
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(review.createdAt)}
                          </span>
                        </div>

                        {/* Comment */}
                        {review.comment && (
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {review.comment}
                          </p>
                        )}

                        {/* Stats */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          {review.helpfulCount > 0 && (
                            <span>👍 {review.helpfulCount} helpful</span>
                          )}
                          {review.reportsCount > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              ⚠️ {review.reportsCount} reports
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex items-center space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(review)}
                          className="flex items-center space-x-1"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span>Edit</span>
                        </Button>
                        {review.status === 'pending' && (
                          <>
                            <Button
                variant="green"
                              size="sm"
                              onClick={() => handleStatusChange(review._id, 'approve')}
                              className="flex items-center space-x-1"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve</span>
                            </Button>
                            <Button
                variant="red"
                              size="sm"
                              onClick={() => handleStatusChange(review._id, 'reject')}
                              className="flex items-center space-x-1"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </Button>
                          </>
                        )}
                        {review.status === 'approved' && (
                          <Button
              variant="red"
                            size="sm"
                            onClick={() => handleStatusChange(review._id, 'reject')}
                            className="flex items-center space-x-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject</span>
                          </Button>
                        )}
                        {review.status === 'rejected' && (
                          <Button
              variant="green"
                            size="sm"
                            onClick={() => handleStatusChange(review._id, 'approve')}
                            className="flex items-center space-x-1"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
  );

  // Render a review section
  const renderReviewSection = (reviews: Review[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {reviews.map(renderReviewItem)}
      </div>
    );
  };

  const groupedApproved = groupApprovedByEntityType(approvedReviews);
  const groupedRejected = groupRejectedByEntityType(rejectedReviews);
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

  const areaLabels: Record<string, string> = {
    north: 'North',
    center: 'Center',
    south: 'South',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and moderate user reviews
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search by content, user name, or entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
            Pending Reviews {pendingReviews.length > 0 && `(${pendingReviews.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {renderReviewSection(
              pendingReviews,
              'No pending reviews found.'
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approved Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            Approved Reviews {approvedReviews.length > 0 && `(${approvedReviews.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="p-6 space-y-4">
                {/* Events Accordion */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Events ({groupedApproved.event.length})
                      </h3>
                      {groupedApproved.event.length === 0 && !loadingEntityType['event-approved'] && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('event', 'approved')}
                          disabled={loadingEntityType['event-approved']}
                        >
                          {loadingEntityType['event-approved'] ? 'Loading...' : 'Load Events Reviews'}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['event-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : groupedApproved.event.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(eventsByEntity).map(([eventSlug, eventReviews]) => {
                          const eventName = eventReviews[0]?.entityId?.name?.en || eventSlug;
                          const isOpen = openEvent === eventSlug;
                          return (
                            <div key={eventSlug} className="border-b border-gray-200 dark:border-gray-700 last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : eventSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {eventName}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({eventReviews.length} {eventReviews.length === 1 ? 'review' : 'reviews'})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
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
                        <p className="text-gray-500 dark:text-gray-400">No approved event reviews found.</p>
                      </div>
                    )}
                  </div>

                {/* Skateparks Accordion - By Area, then by Park */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-2">
                        <button
                          onClick={() => setOpenSkateparks(!openSkateparks)}
                          className="flex-1 flex justify-between items-center text-left"
                        >
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Skateparks ({groupedApproved.skatepark.length} reviews)
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Organized by area: North, Center, South
                            </p>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${openSkateparks ? 'rotate-180' : ''}`} 
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {groupedApproved.skatepark.length === 0 && !loadingEntityType['skatepark-approved'] && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchEntityTypeReviews('skatepark', 'approved')}
                            disabled={loadingEntityType['skatepark-approved']}
                            className="ml-4"
                          >
                            {loadingEntityType['skatepark-approved'] ? 'Loading...' : 'Load Skateparks Reviews'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {loadingEntityType['skatepark-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : groupedApproved.skatepark.length > 0 ? (
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      openSkateparks ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="p-6 space-y-4">
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
                            ? `${parkCount} ${parkCount === 1 ? 'park' : 'parks'}, ${areaReviews.length} ${areaReviews.length === 1 ? 'review' : 'reviews'}`
                            : `${areaReviews.length} ${areaReviews.length === 1 ? 'review' : 'reviews'}`;
                          
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
                                  "group relative flex items-center justify-between p-6 rounded-[18px] bg-white/5 dark:bg-gray-800/50 border border-white/10 dark:border-gray-700 cursor-pointer transition-all duration-300 hover:bg-white/10 dark:hover:bg-gray-700/50 hover:-translate-y-1 hover:border-blue-500/50",
                                  isAreaOpen && "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50"
                                )}
                              >
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-xl">
                                    {areaIcons[area]}
                                  </div>
                                  <div>
                                    <h3 className={cn(
                                      "text-lg font-semibold transition-colors",
                                      isAreaOpen 
                                        ? "text-blue-400 dark:text-blue-300" 
                                        : "text-gray-900 dark:text-white group-hover:text-blue-400 dark:group-hover:text-blue-300"
                                    )}>
                                      {areaLabels[area]} Area
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{areaDescription}</p>
                                  </div>
                                </div>
                                <svg 
                                  className={cn(
                                    "w-5 h-5 transition-all duration-300",
                                    isAreaOpen 
                                      ? "text-blue-400 dark:text-blue-300 rotate-180" 
                                      : "text-gray-600 dark:text-gray-400 group-hover:text-blue-400 dark:group-hover:text-blue-300 group-hover:translate-x-1"
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
                                  isAreaOpen && "border-blue-500/20"
                                )} />
                              </div>
                              
                              {/* Area Content */}
                              <div className={cn(
                                "overflow-hidden transition-all duration-300 ease-in-out mt-4",
                                isAreaOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                              )}>
                                <div className="px-2 space-y-2">
                                  {areaReviews.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2 px-4">
                                      No reviews in this area.
                                    </p>
                                  ) : (
                                    Object.entries(areaParks).map(([parkSlug, parkReviews]) => {
                                      const parkName = parkReviews[0]?.entityId?.name?.en || parkSlug;
                                      const isParkOpen = openPark === `${area}-${parkSlug}`;
                                      return (
                                        <div key={parkSlug} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white/5 dark:bg-gray-800/30">
                                          {/* Park Level Accordion */}
                                          <button
                                            onClick={() => setOpenPark(isParkOpen ? null : `${area}-${parkSlug}`)}
                                            className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                          >
                                            <div className="flex items-center space-x-3">
                                              <span className={`text-sm font-medium ${isParkOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                                {parkName}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({parkReviews.length} {parkReviews.length === 1 ? 'review' : 'reviews'})
                                              </span>
                                            </div>
                                            <svg 
                                              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isParkOpen ? 'rotate-180' : ''}`} 
                                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </button>
                                          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isParkOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="px-4 pb-3 space-y-3">
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
                        <p className="text-gray-500 dark:text-gray-400">No approved skatepark reviews found.</p>
                      </div>
                    )}
                  </div>

                {/* Guides Accordion */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Guides ({groupedApproved.guide.length})
                      </h3>
                      {groupedApproved.guide.length === 0 && !loadingEntityType['guide-approved'] && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('guide', 'approved')}
                          disabled={loadingEntityType['guide-approved']}
                        >
                          {loadingEntityType['guide-approved'] ? 'Loading...' : 'Load Guides Reviews'}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['guide-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : groupedApproved.guide.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(guidesByEntity).map(([guideSlug, guideReviews]) => {
                          const guideName = guideReviews[0]?.entityId?.name?.en || guideSlug;
                          const isOpen = openGuide === guideSlug;
                          return (
                            <div key={guideSlug} className="border-b border-gray-200 dark:border-gray-700 last:border-none">
                              <button
                                onClick={() => setOpenGuide(isOpen ? null : guideSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {guideName}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({guideReviews.length} {guideReviews.length === 1 ? 'review' : 'reviews'})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
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
                        <p className="text-gray-500 dark:text-gray-400">No approved guide reviews found.</p>
                      </div>
                    )}
                  </div>

                {/* Products Accordion */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Products ({groupedApproved.product.length})
                      </h3>
                      {groupedApproved.product.length === 0 && !loadingEntityType['product-approved'] && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('product', 'approved')}
                          disabled={loadingEntityType['product-approved']}
                        >
                          {loadingEntityType['product-approved'] ? 'Loading...' : 'Load Products Reviews'}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['product-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : groupedApproved.product.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(productsByEntity).map(([productSlug, productReviews]) => {
                          const productName = productReviews[0]?.entityId?.name?.en || productSlug;
                          const isOpen = openEvent === productSlug;
                          return (
                            <div key={productSlug} className="border-b border-gray-200 dark:border-gray-700 last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : productSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {productName}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({productReviews.length} {productReviews.length === 1 ? 'review' : 'reviews'})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
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
                        <p className="text-gray-500 dark:text-gray-400">No approved product reviews found.</p>
                      </div>
                    )}
                  </div>

                {/* Trainers Accordion */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Trainers ({groupedApproved.trainer.length})
                      </h3>
                      {groupedApproved.trainer.length === 0 && !loadingEntityType['trainer-approved'] && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchEntityTypeReviews('trainer', 'approved')}
                          disabled={loadingEntityType['trainer-approved']}
                        >
                          {loadingEntityType['trainer-approved'] ? 'Loading...' : 'Load Trainers Reviews'}
                        </Button>
                      )}
                    </div>
                    {loadingEntityType['trainer-approved'] ? (
                      <div className="p-6">
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : groupedApproved.trainer.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Object.entries(trainersByEntity).map(([trainerSlug, trainerReviews]) => {
                          const trainerName = trainerReviews[0]?.entityId?.name?.en || trainerSlug;
                          const isOpen = openEvent === trainerSlug;
                          return (
                            <div key={trainerSlug} className="border-b border-gray-200 dark:border-gray-700 last:border-none">
                              <button
                                onClick={() => setOpenEvent(isOpen ? null : trainerSlug)}
                                className="w-full flex justify-between items-center px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className={`text-base font-medium ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                                    {trainerName}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({trainerReviews.length} {trainerReviews.length === 1 ? 'review' : 'reviews'})
                                  </span>
                                </div>
                                <svg 
                                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
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
                        <p className="text-gray-500 dark:text-gray-400">No approved trainer reviews found.</p>
                      </div>
                    )}
                  </div>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Rejected Reviews Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Rejected Reviews {rejectedReviews.length > 0 && `(${rejectedReviews.length})`}
            </CardTitle>
            {rejectedReviews.length === 0 && !loadingRejected && (
              <Button
                variant="green"
                onClick={fetchRejectedReviews}
                disabled={loadingRejected}
              >
                {loadingRejected ? 'Loading...' : 'Load Rejected Reviews'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loadingRejected ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : rejectedReviews.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No rejected reviews loaded.</p>
                <Button
                  variant="green"
                  onClick={fetchRejectedReviews}
                  disabled={loadingRejected}
                >
                  {loadingRejected ? 'Loading...' : 'Load Rejected Reviews'}
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Group rejected reviews by entity type - Always show all entity types */}
                {(['event', 'skatepark', 'guide', 'product', 'trainer'] as const).map((entityType) => {
                  const reviews = groupedRejected[entityType] || [];
                  const entityLabels: Record<string, string> = {
                    event: 'Events',
                    skatepark: 'Skateparks',
                    guide: 'Guides',
                    product: 'Products',
                    trainer: 'Trainers',
                  };
                  const isLoading = loadingEntityType[`${entityType}-rejected`];
                  const isLoaded = loadedEntityTypes[`${entityType}-rejected`];
                  
                  // Show section if it has reviews or if it's been loaded (even if empty)
                  if (reviews.length === 0 && !isLoaded) return null;
                  
                  return (
                    <div key={entityType} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {entityLabels[entityType]} ({reviews.length})
                        </h3>
                        {reviews.length === 0 && !isLoading && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchEntityTypeReviews(entityType, 'rejected')}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Loading...' : `Load ${entityLabels[entityType]} Reviews`}
                          </Button>
                        )}
                      </div>
                      {isLoading ? (
                        <div className="p-6">
                          <Skeleton className="h-32 w-full" />
                        </div>
                      ) : reviews.length > 0 ? (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {reviews.map(renderReviewItem)}
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-gray-500 dark:text-gray-400">No rejected {entityType} reviews found.</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Show message if no rejected reviews loaded yet */}
                {rejectedReviews.length === 0 && Object.keys(loadedEntityTypes).filter(k => k.includes('rejected')).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No rejected reviews loaded. Click the buttons above to load reviews by entity type.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="bg-card dark:bg-card-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rating
                </label>
                <div className="flex items-center space-x-2">
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
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    ({editRating}/5)
                  </span>
                </div>
              </div>

              <div>
                <Textarea
                  label="Comment"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={6}
                  placeholder="Review comment..."
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {editComment.length}/2000 characters
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <Button
                  variant="green"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

