'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import styles from './PhotoCollage.module.css';

interface Skatepark {
  id: string;
  slug: string;
  name: string;
  image: string;
  area: 'north' | 'center' | 'south';
  openingYear?: number;
}

interface PhotoCollageProps {
  parks: Skatepark[];
}

// Hardcoded style configurations for the first 10 images
// Each item has: gridColumnStart, gridRow, rotation, topOffset (for mobile), leftOffset
// Positions are designed to create partial overlaps, ensuring no image is completely covered
// Images span 8 columns, so overlaps are created by starting at positions that create 2-4 column overlaps
const imageStyles = [
  { gridColumnStart: 5, gridRow: 1, rotation: 2, topOffset: 0, leftOffset: 0, zIndex: 1 },
  { gridColumnStart: 9, gridRow: 2, rotation: 5, topOffset: 30, leftOffset: -15, zIndex: 3 }, // Overlaps with image 1 by 2 columns
  { gridColumnStart: 12, gridRow: 1, rotation: -12, topOffset: -20, leftOffset: -20, zIndex: 2 },
  { gridColumnStart: 19, gridRow: 1, rotation: 10, topOffset: 40, leftOffset: -10, zIndex: 4 },
  { gridColumnStart: 1, gridRow: 2, rotation: -6, topOffset: -30, leftOffset: 25, zIndex: 5 }, // Overlaps with image 1
  { gridColumnStart: 24, gridRow: 2, rotation: 8, topOffset: 20, leftOffset: -20, zIndex: 2 }, // Overlaps with image 3
  { gridColumnStart: 16, gridRow: 2, rotation: -1, topOffset: -10, leftOffset: 15, zIndex: 6 }, // Overlaps with image 4
  { gridColumnStart: 1, gridRow: 1, rotation: 7, topOffset: -30, leftOffset: 30, zIndex: 6 },
  { gridColumnStart: 26, gridRow: 1, rotation: 4, topOffset: -80, leftOffset: -25, zIndex: 7 }, // Overlaps with image 2
  { gridColumnStart: 15, gridRow: 1, rotation: 11, topOffset: 30, leftOffset: 10, zIndex: 4 }, // Overlaps with image 7
];

export const PhotoCollage = ({ parks }: PhotoCollageProps) => {
  const locale = useLocale();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Only show first 10 parks on desktop, first 5 on mobile
  const displayParks = parks?.slice(0, 10) || [];

  if (displayParks.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {displayParks.map((park, index) => {
        const styleConfig = imageStyles[index] || {
            // Use overlapping column starts (e.g., image at col 2 and next at col 6)
            gridColumnStart: (index * 5) % 24 + 2, 
            gridRow: (index % 2) + 1,
            // Increase rotation range to +/- 12deg for a "messier" feel
            rotation: ((index * 7) % 24) - 12, 
            // Use larger, varying offsets to create vertical depth
            topOffset: (index % 3 === 0) ? 40 : -30,
            leftOffset: (index % 2 === 0) ? -20 : 20,
            zIndex: index + 1,
          };

        // For mobile, adjust grid column to fit 16-column grid (max 2 per row)
        const mobileGridColumnStart = index < 5 
          ? ((index % 2) * 8) + 1 
          : styleConfig.gridColumnStart;

        const baseZIndex = styleConfig.zIndex || index + 1;

        return (
          <Link
            key={park.id}
            href={`/${locale}/skateparks/${park.slug}`}
            className={`${styles.card} ${index >= 5 ? styles.mobileHidden : ''} ${hoveredIndex !== null && hoveredIndex !== index ? styles.dimmed : ''}`}
            style={{
              '--grid-column-start': styleConfig.gridColumnStart,
              '--grid-column-start-mobile': mobileGridColumnStart,
              '--grid-row': styleConfig.gridRow,
              '--rotation': `${styleConfig.rotation}deg`,
              '--top-offset': `${styleConfig.topOffset}px`,
              '--left-offset': `${styleConfig.leftOffset || 0}px`,
              '--z-index': baseZIndex,
            } as React.CSSProperties}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={`rounded-xl ${styles.imageWrapper}`}>
              <img
                src={park.image ?? '/placeholder.jpg'}
                alt={park.name}
                className={styles.image}
              />
            </div>
            <div className={styles.overlay}>
              <h3 className={styles.title}>{park.name}</h3>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

