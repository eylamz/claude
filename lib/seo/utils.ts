import { Metadata } from 'next';

type LocalizedField = { en: string; he: string } | string;

/** Default site meta title (same as root layout.tsx). Used as final fallback for page titles. */
export const DEFAULT_META_TITLE = 'ENBOSS - No Rider Left Behind';

/** Default OG image URL used for site-wide and listing pages (events, skateparks, guides, growth-lab). */
export const DEFAULT_OG_IMAGE = 'https://res.cloudinary.com/dr0rvohz9/image/upload/v1772636312/bd6cugckdsmod2abmxhw.png';

/**
 * Resolve the public site URL for absolute metadata (og:image, canonical, etc.).
 * Use this so metadata works on production (e.g. droplet) even when NEXT_PUBLIC_SITE_URL is not set:
 * 1. NEXT_PUBLIC_SITE_URL (set on droplet to e.g. https://enboss.co)
 * 2. Request host from headers (x-forwarded-proto + host, e.g. behind reverse proxy)
 * 3. Fallback https://enboss.co
 * Uses dynamic import for next/headers so this module can be imported from API routes without pulling in Server-Only APIs at top level.
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv;
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const rawProto = h.get('x-forwarded-proto');
    const proto = rawProto ? String(rawProto).split(',')[0].trim() : 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() can throw outside request context (e.g. during build)
  }
  return 'https://enboss.co';
}

/**
 * Get localized text with fallback: if the requested locale's value is missing or empty,
 * use the other locale (e.g. Hebrew missing → English, English missing → Hebrew).
 */
export function getLocalizedText(field: LocalizedField, locale: string): string {
  if (typeof field === 'string') return field;
  const otherLocale = locale === 'he' ? 'en' : 'he';
  const primary = (field[locale as 'en' | 'he'] ?? '').trim();
  const fallback = (field[otherLocale as 'en' | 'he'] ?? '').trim();
  return primary || fallback || '';
}

/**
 * Get meta title with fallback chain: locale metaTitle → English metaTitle → DEFAULT_META_TITLE.
 */
export function getMetaTitleWithFallback(
  field: { en: string; he: string } | undefined,
  locale: string
): string {
  if (!field) return DEFAULT_META_TITLE;
  const localeVal = (field[locale as 'en' | 'he'] ?? '').trim();
  const enVal = (field.en ?? '').trim();
  return localeVal || enVal || DEFAULT_META_TITLE;
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
  /** SEO keywords - string (comma-separated) or array. Rendered as meta name="keywords" and in openGraph. */
  keywords?: string | string[];
}

export async function generateMetadata(config: SEOConfig): Promise<Metadata> {
  const { title, description, image, url, type = 'website', locale = 'en', alternateLocales = [], publishedTime, modifiedTime, author, keywords } = config;
  
  const titleText = getLocalizedText(title, locale);
  const descText = getLocalizedText(description, locale);
  const siteUrl = await getSiteUrl();
  const imageUrl = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : DEFAULT_OG_IMAGE;
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;

  // Handle alternate language URLs
  // If URL contains locale prefix, replace it; otherwise add locale prefix
  const getAlternateUrl = (targetLocale: string): string => {
    if (canonicalUrl.includes(`/${locale}/`)) {
      // URL has locale prefix, replace it
      return canonicalUrl.replace(`/${locale}/`, `/${targetLocale}/`);
    } else if (canonicalUrl.includes('/skateparks/') || canonicalUrl.includes('/shop/') || canonicalUrl.includes('/guides/') || canonicalUrl.includes('/trainers/') || canonicalUrl.includes('/events/') || canonicalUrl.includes('/growth-lab/')) {
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
    ...(keywords !== undefined && keywords !== '' && {
      keywords: Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [keywords]),
    }),
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
      type: type === 'article' ? 'article' : 'website',
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
      type: 'article',
      publishedTime,
      modifiedTime,
      authors: author ? [author] : undefined,
    };
  }

  return metadata;
}

/** Skatepark-like object (from API or cache) for client-side meta derivation */
export type SkateparkMetaSource = {
  name: LocalizedField;
  address?: LocalizedField;
  notes?: string | { en?: string | string[]; he?: string | string[] };
  images?: Array<{ url: string; isFeatured?: boolean; orderNumber?: number }>;
  seoMetadata?: {
    description?: LocalizedField;
    ogImage?: string;
    keywords?: LocalizedField;
  };
};

