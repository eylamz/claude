'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Select, Skeleton } from '@/components/ui';
import { Star, Edit2, Check, X, Eye } from 'lucide-react';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ReviewsPage() {
  const locale = useLocale();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Filters
  const [status, setStatus] = useState('pending'); // Default to pending
  const [search, setSearch] = useState('');
  
  // Edit modal state
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(status && { status }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');

      const data = await response.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, status, search]);

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

      fetchReviews();
      // Refresh pending count
      fetch('/api/admin/reviews?status=pending&limit=1')
        .then(res => res.json())
        .then(data => setPendingCount(data.pagination?.total || 0))
        .catch(() => {});
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
      // Refresh pending count
      fetch('/api/admin/reviews?status=pending&limit=1')
        .then(res => res.json())
        .then(data => setPendingCount(data.pagination?.total || 0))
        .catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Failed to update review');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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

  // Get pending count for badge
  const [pendingCount, setPendingCount] = useState(0);
  const refreshPendingCount = useCallback(() => {
    fetch('/api/admin/reviews?status=pending&limit=1')
      .then(res => res.json())
      .then(data => setPendingCount(data.pagination?.total || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

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
        {pendingCount > 0 && status !== 'pending' && (
          <Button
            variant="primary"
            onClick={() => setStatus('pending')}
            className="relative"
          >
            <Eye className="w-4 h-4 mr-2" />
            Review Pending
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search by content, user name, or skatepark..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'pending', label: `Pending (${pendingCount})` },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'all', label: 'All Reviews' },
                ]}
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

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'pending' ? 'Pending Reviews' : status === 'approved' ? 'Approved Reviews' : status === 'rejected' ? 'Rejected Reviews' : 'All Reviews'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No {status !== 'all' ? status : ''} reviews found.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {reviews.map((review) => (
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
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {review.userName}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              on{' '}
                              <Link
                                href={`/${locale}/skateparks/${review.slug}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                target="_blank"
                              >
                                {review.entityId?.name?.en || review.slug}
                              </Link>
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                                review.status
                              )}`}
                            >
                              {review.status}
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
                              variant="primary"
                              size="sm"
                              onClick={() => handleStatusChange(review._id, 'approve')}
                              className="flex items-center space-x-1"
                            >
                              <Check className="w-4 h-4" />
                              <span>Approve</span>
                            </Button>
                            <Button
                              variant="danger"
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
                            variant="danger"
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
                            variant="primary"
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
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} reviews
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  variant="primary"
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

