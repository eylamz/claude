'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Share2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { highlightMatch } from '@/lib/search-highlight';

interface TrainerCardProps {
  slug: string;
  name: string;
  image?: string;
  area: 'north' | 'center' | 'south';
  sports?: string[];
  rating?: number;
  reviewCount?: number;
  onContact?: () => void;
  onShare?: () => void;
  /** When set, highlights matching substring in name (e.g. search query). */
  highlightQuery?: string;
}

const areaLabels = {
  north: 'North',
  center: 'Center',
  south: 'South',
};

export const TrainerCard: FC<TrainerCardProps> = ({ 
  slug, 
  name, 
  image, 
  area, 
  sports,
  rating,
  reviewCount,
  onContact,
  onShare,
  highlightQuery,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShare) {
      onShare();
    } else if (navigator.share) {
      navigator.share({
        title: name,
        text: `Check out ${name}'s trainer profile`,
        url: `${window.location.origin}/trainers/${slug}`,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/trainers/${slug}`;
      navigator.clipboard.writeText(url);
    }
  };

  const handleContact = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContact) onContact();
  };

  return (
    <div className="group relative border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-800 dark:border-gray-700">
      <Link href={`/trainers/${slug}`} className="block">
        {/* Image */}
        <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-900">
          {image && !imageError ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
              No Image
            </div>
          )}
        </div>
      </Link>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {areaLabels[area]}
          </p>
          {onShare && (
            <button
              onClick={handleShare}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Share profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Link href={`/trainers/${slug}`}>
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {highlightQuery ? highlightMatch(name, highlightQuery) : name}
          </h3>
        </Link>

        {/* Sports Badges */}
        {sports && sports.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {sports.slice(0, 3).map((sport, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {sport}
              </span>
            ))}
            {sports.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                +{sports.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Rating */}
        {rating !== undefined && rating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {rating.toFixed(1)}
            </span>
            {reviewCount !== undefined && reviewCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Contact Button */}
        {onContact && (
          <Button
            onClick={handleContact}
            variant="primary"
            size="sm"
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact
          </Button>
        )}
      </div>
    </div>
  );
};

