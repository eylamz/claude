'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, Eye } from 'lucide-react';

interface GuideCardProps {
  slug: string;
  title: string;
  description?: string;
  image?: string;
  views?: number;
  rating?: number;
  ratingCount?: number;
  readTime?: number; // in minutes
  sports?: string[];
  difficulty?: string;
}

export const GuideCard: FC<GuideCardProps> = ({ 
  slug, 
  title, 
  description, 
  image, 
  views,
  rating,
  ratingCount,
  readTime,
  sports,
  difficulty,
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <Link href={`/guides/${slug}`} className="group">
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-800 dark:border-gray-700 h-full flex flex-col">
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden bg-gray-100 dark:bg-gray-900">
          {image && !imageError ? (
            <Image
              src={image}
              alt={title}
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
        
        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {/* Sports Tags */}
          {sports && sports.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {sports.slice(0, 2).map((sport, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {sport}
                </span>
              ))}
              {sports.length > 2 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                  +{sports.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Difficulty Badge */}
          {difficulty && (
            <span className="inline-block mb-2 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 w-fit">
              {difficulty}
            </span>
          )}

          <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3 flex-1">
              {description}
            </p>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {/* Rating */}
              {rating !== undefined && rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                  {ratingCount !== undefined && ratingCount > 0 && (
                    <span className="text-gray-400">({ratingCount})</span>
                  )}
                </div>
              )}

              {/* Read Time */}
              {readTime !== undefined && readTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{readTime} min</span>
                </div>
              )}

              {/* Views */}
              {views !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{views}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

