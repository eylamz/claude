'use client';

import { useEffect, useMemo, useState } from 'react';
import { Select } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import ReviewCard, { ReviewData } from './ReviewCard';
import ReviewForm from './ReviewForm';

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function ReviewsList({ slug, canWrite = false }: { slug: string; canWrite?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState<SortOption>('newest');
  const [ratingFilter, setRatingFilter] = useState<number | ''>('');
  const [summary, setSummary] = useState<{ average: number; breakdown: Record<number, number>; total: number } | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('sort', sort);
      if (ratingFilter) params.set('rating', String(ratingFilter));
      const res = await fetch(`/api/skateparks/${slug}/reviews?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setSummary(data.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, ratingFilter, slug]);

  const averageDisplay = useMemo(() => (summary ? summary.average.toFixed(1) : '0.0'), [summary]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Reviews</h3>
          {summary ? (
            <p className="text-gray-600 dark:text-gray-400">
              Average {averageDisplay} • {summary.total} total
            </p>
          ) : (
            <div className="mt-2"><Skeleton className="h-4 w-48" /></div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(ratingFilter)}
            onChange={(e) => setRatingFilter(e.target.value ? Number(e.target.value) : '')}
            options={[
              { value: '', label: 'All Ratings' },
              { value: '5', label: '5 stars' },
              { value: '4', label: '4 stars' },
              { value: '3', label: '3 stars' },
              { value: '2', label: '2 stars' },
              { value: '1', label: '1 star' },
            ]}
          />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'highest', label: 'Highest Rated' },
              { value: 'lowest', label: 'Lowest Rated' },
            ]}
          />
        </div>
      </div>

      {/* Rating Breakdown */}
      {summary && (
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
      )}

      {/* Write Review */}
      {canWrite && (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Write a review
            </button>
          ) : (
            <ReviewForm slug={slug} onSubmitted={() => { setShowForm(false); /* Don't fetch reviews - they need admin approval first */ }} onCancel={() => setShowForm(false)} />
          )}
        </div>
      )}

      {/* Reviews */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">No reviews found.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r._id} review={r} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}



