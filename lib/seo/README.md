# SEO Utilities

Comprehensive SEO implementation for ENBOSS platform including metadata generation, structured data, sitemaps, and robots.txt.

## Features

1. **Metadata Generation** - Automatic Open Graph, Twitter Cards, and canonical URLs
2. **Structured Data** - JSON-LD schemas for products, events, articles, and local businesses
3. **Dynamic Sitemap** - Multi-language sitemap with priority and change frequency
4. **Robots.txt** - Search engine crawling configuration

## Usage

### Metadata Generation

```typescript
import { generateProductMetadata } from '@/lib/seo';

// In your page component
export async function generateMetadata({ params }: { params: { slug: string; locale: string } }) {
  return generateProductMetadata(params);
}
```

### Structured Data

```typescript
import { StructuredData, generateProductStructuredData } from '@/lib/seo';

export default function ProductPage({ product, locale }) {
  const structuredData = generateProductStructuredData({
    name: product.name,
    price: product.price,
    images: product.images,
    slug: product.slug,
    locale,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co',
    availability: product.totalStock > 0 ? 'InStock' : 'OutOfStock',
  });

  return (
    <>
      <StructuredData data={structuredData} />
      {/* Your page content */}
    </>
  );
}
```

### Available Generators

- `generateProductMetadata` - For product pages
- `generateSkateparkMetadata` - For skatepark pages
- `generateEventMetadata` - For event pages
- `generateGuideMetadata` - For guide/article pages
- `generateTrainerMetadata` - For trainer profile pages

### Structured Data Types

- `generateProductStructuredData` - Product schema with price, availability, reviews
- `generateLocalBusinessStructuredData` - LocalBusiness schema for skateparks
- `generateEventStructuredData` - Event schema with dates and location
- `generateArticleStructuredData` - Article schema for guides
- `generateBreadcrumbStructuredData` - Breadcrumb navigation

## Sitemap

The sitemap is automatically generated at `/sitemap.xml` and includes:
- All static pages (home, shop, skateparks, events, guides, trainers)
- Dynamic product pages
- Dynamic skatepark pages
- Recent events (last 30 days)
- Published guides
- Active trainers

## Robots.txt

Configured at `/robots.txt`:
- Allows all crawlers on public pages
- Blocks admin, account, API, and checkout pages
- Points to sitemap location

## Environment Variables

```env
NEXT_PUBLIC_SITE_URL=https://enboss.co
```

**Production (e.g. droplet/VPS):** Set `NEXT_PUBLIC_SITE_URL` to your public URL so og:image, canonical URLs, and sitemap use absolute URLs. If this is not set, the metadata layer will try to derive the base URL from the request (`Host` / `X-Forwarded-Host` and `X-Forwarded-Proto`), so metadata can still work behind a reverse proxy.

## Implementation Examples

See page implementations in:
- `app/[locale]/(public)/shop/product/[slug]/page.tsx`
- `app/[locale]/(public)/skateparks/[slug]/page.tsx`
- `app/[locale]/(public)/events/[slug]/page.tsx`
- `app/[locale]/(public)/guides/[slug]/page.tsx`
- `app/[locale]/(public)/trainers/[slug]/page.tsx`


