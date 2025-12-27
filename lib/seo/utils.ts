import { Metadata } from 'next';

type LocalizedField = { en: string; he: string } | string;

export function getLocalizedText(field: LocalizedField, locale: string): string {
  if (typeof field === 'string') return field;
  return field[locale] || field.en || field.he || '';
}

export interface SEOConfig {
  title: string | LocalizedField;
  description: string | LocalizedField;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  locale?: string;
  alternateLocales?: string[];
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

export function generateMetadata(config: SEOConfig): Metadata {
  const { title, description, image, url, type = 'website', locale = 'en', alternateLocales = [], publishedTime, modifiedTime, author } = config;
  
  const titleText = getLocalizedText(title, locale);
  const descText = getLocalizedText(description, locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const imageUrl = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : `${siteUrl}/og-default.jpg`;
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;

  // Handle alternate language URLs
  // If URL contains locale prefix, replace it; otherwise add locale prefix
  const getAlternateUrl = (targetLocale: string): string => {
    if (canonicalUrl.includes(`/${locale}/`)) {
      // URL has locale prefix, replace it
      return canonicalUrl.replace(`/${locale}/`, `/${targetLocale}/`);
    } else if (canonicalUrl.includes('/skateparks/') || canonicalUrl.includes('/shop/') || canonicalUrl.includes('/guides/') || canonicalUrl.includes('/trainers/') || canonicalUrl.includes('/events/')) {
      // URL doesn't have locale prefix, add it
      const pathWithoutDomain = canonicalUrl.replace(siteUrl, '');
      return `${siteUrl}/${targetLocale}${pathWithoutDomain}`;
    }
    // Default: just return canonical
    return canonicalUrl;
  };

  const metadata: Metadata = {
    title: titleText,
    description: descText,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': getAlternateUrl('en'),
        'he': getAlternateUrl('he'),
        ...Object.fromEntries(alternateLocales.map(loc => [loc, getAlternateUrl(loc)]))
      }
    },
    openGraph: {
      title: titleText,
      description: descText,
      url: canonicalUrl,
      siteName: 'ENBOSS',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: titleText,
        }
      ],
      locale: locale === 'he' ? 'he_IL' : 'en_US',
      type: type === 'article' ? 'article' : type === 'product' ? 'product' : 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: descText,
      images: [imageUrl],
    },
  };

  if (type === 'article' && publishedTime) {
    metadata.openGraph = {
      ...metadata.openGraph,
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
    };
  }

  return metadata;
}

export function generateProductStructuredData(product: {
  name: LocalizedField;
  description?: LocalizedField;
  price: number;
  discountPrice?: number;
  images: Array<{ url: string }>;
  rating?: number;
  reviewCount?: number;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  sku?: string;
  slug: string;
  locale: string;
  siteUrl: string;
}) {
  const { name, description, price, discountPrice, images, rating, reviewCount, availability, brand = 'ENBOSS', sku, slug, locale, siteUrl } = product;
  const finalPrice = discountPrice || price;
  const url = `${siteUrl}/${locale}/shop/product/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: getLocalizedText(name, locale),
    description: description ? getLocalizedText(description, locale) : undefined,
    image: images.map(img => (img.url.startsWith('http') ? img.url : `${siteUrl}${img.url}`)),
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'ILS',
      price: finalPrice,
      availability: `https://schema.org/${availability}`,
      priceValidUntil: discountPrice ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    },
    ...(sku && { sku }),
    ...(rating && reviewCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount,
      }
    })
  };
}

export function generateLocalBusinessStructuredData(skatepark: {
  name: LocalizedField;
  address: LocalizedField;
  location: { lat: number; lng: number };
  rating?: number;
  totalReviews?: number;
  operatingHours?: any;
  is24Hours?: boolean;
  slug: string;
  locale: string;
  siteUrl: string;
}) {
  const { name, address, location, rating, totalReviews, operatingHours, is24Hours, slug, locale, siteUrl } = skatepark;
  const url = `${siteUrl}/${locale}/skateparks/${slug}`;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: getLocalizedText(name, locale),
    address: {
      '@type': 'PostalAddress',
      streetAddress: getLocalizedText(address, locale),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location.lat,
      longitude: location.lng,
    },
    url,
  };

  if (is24Hours) {
    schema.openingHoursSpecification = {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    };
  } else if (operatingHours) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    schema.openingHoursSpecification = days
      .map((day, idx) => {
        const hours = operatingHours[day as keyof typeof operatingHours];
        if (!hours || hours.closed) return null;
        return {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: dayNames[idx],
          opens: hours.open || '00:00',
          closes: hours.close || '23:59',
        };
      })
      .filter(Boolean);
  }

  if (rating && totalReviews) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: totalReviews,
    };
  }

  return schema;
}

export function generateEventStructuredData(event: {
  title: LocalizedField;
  description?: LocalizedField;
  startDate: string;
  endDate?: string;
  location: {
    name?: LocalizedField;
    address?: LocalizedField;
    coordinates?: { latitude: number; longitude: number };
  };
  image?: string;
  price?: number;
  currency?: string;
  slug: string;
  locale: string;
  siteUrl: string;
}) {
  const { title, description, startDate, endDate, location, image, price, currency = 'ILS', slug, locale, siteUrl } = event;
  const url = `${siteUrl}/${locale}/events/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: getLocalizedText(title, locale),
    description: description ? getLocalizedText(description, locale) : undefined,
    startDate,
    endDate: endDate || startDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: location.name ? getLocalizedText(location.name, locale) : undefined,
      address: location.address ? {
        '@type': 'PostalAddress',
        streetAddress: getLocalizedText(location.address, locale),
      } : undefined,
      ...(location.coordinates && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
        }
      })
    },
    image: image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : undefined,
    ...(price !== undefined && {
      offers: {
        '@type': 'Offer',
        price: price,
        priceCurrency: currency,
        availability: price === 0 ? 'https://schema.org/Free' : 'https://schema.org/InStock',
      }
    })
  };
}

export function generateArticleStructuredData(guide: {
  title: LocalizedField;
  description?: LocalizedField;
  coverImage?: string;
  authorName?: string;
  publishedAt?: string;
  modifiedAt?: string;
  rating?: number;
  ratingCount?: number;
  slug: string;
  locale: string;
  siteUrl: string;
}) {
  const { title, description, coverImage, authorName, publishedAt, modifiedAt, rating, ratingCount, slug, locale, siteUrl } = guide;
  const url = `${siteUrl}/${locale}/guides/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: getLocalizedText(title, locale),
    description: description ? getLocalizedText(description, locale) : undefined,
    image: coverImage ? (coverImage.startsWith('http') ? coverImage : `${siteUrl}${coverImage}`) : undefined,
    author: authorName ? {
      '@type': 'Person',
      name: authorName,
    } : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'ENBOSS',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      }
    },
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    ...(rating && ratingCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: ratingCount,
      }
    })
  };
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${siteUrl}${item.url}`,
    }))
  };
}


