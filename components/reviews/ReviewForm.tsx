'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

export default function ReviewForm({
  slug,
  onSubmitted,
  onCancel,
  inModal = false,
  user,
}: {
  slug: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
  inModal?: boolean;
  /** When set (authenticated user), name field is hidden and review uses this user's name */
  user?: { name?: string | null; email?: string | null } | null;
}) {
  const t = useTranslations('skateparks');
  const locale = useLocale();
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  const handleSubmit = async () => {
    // Prevent submission if already submitting
    if (submitting) return;
    
    // Validate: rating always required; name required only for unauthenticated
    const hasRatingError = rating == null || rating === undefined || rating < 1;
    const hasNameError = !isAuthenticated && (!userName || userName.trim().length === 0);
    
    // Set all relevant errors
    if (hasRatingError) {
      setRatingError(t('reviewForm.ratingRequiredError'));
    }
    if (hasNameError) {
      setNameError(t('reviewForm.fullNameRequiredError'));
    }
    
    // If any validation failed, show toast and return
    if (hasRatingError || hasNameError) {
      const errorMessages: string[] = [];
      if (hasRatingError) {
        errorMessages.push(t('reviewForm.ratingRequiredError'));
      }
      if (hasNameError) {
        errorMessages.push(t('reviewForm.fullNameRequiredError'));
      }
      
      toast({
        title: t('reviewForm.validationError'),
        description: errorMessages.join(', '),
        variant: 'error',
      });
      return;
    }
    setSubmitting(true);
    setError(null);
    setRatingError(null);
    setNameError(null);
    try {
      const body: any = { rating, comment, locale };
      if (!isAuthenticated) {
        body.userName = userName.trim();
      }
      
      const res = await fetch(`/api/skateparks/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit review');
      }
      if (onSubmitted) onSubmitted();
      setRating(0);
      setComment('');
      setUserName('');
      setRatingError(null);
      setNameError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    if (newRating >= 1 && ratingError) {
      setRatingError(null);
    }
  };

  return (
    <div className={inModal ? '' : 'border border-border-border-dark rounded-lg p-4'}>
      {!inModal && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('reviewForm.title')}</h3>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Full name input - only for unauthenticated users; authenticated use session name */}
      {!isAuthenticated && (
        <div className="mb-3 ">
          <Input
            id="reviewer-name"
            type="text"
            label={t('reviewForm.yourFullName')}
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
              if (e.target.value.trim().length > 0 && nameError) {
                setNameError(null);
              }
            }}
            placeholder={t('reviewForm.enterYourFullName')}
            maxLength={80}
            required
            variant="default"
          />
          {nameError && (
            <p className="mt-1 text-sm text-red dark:text-red-dark">{nameError}</p>
          )}
        </div>
      )}

      {/* Rating - Required */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray dark:text-gray-dark mb-1.5">
          {t('reviewForm.rating')}
          <span className="text-red dark:text-red-dark ms-1">*</span>
        </label>
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${t('reviewForm.selectRating')} ${star} ${star === 1 ? t('star') : t('stars')}`}
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  (hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-text-secondary dark:text-text-secondary-dark'
                }`}
              />
            </button>
          ))}
        </div>
        {ratingError && (
          <p className="mt-1 text-sm text-red dark:text-red-dark">{ratingError}</p>
        )}
      </div>

      {/* Textarea */}
      <div>
        <Textarea
          id="review-comment"
          label={t('reviewForm.comment')}
          value={comment}
          onChange={(e) => setComment(e.target.value)}          
          placeholder={t('reviewForm.commentPlaceholder')}
          maxLength={100}
          variant="default"
          className="min-h-28"
          
        />
        <div className="flex items-center justify-end mt-1 text-xs">
          <span className="text-gray dark:text-text-gray-dark">{t('reviewForm.charactersCount', { count: comment.trim().length })}</span>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t('reviewForm.submitting') : t('reviewForm.submitReview')}
        </Button>
        {onCancel && (
          <Button variant="gray" onClick={onCancel}>{t('reviewForm.cancel')}</Button>
        )}
      </div>
    </div>
  );
}



