import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';

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
        allow: '/api/skateparks',
        allow: '/api/events',
        allow: '/api/products',
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}


