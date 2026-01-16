import { MetadataRoute } from 'next';

const locales = ['en', 'he'];
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';

async function fetchProducts() {
  try {
    const res = await fetch(`${siteUrl}/api/products?limit=1000`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.products || [];
  } catch {
    return [];
  }
}

async function fetchSkateparks() {
  try {
    const res = await fetch(`${siteUrl}/api/skateparks`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.skateparks || [];
  } catch {
    return [];
  }
}

async function fetchEvents() {
  try {
    const res = await fetch(`${siteUrl}/api/events?limit=1000`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch {
    return [];
  }
}

async function fetchGuides() {
  try {
    const res = await fetch(`${siteUrl}/api/guides?limit=1000`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.guides || [];
  } catch {
    return [];
  }
}

async function fetchTrainers() {
  try {
    const res = await fetch(`${siteUrl}/api/trainers?limit=1000`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.trainers || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, skateparks, events, guides, trainers] = await Promise.all([
    fetchProducts(),
    fetchSkateparks(),
    fetchEvents(),
    fetchGuides(),
    fetchTrainers(),
  ]);

  const routes: MetadataRoute.Sitemap = [];

  // Static pages
  for (const locale of locales) {
    routes.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    });
    routes.push({
      url: `${siteUrl}/${locale}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    });
    routes.push({
      url: `${siteUrl}/${locale}/skateparks`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    });
    routes.push({
      url: `${siteUrl}/${locale}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    });
    routes.push({
      url: `${siteUrl}/${locale}/guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    routes.push({
      url: `${siteUrl}/${locale}/trainers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  }

  // Products
  for (const product of products) {
    if (product.status === 'active') {
      for (const locale of locales) {
        routes.push({
          url: `${siteUrl}/${locale}/shop/product/${product.slug}`,
          lastModified: product.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  }

  // Skateparks
  for (const park of skateparks) {
    for (const locale of locales) {
      routes.push({
        url: `${siteUrl}/${locale}/skateparks/${park.slug}`,
        lastModified: park.updatedAt || new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  // Events (only future/past 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  for (const event of events) {
    const eventDate = new Date(event.startDate || event.endDate);
    if (eventDate >= thirtyDaysAgo) {
      for (const locale of locales) {
        routes.push({
          url: `${siteUrl}/${locale}/events/${event.slug}`,
          lastModified: event.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  // Guides
  for (const guide of guides) {
    if (guide.status === 'published') {
      for (const locale of locales) {
        routes.push({
          url: `${siteUrl}/${locale}/guides/${guide.slug}`,
          lastModified: guide.updatedAt || guide.publishedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  }

  // Trainers
  for (const trainer of trainers) {
    if (trainer.status === 'active') {
      for (const locale of locales) {
        routes.push({
          url: `${siteUrl}/${locale}/trainers/${trainer.slug}`,
          lastModified: trainer.updatedAt || new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  }

  return routes;
}


