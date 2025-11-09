import { FC } from 'react';
import Link from 'next/link';

interface SkateparkCardProps {
  slug: string;
  name: string;
  image?: string;
  area: 'north' | 'center' | 'south';
  openingYear?: number;
}

const areaLabels = {
  north: 'North',
  center: 'Center',
  south: 'South',
};

export const SkateparkCard: FC<SkateparkCardProps> = ({ slug, name, image, area, openingYear }) => {
  return (
    <Link href={`/skateparks/${slug}`} className="group">
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-800 dark:border-gray-700">
        {/* Image */}
        <div className="aspect-[4/3] relative overflow-hidden bg-gray-100 dark:bg-gray-900">
          {image ? (
            <img 
              src={image} 
              alt={name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
            {areaLabels[area]}
          </p>
          <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {name}
          </h3>
          {openingYear && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Opened: {openingYear}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

