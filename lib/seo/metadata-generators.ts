import { Metadata } from 'next';
import { generateMetadata as genMeta, getLocalizedText } from './utils';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';

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
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  
  try {
    // Try fetching directly from database first (more reliable during build)
    await connectDB();
    
    const skatepark = await Skatepark.findOne({ 
      slug: slug.toLowerCase(), 
      status: 'active' 
    }).lean();
    
    if (!skatepark) {
      // If database fetch fails, try API as fallback
      try {
        const res = await fetch(`${siteUrl}/api/skateparks/${slug}`, { 
          next: { revalidate: 3600 },
          cache: 'force-cache'
        });
        
        if (res.ok) {
          const { skatepark: apiSkatepark } = await res.json();
          if (apiSkatepark) {
            const name = getLocalizedText(apiSkatepark.name, locale);
            const address = getLocalizedText(apiSkatepark.address, locale);
            
            const seoDescription = apiSkatepark.seoMetadata?.description
              ? getLocalizedText(apiSkatepark.seoMetadata.description, locale)
              : apiSkatepark.notes 
              ? getLocalizedText(apiSkatepark.notes, locale).substring(0, 160)
              : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
            
            const image = apiSkatepark.seoMetadata?.ogImage 
              ? (apiSkatepark.seoMetadata.ogImage.startsWith('http') ? apiSkatepark.seoMetadata.ogImage : `${siteUrl}${apiSkatepark.seoMetadata.ogImage}`)
              : apiSkatepark.images?.[0]?.url || '/og-skatepark-default.jpg';
            
            const keywords = apiSkatepark.seoMetadata?.keywords
              ? getLocalizedText(apiSkatepark.seoMetadata.keywords, locale)
              : undefined;

            // Build locale-specific title
            const title = locale === 'he' 
              ? `סקייטפארק ${name} | ENBOSS`
              : `${name} Skatepark | ENBOSS`;

            const metadata = genMeta({
              title,
              description: seoDescription,
              image,
              url: `/skateparks/${slug}`,
              locale,
              alternateLocales: locale === 'en' ? ['he'] : ['en'],
            });

            if (keywords) {
              metadata.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
            }

            return metadata;
          }
        }
      } catch (apiError) {
        console.error('API fallback also failed:', apiError);
      }
      
      return genMeta({
        title: 'Skatepark Not Found',
        description: 'The skatepark you are looking for could not be found.',
        locale,
      });
    }

    // Process skatepark data from database
    const name = getLocalizedText(skatepark.name, locale);
    const address = getLocalizedText(skatepark.address, locale);
    
    // Use SEO metadata from model if available, otherwise fallback to notes or default
    const seoDescription = skatepark.seoMetadata?.description
      ? getLocalizedText(skatepark.seoMetadata.description, locale)
      : skatepark.notes 
      ? (Array.isArray(skatepark.notes[locale as keyof typeof skatepark.notes]) 
          ? (skatepark.notes[locale as keyof typeof skatepark.notes] as string[]).join(' ').substring(0, 160)
          : getLocalizedText(skatepark.notes as any, locale).substring(0, 160))
      : `Visit ${name} - ${address}. Check hours, amenities, and reviews on ENBOSS.`;
    
    // Use OG image from SEO metadata if available, otherwise use first image or default
    const images = skatepark.images || [];
    const sortedImages = images.sort((a: any, b: any) => a.orderNumber - b.orderNumber);
    const firstImage = sortedImages.find((img: any) => img.isFeatured) || sortedImages[0];
    
    const image = skatepark.seoMetadata?.ogImage 
      ? (skatepark.seoMetadata.ogImage.startsWith('http') ? skatepark.seoMetadata.ogImage : `${siteUrl}${skatepark.seoMetadata.ogImage}`)
      : firstImage?.url || '/og-skatepark-default.jpg';
    
    // Get keywords from SEO metadata if available
    const keywords = skatepark.seoMetadata?.keywords
      ? getLocalizedText(skatepark.seoMetadata.keywords, locale)
      : undefined;

    // Build locale-specific title
    const title = locale === 'he' 
      ? `סקייטפארק ${name} | ENBOSS`
      : `${name} Skatepark | ENBOSS`;

    const metadata = genMeta({
      title,
      description: seoDescription,
      image,
      url: `/skateparks/${slug}`,
      locale,
      alternateLocales: locale === 'en' ? ['he'] : ['en'],
    });

    // Add keywords if available
    if (keywords) {
      metadata.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
    }

    return metadata;
  } catch (error) {
    // If both database and API fetch fail, return a basic metadata
    console.error('Error generating skatepark metadata:', error);
    return genMeta({
      title: 'Skatepark Guide',
      description: 'Find the best skateparks in Israel. Check hours, amenities, and reviews on ENBOSS.',
      locale,
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


