import { Metadata } from 'next';
import { generateMetadata as genMeta, getLocalizedText } from './utils';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Guide from '@/lib/models/Guide';

// Example metadata generators for different page types

export async function generateProductMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  // Fetch product data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const res = await fetch(`${siteUrl}/api/products/${slug}?locale=${locale}`, { next: { revalidate: 3600 } });
  
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

export async function generateSkateparkMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  try {
    await connectDB();
    
    // Try to find active skatepark first
    let skatepark = await Skatepark.findOne({ 
      slug: slug.toLowerCase(), 
      status: 'active' 
    }).lean();
    
    // If not found, try inactive parks (for closed parks that should still be accessible)
    if (!skatepark) {
      skatepark = await Skatepark.findOne({ 
        slug: slug.toLowerCase(), 
        status: 'inactive' 
      }).lean();
    }
    
    if (!skatepark) {
      const notFoundTitle = locale === 'he' 
        ? 'סקייטפארק לא נמצא'
        : 'Skatepark Not Found';
      const notFoundDesc = locale === 'he'
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
    
    // Handle notes - can be string array or object with en/he
    let notesText = '';
    if (skatepark.notes) {
      if (typeof skatepark.notes === 'string') {
        notesText = skatepark.notes;
      } else if (typeof skatepark.notes === 'object') {
        const localeNotes = (skatepark.notes as any)[locale] || (skatepark.notes as any).en || (skatepark.notes as any).he;
        if (Array.isArray(localeNotes)) {
          notesText = localeNotes.join(' ');
        } else if (typeof localeNotes === 'string') {
          notesText = localeNotes;
        }
      }
    }
    
    // Localized fallback description
    const fallbackDescription = locale === 'he'
      ? `בקר ב${name} - ${address}. בדוק שעות פעילות, שירותים וביקורות ב-ENBOSS.`
      : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
    
    const description = notesText && notesText.trim()
      ? notesText.substring(0, 160)
      : fallbackDescription;
    
    // Get first image (sorted by orderNumber or isFeatured)
    let image = '/og-skatepark-default.jpg';
    if (skatepark.images && Array.isArray(skatepark.images) && skatepark.images.length > 0) {
      const featuredImg = skatepark.images.find((img: any) => img.isFeatured);
      if (featuredImg) {
        image = featuredImg.url;
      } else {
        const sortedImages = [...skatepark.images].sort((a: any, b: any) => 
          (a.orderNumber || 0) - (b.orderNumber || 0)
        );
        image = sortedImages[0]?.url || '/og-skatepark-default.jpg';
      }
    }
    
    // Localized title format
    // English: "Netanya Skatepark | ENBOSS"
    // Hebrew: "סקייטפארק נתניה | אנבוס"
    const title = locale === 'he' 
      ? `סקייטפארק ${name} | אנבוס`
      : `${name} Skatepark | ENBOSS`;

    return genMeta({
      title,
      description,
      image,
      url: `/${locale}/skateparks/${slug}`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  } catch (error) {
    console.error('Error generating skatepark metadata:', error);
    const notFoundTitle = locale === 'he' 
      ? 'סקייטפארק לא נמצא'
      : 'Skatepark Not Found';
    const notFoundDesc = locale === 'he'
      ? 'הסקייטפארק שחיפשת לא נמצא.'
      : 'The skatepark you are looking for could not be found.';
    
    return genMeta({
      title: notFoundTitle,
      description: notFoundDesc,
      locale,
    });
  }
}

export async function generateSkateparksListingMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  
  // Fetch skateparks count (lightweight request)
  let parksCount = 0;
  try {
    const res = await fetch(`${siteUrl}/api/skateparks`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      parksCount = data.skateparks?.length || 0;
    }
  } catch (error) {
    console.warn('Failed to fetch skateparks count for metadata', error);
  }

  // Localized titles and descriptions
  const title = locale === 'he' 
    ? 'סקייטפארקים בישראל | ENBOSS'
    : 'Skateparks in Israel | ENBOSS';
  
  const description = locale === 'he'
    ? `גלה ${parksCount > 0 ? `${parksCount} ` : ''}סקייטפארקים בישראל. מצא פארקים קרובים, בדוק שעות פעילות, שירותים וביקורות. הצטרף לקהילת הרוכבים הגדולה בישראל.`
    : `Discover ${parksCount > 0 ? `${parksCount} ` : ''}skateparks across Israel. Find nearby parks, check hours, amenities, and reviews. Join Israel's largest skating community.`;

  return genMeta({
    title,
    description,
    image: '/og-skatepark-default.jpg',
    url: `/${locale}/skateparks`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateGuidesListingMetadata(params: { locale: string }): Promise<Metadata> {
  const { locale } = params;
  
  try {
    await connectDB();
    
    // Fetch guides count directly from database
    let guidesCount = 0;
    try {
      guidesCount = await Guide.countDocuments({ status: 'published' });
    } catch (error) {
      console.warn('Failed to fetch guides count for metadata', error);
    }

    // Localized titles and descriptions
    const title = locale === 'he' 
      ? 'מדריכים | אנבוס'
      : 'Guides | ENBOSS';
    
    const description = locale === 'he'
      ? `גלה ${guidesCount > 0 ? `${guidesCount} ` : ''}מדריכים מקצועיים לספורט אקסטרים. למד טריקים חדשים, טכניקות מתקדמות וטיפים ממומחים. שפר את הכישורים שלך עם המדריכים הטובים ביותר בישראל.`
      : `Discover ${guidesCount > 0 ? `${guidesCount} ` : ''}professional guides for extreme sports. Learn new tricks, advanced techniques, and expert tips. Improve your skills with the best guides in Israel.`;

    return genMeta({
      title,
      description,
      image: '/og-guide-default.jpg',
      url: `/${locale}/guides`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  } catch (error) {
    console.error('Error generating guides listing metadata:', error);
    // Fallback metadata
    const title = locale === 'he' ? 'מדריכים | אנבוס' : 'Guides | ENBOSS';
    const description = locale === 'he'
      ? 'מדריכים מקצועיים לספורט אקסטרים בישראל.'
      : 'Professional guides for extreme sports in Israel.';
    
    return genMeta({
      title,
      description,
      url: `/${locale}/guides`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });
  }
}

export async function generateEventMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const res = await fetch(`${siteUrl}/api/events/${slug}`, { next: { revalidate: 1800 } });
  
  if (!res.ok) {
    return genMeta({
      title: 'Event Not Found',
      description: 'The event you are looking for could not be found.',
      locale,
    });
  }

  const { event } = await res.json();
  const title = getLocalizedText(event.title, locale);
  const description = event.shortDescription || event.description
    ? getLocalizedText(event.shortDescription || event.description, locale).substring(0, 160)
    : `Join us at ${title}. Event details, location, and registration on ENBOSS.`;
  
  const image = event.featuredImage || event.images?.[0]?.url || '/og-event-default.jpg';
  const eventDate = new Date(event.startDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US');
  const locationName = event.location?.name ? getLocalizedText(event.location.name, locale) : '';

  return genMeta({
    title: `${title} - ${eventDate}`,
    description: `${description} Date: ${eventDate}.${locationName ? ` Location: ${locationName}.` : ''} ${event.isFree ? 'Free event' : `Price: ₪${event.price}`}.`,
    image,
    url: `/${locale}/events/${slug}`,
    type: 'article',
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
    publishedTime: event.createdAt,
    modifiedTime: event.updatedAt,
  });
}

export async function generateGuideMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const res = await fetch(`${siteUrl}/api/guides/${slug}?locale=${locale}`, { next: { revalidate: 3600 } });
  
  if (!res.ok) {
    return genMeta({
      title: 'Guide Not Found',
      description: 'The guide you are looking for could not be found.',
      locale,
    });
  }

  const { guide } = await res.json();
  const title = getLocalizedText(guide.title, locale);
  const description = guide.description
    ? getLocalizedText(guide.description, locale).substring(0, 160)
    : `Read ${title} on ENBOSS. Expert guides and tutorials for extreme sports.`;
  
  const image = guide.coverImage || '/og-guide-default.jpg';
  const readTime = guide.readTime ? ` ${guide.readTime} min read` : '';
  const author = guide.authorName ? ` by ${guide.authorName}` : '';

  return genMeta({
    title: `${title}${author}${readTime}`,
    description,
    image,
    url: `/${locale}/guides/${slug}`,
    type: 'article',
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
    publishedTime: guide.publishedAt,
    modifiedTime: guide.updatedAt,
    author: guide.authorName,
  });
}

export async function generateFormMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const res = await fetch(`${siteUrl}/api/forms/${slug}?locale=${locale}`, { next: { revalidate: 3600 } });
  
  if (!res.ok) {
    return genMeta({
      title: 'Form Not Found',
      description: 'The form you are looking for could not be found.',
      locale,
    });
  }

  const { form } = await res.json();
  const title = getLocalizedText(form.title, locale);
  const description = form.description
    ? getLocalizedText(form.description, locale).substring(0, 160)
    : `Fill out ${title} on ENBOSS. Help us grow by sharing your thoughts.`;
  
  const metaTitle = form.metaTitle
    ? getLocalizedText(form.metaTitle, locale)
    : `${title} - Growth Lab | ENBOSS`;
  const metaDescription = form.metaDescription
    ? getLocalizedText(form.metaDescription, locale)
    : description;

  return genMeta({
    title: metaTitle,
    description: metaDescription,
    image: '/og-form-default.jpg',
    url: `/${locale}/growth-labg}`,
    type: 'website',
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateTrainerMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const res = await fetch(`${siteUrl}/api/trainers/${slug}?locale=${locale}`, { next: { revalidate: 3600 } });
  
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
  const title = locale === 'he' 
    ? 'התחברות | אנבוס'
    : 'Sign In | ENBOSS';
  
  const description = locale === 'he'
    ? 'התחבר לחשבון שלך ב-ENBOSS. גש לסקייטפארקים, מדריכים, אירועים ועוד. הצטרף לקהילת הרוכבים הגדולה בישראל.'
    : 'Sign in to your ENBOSS account. Access skateparks, guides, events, and more. Join Israel\'s largest skating community.';

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
  const title = locale === 'he' 
    ? 'הרשמה | אנבוס'
    : 'Sign Up | ENBOSS';
  
  const description = locale === 'he'
    ? 'צור חשבון חדש ב-ENBOSS והצטרף לקהילת הרוכבים הגדולה בישראל. גש לסקייטפארקים, מדריכים, אירועים ועוד.'
    : 'Create a new account on ENBOSS and join Israel\'s largest skating community. Access skateparks, guides, events, and more.';

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
  const title = locale === 'he' 
    ? 'צור קשר | אנבוס'
    : 'Contact Us | ENBOSS';
  
  const description = locale === 'he'
    ? 'צור קשר עם ENBOSS. שלח לנו הודעה ונשמח לעזור לך. שאלות, הצעות או בקשות - אנחנו כאן בשבילך.'
    : 'Contact ENBOSS. Send us a message and we\'d be happy to help. Questions, suggestions, or requests - we\'re here for you.';

  return genMeta({
    title,
    description,
    image: '/og-default.jpg',
    url: `/${locale}/contact`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}


