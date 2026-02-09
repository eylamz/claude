import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/account/',
          '/_next/',
          '/checkout/',
          '/cart',
        ],
      },
      {
        userAgent: '*',
        allow: ['/api/skateparks', '/api/events', '/api/products'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}


