'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import styles from './AboutPhotoCollage.module.css';

interface Skatepark {
  id: string;
  slug: string;
  name: string;
  image: string;
  area: 'north' | 'center' | 'south';
  openingYear?: number;
}

interface AboutPhotoCollageProps {
  parks?: Skatepark[];
}

export const AboutPhotoCollage = ({ parks: initialParks }: AboutPhotoCollageProps) => {
  const locale = useLocale();
  const [parks, setParks] = useState<Skatepark[]>(initialParks || []);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch parks if not provided
  useEffect(() => {
    if (!initialParks || initialParks.length === 0) {
      fetchParks();
    }
  }, [initialParks]);

  const fetchParks = async () => {
    try {
      // Check cache first
      const cacheKey = 'skateparks_cache';
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          const transformedParks = transformParks(parsedData);
          setParks(transformedParks);
          return;
        } catch (e) {
          console.warn('Failed to parse cached skateparks data', e);
        }
      }

      // Fetch from API
      const response = await fetch('/api/skateparks');
      if (response.ok) {
        const data = await response.json();
        const transformedParks = transformParks(data.skateparks || []);
        setParks(transformedParks);
      }
    } catch (error) {
      console.error('Error fetching parks:', error);
    }
  };

  const transformParks = (allParks: any[]): Skatepark[] => {
    // Desktop: 7 columns x 6 rows = 42 images
    // Tablet: 7 columns x 5 rows = 35 images
    // Mobile: 5 columns x 8 rows = 40 images
    // Use 42 to cover all scenarios
    const displayParks = allParks.slice(0, 42);

    return displayParks.map((park: any) => {
      const name = typeof park.name === 'string' 
        ? park.name 
        : (locale === 'he' ? park.name.he : park.name.en) || park.name.en || park.name.he;
      
      const image = park.images && park.images.length > 0
        ? park.images.find((img: any) => img.isFeatured)?.url || park.images[0]?.url
        : park.imageUrl || '';

      return {
        id: park._id || park.id,
        slug: park.slug,
        name,
        image,
        area: park.area,
        openingYear: park.openingYear,
      };
    });
  };

  if (parks.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {parks.map((park, index) => {
          const isEveryThird = (index + 1) % 3 === 0;
          const isHovered = hoveredIndex === index;
          // Dim if it's every 3rd OR if hovered (but not if it's every 3rd and hovered - then un-dim)
          const isDimmed = isEveryThird ? !isHovered : isHovered;
          
          return (
            <Link
              key={park.id}
              href={`/${locale}/skateparks/${park.slug}`}
              className={`${styles.card} ${isDimmed ? styles.dimmed : ''}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={park.image || '/placeholder.jpg'}
                  alt={park.name}
                  className={styles.image}
                  loading="lazy"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

