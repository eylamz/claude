// lib/seo/metadata-generators.ts

import { Metadata } from 'next';
import {
  generateMetadata as genMeta,
  getLocalizedText,
  getMetaTitleWithFallback,
  DEFAULT_META_TITLE,
  DEFAULT_OG_IMAGE,
  PRIMARY_OG_IMAGE,
  EVENTS_OG_IMAGE,
  EVENTS_OG_IMAGE_FALLBACK,
  GUIDES_OG_IMAGE,
  getSiteUrl,
} from './utils';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Guide from '@/lib/models/Guide';
import Form from '@/lib/models/Form';
import Event from '@/lib/models/Event';
import { formatEventForDetail } from '@/lib/events/formatEvent';

// Example metadata generators for different page types

export async function generateProductMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  // Fetch product data (use getSiteUrl() so fetches hit the same origin on droplet)
  const siteUrl = await getSiteUrl();
  const res = await fetch(`${siteUrl}/api/products/${slug}?locale=${locale}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return genMeta({
      title: 'Product Not Found',
      description: 'The product you are looking for could not be found.',
      locale,
    });
  }

  const { product } = await res.json();
  const title = getLocalizedText(product.name, locale);
  const description = product.description
    ? getLocalizedText(product.description, locale).substring(0, 160)
    : `Shop ${title} at ENBOSS. High-quality products for extreme sports enthusiasts.`;

  const image = product.images?.[0]?.url || '/og-product-default.jpg';
  const price = product.discountPrice || product.price;

  return genMeta({
    title: `${title} - ₪${price.toFixed(2)}`,
    description: `${description} Price: ₪${price.toFixed(2)}. ${product.totalStock > 0 ? 'In Stock' : 'Out of Stock'}.`,
    image,
    url: `/${locale}/shop/product/${slug}`,
    type: 'product',
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateSkateparkMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  try {
    await connectDB();

    // Try to find active skatepark first
    let skatepark = await Skatepark.findOne({
      slug: slug.toLowerCase(),
      status: 'active',
    }).lean();

    // If not found, try inactive parks (for closed parks that should still be accessible)
    if (!skatepark) {
      skatepark = await Skatepark.findOne({
        slug: slug.toLowerCase(),
        status: 'inactive',
      }).lean();
    }

    if (!skatepark) {
      const notFoundTitle = locale === 'he' ? 'סקייטפארק לא נמצא' : 'Skatepark Not Found';
      const notFoundDesc =
        locale === 'he'
          ? 'הסקייטפארק שחיפשת לא נמצא.'
          : 'The skatepark you are looking for could not be found.';

      return genMeta({
        title: notFoundTitle,
        description: notFoundDesc,
        locale,
      });
    }

    const name = getLocalizedText(skatepark.name, locale);
    const address = getLocalizedText(skatepark.address, locale);
    const seo = (skatepark as any).seoMetadata;

    // Meta description: prefer seoMetadata.description, then notes, then fallback
    const seoDescription =
      seo?.description && (seo.description.en || seo.description.he)
        ? getLocalizedText(seo.description, locale).trim()
        : '';
    let notesText = '';
    if (skatepark.notes) {
      if (typeof skatepark.notes === 'string') {
        notesText = skatepark.notes;
      } else if (typeof skatepark.notes === 'object') {
        const localeNotes =
          (skatepark.notes as any)[locale] ||
          (skatepark.notes as any).en ||
          (skatepark.notes as any).he;
        if (Array.isArray(localeNotes)) {
          notesText = localeNotes.join(' ');
        } else if (typeof localeNotes === 'string') {
          notesText = localeNotes;
        }
      }
    }
    const fallbackDescription =
      locale === 'he'
        ? `בקר ב${name} - ${address}. בדוק שעות פעילות, שירותים וחוות דעת באנבוס.`
        : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
    const description = seoDescription
      ? seoDescription.substring(0, 160)
      : notesText && notesText.trim()
        ? notesText.substring(0, 160)
        : fallbackDescription;

    // OG image: seoMetadata.ogImage → skatepark.images[0] → PRIMARY_OG_IMAGE → DEFAULT_OG_IMAGE
    let image = (seo?.ogImage && seo.ogImage.trim()) ? seo.ogImage.trim() : undefined;
    if (!image && skatepark.images && Array.isArray(skatepark.images) && skatepark.images.length > 0) {
      image = skatepark.images[0]?.url;
    }
    const finalImage = (image && image.trim()) || PRIMARY_OG_IMAGE;

    // Localized title format (Skatepark has no metaTitle; use name + brand)
    const title = locale === 'he' ? `סקייטפארק ${name} | אנבוס` : `${name} Skatepark | ENBOSS`;

    // Keywords from seoMetadata.keywords (localized)
    const keywords =
      seo?.keywords && (seo.keywords.en || seo.keywords.he)
        ? getLocalizedText(seo.keywords, locale).trim()
        : undefined;

    // Article meta for LinkedIn/social: author ENBOSS, publish date = updatedAt
    const updatedAt = (skatepark as any).updatedAt;
    const publishedTime = updatedAt ? new Date(updatedAt).toISOString() : undefined;

    return genMeta({
      title,
      description,
      image: finalImage,
      images: [
        { url: finalImage },
        { url: PRIMARY_OG_IMAGE },
        { url: DEFAULT_OG_IMAGE },
      ],
      url: `/${locale}/skateparks/${slug}`,
      type: 'article',
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
      keywords,
      author: 'ENBOSS',
      publishedTime,
      modifiedTime: publishedTime,
    });
  } catch (error) {
    console.error('Error generating skatepark metadata:', error);
    const notFoundTitle = locale === 'he' ? 'סקייטפארק לא נמצא' : 'Skatepark Not Found';
    const notFoundDesc =
      locale === 'he'
        ? 'הסקייטפארק שחיפשת לא נמצא.'
        : 'The skatepark you are looking for could not be found.';

    return genMeta({
      title: notFoundTitle,
      description: notFoundDesc,
      locale,
    });
  }
}

export async function generateSkateparksListingMetadata(params: {
  locale: string;
}): Promise<Metadata> {
  const { locale } = params;

  try {
    await connectDB();
    await Skatepark.countDocuments({ status: 'active' });
  } catch (error) {
    console.warn('Failed to fetch skateparks count for metadata', error);
  }

  // Localized titles and descriptions
  const title = locale === 'he' ? 'סקייטפארקים בישראל | אנבוס' : 'Skateparks in Israel | ENBOSS';

  const description =
    locale === 'he'
      ? `גלה סקייטפארקים בישראל. מצא פארקים קרובים, בדוק שעות פעילות, שירותים וחוות דעת. הצטרף לקהילת הרוכבים הגדולה בישראל.`
      : `Discover skateparks across Israel. Find nearby parks, check hours, amenities, and reviews. Join Israel's largest skating community.`;

  return genMeta({
    title,
    description,
    image: DEFAULT_OG_IMAGE,
    url: `/${locale}/skateparks`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateEventsListingMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;

  try {
    await connectDB();
    await Event.countDocuments({ status: 'published' });
  } catch (error) {
    console.warn('Failed to fetch events count for metadata', error);
  }

  const title = locale === 'he' ? 'אירועים | אנבוס' : 'Events | ENBOSS';

  const description =
    locale === 'he'
      ? `גלה אירועי ספורט אקסטרים בישראל. אירועים קרובים, רישום והצטרפות. הצטרפו לחוויה.`
      : `Discover extreme sports events in Israel. Upcoming events, registration, and join the experience.`;

  return genMeta({
    title,
    description,
    image: EVENTS_OG_IMAGE,
    images: [
      { url: EVENTS_OG_IMAGE },
      { url: EVENTS_OG_IMAGE_FALLBACK },
      { url: PRIMARY_OG_IMAGE },
      { url: DEFAULT_OG_IMAGE },
    ],
    url: `/${locale}/events`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateGuidesListingMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;

  try {
    await connectDB();

    try {
      await Guide.countDocuments({ status: 'published' });
    } catch (error) {
      console.warn('Failed to fetch guides count for metadata', error);
    }

    // Localized titles and descriptions
    const title = locale === 'he' ? 'מדריכים | אנבוס' : 'Guides | ENBOSS';

    const description =
      locale === 'he'
        ? `גלה מדריכים מקצועיים לספורט אקסטרים על גלגלים. למד טריקים חדשים, טכניקות מתקדמות וטיפים ממומחים. שפר את הכישורים שלך עם המדריכים הטובים ביותר.`
        : `Discover professional guides for extreme sports on wheels. Learn new tricks, advanced techniques, and expert tips. Improve your skills with the best guides.`;

    return genMeta({
      title,
      description,
      image: GUIDES_OG_IMAGE,
      images: [
        { url: GUIDES_OG_IMAGE },
        { url: PRIMARY_OG_IMAGE },
        { url: DEFAULT_OG_IMAGE },
      ],
      url: `/${locale}/guides`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  } catch (error) {
    console.error('Error generating guides listing metadata:', error);
    // Fallback metadata
    const title = locale === 'he' ? 'מדריכים | אנבוס' : 'Guides | ENBOSS';
    const description =
      locale === 'he'
        ? 'מדריכים מקצועיים לספורט אקסטרים על גלגלים.'
        : 'Professional guides for extreme sports on wheels.';

    return genMeta({
      title,
      description,
      url: `/${locale}/guides`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  }
}

export async function generateEventMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  try {
    await connectDB();

    const eventDoc = await Event.findOne({
      slug: slug.toLowerCase(),
      status: 'published',
    }).lean();

    if (!eventDoc) {
      return genMeta({
        title: 'Event Not Found',
        description: 'The event you are looking for could not be found.',
        locale,
      });
    }

    const event = formatEventForDetail(eventDoc, { incrementView: false }) as any;

    const titleFromContent = event.content?.[locale]?.title ?? event.content?.en?.title ?? '';
    const descriptionFromContent =
      event.content?.[locale]?.description ?? event.content?.en?.description ?? '';
    const fallbackDescription = descriptionFromContent
      ? descriptionFromContent.substring(0, 160)
      : `Join us at ${titleFromContent}. Event details, location, and registration on ENBOSS.`;

    // Meta title fallback: locale metaTitle → English metaTitle → layout default (DEFAULT_META_TITLE)
    const metaTitleResolved = getMetaTitleWithFallback(event.metaTitle, locale);
    const contentTitleFallback = event.dateTime?.startDate
      ? `${titleFromContent} - ${new Date(event.dateTime.startDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US')}`
      : titleFromContent;
    const titleBase =
      (metaTitleResolved !== DEFAULT_META_TITLE ? metaTitleResolved : null) ||
      contentTitleFallback ||
      DEFAULT_META_TITLE;
    const brand = locale === 'he' ? 'אנבוס' : 'ENBOSS';
    const title = titleBase === DEFAULT_META_TITLE ? DEFAULT_META_TITLE : `${brand} | ${titleBase}`;
    const metaDescription =
      event.metaDescription && (event.metaDescription.en || event.metaDescription.he)
        ? getLocalizedText(event.metaDescription, locale)
        : undefined;
    const description =
      metaDescription ||
      (() => {
        const eventDate = event.dateTime?.startDate
          ? new Date(event.dateTime.startDate).toLocaleDateString(
              locale === 'he' ? 'he-IL' : 'en-US'
            )
          : '';
        const locationName = event.location?.name
          ? getLocalizedText(event.location.name, locale)
          : '';
        return `${fallbackDescription}${eventDate ? ` Date: ${eventDate}.` : ''}${locationName ? ` Location: ${locationName}.` : ''} ${event.isFree !== false ? 'Free event' : event.price ? `Price: ₪${event.price}` : ''}`.trim();
      })();

    const image =
      (event.ogImage && String(event.ogImage).trim())
        ? String(event.ogImage).trim()
        : event.featuredImage?.url ||
          (typeof event.featuredImage === 'string' ? event.featuredImage : '') ||
          event.images?.[0]?.url ||
          '/og-event-default.jpg';

    const baseMeta = await genMeta({
      title,
      description,
      image,
      url: `/${locale}/events/${slug}`,
      type: 'article',
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
      publishedTime: event.createdAt,
      modifiedTime: event.updatedAt,
    });

    const keywords =
      event.metaKeywords && (event.metaKeywords.en || event.metaKeywords.he)
        ? getLocalizedText(event.metaKeywords, locale)
        : undefined;
    if (keywords) {
      baseMeta.keywords = keywords;
    }
    return baseMeta;
  } catch (error) {
    console.error('Error generating event metadata:', error);
    return genMeta({
      title: 'Event Not Found',
      description: 'The event you are looking for could not be found.',
      locale,
    });
  }
}

export async function generateGuideMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  try {
    await connectDB();

    const guide = await Guide.findOne({
      slug: slug.toLowerCase(),
      status: 'published',
    })
      .select(
        'title description coverImage metaImage authorName publishedAt updatedAt'
      )
      .lean();

    if (!guide) {
      return genMeta({
        title: 'Guide Not Found',
        description: 'The guide you are looking for could not be found.',
        locale,
      });
    }

    const title = getLocalizedText(guide.title, locale);
    const description = guide.description
      ? getLocalizedText(guide.description, locale).substring(0, 160)
      : `Read ${title} on ENBOSS. Expert guides and tutorials for extreme sports.`;

    const image =
      guide.metaImage && String(guide.metaImage).trim()
        ? guide.metaImage
        : (guide.coverImage || '/og-guide-default.jpg');
    const author = guide.authorName ? ` by ${guide.authorName}` : '';

    return genMeta({
      title: `${title}${author}`,
      description,
      image,
      url: `/${locale}/guides/${slug}`,
      type: 'article',
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
      publishedTime: guide.publishedAt
        ? new Date(guide.publishedAt).toISOString()
        : undefined,
      modifiedTime: guide.updatedAt
        ? new Date(guide.updatedAt).toISOString()
        : undefined,
      author: guide.authorName,
    });
  } catch (error) {
    console.error('Error generating guide metadata:', error);
    return genMeta({
      title: 'Guide Not Found',
      description: 'The guide you are looking for could not be found.',
      locale,
    });
  }
}

export async function generateFormMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  try {
    await connectDB();

    const form = await Form.findBySlug(slug);

    if (!form || !form.isVisible()) {
      return genMeta({
        title: locale === 'en' ? 'Survey Not Found' : 'סקר לא נמצא',
        description:
          locale === 'en'
            ? 'The survey you are looking for could not be found.'
            : 'הסקר שחיפשת לא נמצא.',
        locale,
      });
    }

    const title = getLocalizedText(form.title, locale);
    const description = form.description
      ? getLocalizedText(form.description, locale).substring(0, 160)
      : locale === 'en'
        ? `Fill out ${title} on ENBOSS. Help us grow by sharing your thoughts.`
        : `מלא את ${title} באנבוס. עזור לנו לגדול על ידי שיתוף המחשבות שלך.`;

    const metaTitle = form.metaTitle
      ? getLocalizedText(form.metaTitle, locale)
      : `${title} - Growth Lab | ENBOSS`;
    const metaDescription = form.metaDescription
      ? getLocalizedText(form.metaDescription, locale)
      : description;

    return genMeta({
      title: metaTitle,
      description: metaDescription,
      image: DEFAULT_OG_IMAGE,
      url: `/${locale}/growth-lab/${slug}`,
      type: 'website',
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  } catch (error) {
    console.error('Error generating form metadata:', error);
    return genMeta({
      title: locale === 'en' ? 'Form' : 'טופס',
      description:
        locale === 'en'
          ? 'Fill out forms on ENBOSS Growth Lab. Help us grow by sharing your thoughts and experiences.'
          : 'מלא טפסים באנבוס מרחב גדילה. עזור לנו לגדול על ידי שיתוף המחשבות והחוויות שלך.',
      locale,
    });
  }
}

export async function generateGrowthLabListingMetadata(params: {
  locale: string;
}): Promise<Metadata> {
  const { locale } = params;

  try {
    await connectDB();
    await Form.countDocuments({ status: 'published' });
  } catch (error) {
    console.warn('Failed to fetch forms count for metadata', error);
  }

  const title = locale === 'he' ? 'מרחב גדילה | אנבוס' : 'Growth Lab | ENBOSS';

  const description =
    locale === 'he'
      ? `סקרים קטנים, שינויים גדולים. טפסים להעלאת משוב ועזרה להרחבת הקהילה.`
      : `Your feedback matters. Small surveys, big changes! Share your thoughts and help the community grow.`;

  return genMeta({
    title,
    description,
    image: DEFAULT_OG_IMAGE,
    url: `/${locale}/growth-lab`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateTrainerMetadata(params: {
  slug: string;
  locale: string;
}): Promise<Metadata> {
  const { slug, locale } = params;

  const siteUrl = await getSiteUrl();
  const res = await fetch(`${siteUrl}/api/trainers/${slug}?locale=${locale}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return genMeta({
      title: 'Trainer Not Found',
      description: 'The trainer profile you are looking for could not be found.',
      locale,
    });
  }

  const { trainer } = await res.json();
  const name = getLocalizedText(trainer.name, locale);
  const description = trainer.bio
    ? getLocalizedText(trainer.bio, locale).substring(0, 160)
    : `Connect with ${name}, professional trainer. View profile, sports expertise, and contact information on ENBOSS.`;

  const image = trainer.profileImage || '/og-trainer-default.jpg';
  const rating = trainer.rating > 0 ? ` ⭐ ${trainer.rating.toFixed(1)}` : '';
  const sports = trainer.relatedSports?.slice(0, 2).join(', ') || '';

  return genMeta({
    title: `${name}${rating} - Professional Trainer`,
    description: `${description}${sports ? ` Specializes in: ${sports}.` : ''}`,
    image,
    url: `/${locale}/trainers/${slug}`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateLoginMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;

  // Localized titles and descriptions
  const title = locale === 'he' ? 'התחברות | אנבוס' : 'Sign In | ENBOSS';

  const description =
    locale === 'he'
      ? 'התחבר לחשבון שלך באנבוס. גש לסקייטפארקים, מדריכים, אירועים ועוד. הצטרף לקהילת הרוכבים הגדולה בישראל.'
      : "Sign in to your ENBOSS account. Access skateparks, guides, events, and more. Join Israel's largest skating community.";

  return genMeta({
    title,
    description,
    image: '/og-default.jpg',
    url: `/${locale}/login`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateRegisterMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;

  // Localized titles and descriptions
  const title = locale === 'he' ? 'הרשמה | אנבוס' : 'Sign Up | ENBOSS';

  const description =
    locale === 'he'
      ? 'צור חשבון חדש באנבוס והצטרף לקהילת הרוכבים הגדולה בישראל. גש לסקייטפארקים, מדריכים, אירועים ועוד.'
      : "Create a new account on ENBOSS and join Israel's largest skating community. Access skateparks, guides, events, and more.";

  return genMeta({
    title,
    description,
    image: '/og-default.jpg',
    url: `/${locale}/register`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateContactMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;

  // Localized titles and descriptions
  const title = locale === 'he' ? 'צור קשר | אנבוס' : 'Contact Us | ENBOSS';

  const description =
    locale === 'he'
      ? 'צור קשר עם אנבוס. שלח לנו הודעה ונשמח לעזור לך. שאלות, הצעות או בקשות - אנחנו כאן בשבילך.'
      : "Contact ENBOSS. Send us a message and we'd be happy to help. Questions, suggestions, or requests - we're here for you.";

  return genMeta({
    title,
    description,
    image: '/og-default.jpg',
    url: `/${locale}/contact`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}
