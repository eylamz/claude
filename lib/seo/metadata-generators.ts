import { Metadata } from 'next';
import { generateMetadata as genMeta, getLocalizedText } from './utils';

// Example metadata generators for different page types

export async function generateProductMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  // Fetch product data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
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
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
  const res = await fetch(`${siteUrl}/api/skateparks/${slug}`, { next: { revalidate: 3600 } });
  
  if (!res.ok) {
    return genMeta({
      title: 'Skatepark Not Found',
      description: 'The skatepark you are looking for could not be found.',
      locale,
    });
  }

  const { skatepark } = await res.json();
  const name = getLocalizedText(skatepark.name, locale);
  const address = getLocalizedText(skatepark.address, locale);
  const description = skatepark.notes 
    ? getLocalizedText(skatepark.notes, locale).substring(0, 160)
    : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
  
  const image = skatepark.images?.[0]?.url || '/og-skatepark-default.jpg';
  const rating = skatepark.rating > 0 ? ` ⭐ ${skatepark.rating.toFixed(1)}` : '';

  return genMeta({
    title: `${name}${rating} - Skatepark Guide`,
    description,
    image,
    url: `/${locale}/skateparks/${slug}`,
    locale,
    alternateLocales: locale === 'en' ? ['he'] : ['en'],
  });
}

export async function generateEventMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
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
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
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

export async function generateTrainerMetadata(params: { slug: string; locale: string }): Promise<Metadata> {
  const { slug, locale } = params;
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
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