/**
 * Derive meta title, description, image, keywords from skatepark data (client-safe).
 * Use when skatepark is loaded on the client so we can sync document head even if
 * server metadata wasn't applied (e.g. client-side nav without cache).
 */
export function getSkateparkMetaFromData(
  skatepark: SkateparkMetaSource,
  locale: string,
  slug: string
): { title: string; description: string; image: string; keywords?: string; url: string } {
  const name = getLocalizedText(skatepark.name, locale);
  const address = getLocalizedText(skatepark.address ?? { en: '', he: '' }, locale);
  const seo = skatepark.seoMetadata;

  const descField = seo?.description;
  const seoDescription = descField && typeof descField === 'object' && (descField.en || descField.he)
    ? getLocalizedText(descField, locale).trim()
    : '';
  let notesText = '';
  if (skatepark.notes) {
    if (typeof skatepark.notes === 'string') {
      notesText = skatepark.notes;
    } else if (typeof skatepark.notes === 'object') {
      const localeNotes = (skatepark.notes as any)[locale] ?? (skatepark.notes as any).en ?? (skatepark.notes as any).he;
      if (Array.isArray(localeNotes)) {
        notesText = localeNotes.join(' ');
      } else if (typeof localeNotes === 'string') {
        notesText = localeNotes;
      }
    }
  }
  const fallbackDescription = locale === 'he'
    ? `בקר ב${name} - ${address}. בדוק שעות פעילות, שירותים וביקורות ב-ENBOSS.`
    : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
  const description = seoDescription
    ? seoDescription.substring(0, 160)
    : (notesText && notesText.trim()
        ? notesText.substring(0, 160)
        : fallbackDescription);

  let image = '/og-skatepark-default.jpg';
  if (seo?.ogImage && seo.ogImage.trim()) {
    image = seo.ogImage;
  } else if (skatepark.images && skatepark.images.length > 0) {
    image = skatepark.images[0]?.url ?? '/og-skatepark-default.jpg';
  }

  const title = locale === 'he'
    ? `סקייטפארק ${name} | אנבוס`
    : `${name} Skatepark | ENBOSS`;

  const keywordsField = seo?.keywords;
  const keywords = keywordsField && typeof keywordsField === 'object' && (keywordsField.en || keywordsField.he)
    ? getLocalizedText(keywordsField, locale).trim()
    : undefined;

  const url = `/${locale}/skateparks/${slug}`;
  return { title, description, image, keywords, url };
}

/** Guide-like object (from API or cache) for client-side meta derivation */
export type GuideMetaSource = {
  title: LocalizedField;
  description?: LocalizedField;
  coverImage?: string;
  metaImage?: string;
  metaTitle?: LocalizedField;
  metaDescription?: LocalizedField;
  authorName?: string;
};

/**
 * Derive meta title, description, image, url from guide data (client-safe).
 * Use when guide is loaded on the client so we can sync document head even if
 * server metadata wasn't applied (e.g. client-side nav without cache).
 */
export function getGuideMetaFromData(
  guide: GuideMetaSource,
  locale: string,
  slug: string
): { title: string; description: string; image: string; url: string } {
  const metaTitle = guide.metaTitle && (getLocalizedText(guide.metaTitle, locale).trim());
  const title = metaTitle
    ? metaTitle
    : locale === 'he'
      ? `${getLocalizedText(guide.title, locale)} | אנבוס`
      : `${getLocalizedText(guide.title, locale)} | ENBOSS`;

  const metaDesc = guide.metaDescription && getLocalizedText(guide.metaDescription, locale).trim();
  const descFromGuide = guide.description ? getLocalizedText(guide.description, locale) : '';
  const description = (metaDesc || descFromGuide || `Read ${getLocalizedText(guide.title, locale)} on ENBOSS.`).substring(0, 160);

  const image =
    guide.metaImage && String(guide.metaImage).trim()
      ? guide.metaImage
      : (guide.coverImage || '/og-guide-default.jpg');

  const url = `/${locale}/guides/${slug}`;
  return { title, description, image, url };
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
  const { title, description, startDate, endDate, location, image, price, currency = 'ILS', slug: _slug, locale, siteUrl } = event;

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
  const { title, description, coverImage, authorName, publishedAt, modifiedAt, rating, ratingCount, slug: _slug, locale, siteUrl } = guide;

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


