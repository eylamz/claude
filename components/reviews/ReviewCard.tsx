'use client';

import { useState } from 'react';
import { Star, ThumbsUp, Flag } from 'lucide-react';
import { Button } from '@/components/ui';
import { featureFlags } from '@/lib/config/feature-flags';

export interface ReviewData {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpfulCount?: number;
  kudosCount?: number;
}

export default function ReviewCard({ review }: { review: ReviewData }) {
  const [helpful, setHelpful] = useState(review.helpfulCount || 0);
  const [kudos, setKudos] = useState(review.kudosCount || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleHelpful = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}/helpful`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setHelpful(data.helpfulCount ?? helpful + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKudos = async () => {
    if (!featureFlags.kudos || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}/kudos`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.totalKudos === 'number') {
          setKudos(data.totalKudos);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (reported) return;
    setReported(true);
    // Optionally send to /api/reviews/[id]/report
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{review.userName}</p>
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              />
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-line">{review.comment}</p>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={handleHelpful} disabled={isSubmitting}>
          <ThumbsUp className="w-4 h-4 mr-1" /> Helpful ({helpful})
        </Button>
        {featureFlags.kudos && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleKudos}
            disabled={isSubmitting}
          >
            <ThumbsUp className="w-4 h-4 mr-1" /> Kudos ({kudos})
          </Button>
        )}
        <button
          onClick={handleReport}
          className={`text-sm inline-flex items-center gap-1 ${reported ? 'text-gray-400' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Flag className="w-4 h-4" /> {reported ? 'Reported' : 'Report'}
        </button>
      </div>
    </div>
  );
}



