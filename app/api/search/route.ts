/**
 * Search API: returns results from the database.
 * Clients (MobileSidebar, search page, HeaderNav) use localStorage cache first for
 * skateparks, events, and guides (skateparks_cache, events_cache, guides_cache)
 * and only call this API for products/trainers (types=products,trainers).
 * This route runs on the server and cannot access localStorage.
 */
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Product from '@/lib/models/Product';
import Event from '@/lib/models/Event';
import Guide from '@/lib/models/Guide';
import Trainer from '@/lib/models/Trainer';
import { getLocalizedText } from '@/lib/seo/utils';
import { flipLanguage } from '@/lib/utils/transliterate';
import { RateLimiter } from '@/lib/redis';
import {
  MAX_SEARCH_RESULTS,
  SEARCH_PER_TYPE_LIMIT,
} from '@/lib/config/api';
import { z } from 'zod';

// Rate limiter: cap search traffic per IP
const searchRateLimiter = new RateLimiter(60000, 30);

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return realIp || request.ip || 'unknown';
}

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  flippedQ: z.string().trim().max(200).optional(),
  locale: z.enum(['en', 'he']).optional(),
  category: z.string().trim().max(50).optional(),
  types: z.array(z.string().trim().max(30)).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/** Build $or conditions for query and optional flippedQuery (keyboard-layout flip). */
function searchOrConditions(query: string, flippedQuery: string | null): Array<{ $regex: string; $options: string }> {
  const conditions: Array<{ $regex: string; $options: string }> = [
    { $regex: query, $options: 'i' },
  ];
  if (flippedQuery && flippedQuery !== query) {
    conditions.push({ $regex: flippedQuery, $options: 'i' });
  }
  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rate = await searchRateLimiter.isAllowed(`search:${ip}`);
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      console.warn('Search rate limit exceeded', {
        ip,
        retryAfterSeconds,
      });
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Search rate limit exceeded. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const raw = {
      q: searchParams.get('q'),
      flippedQ: searchParams.get('flippedQ'),
      locale: searchParams.get('locale') || undefined,
      category: searchParams.get('category') || undefined,
      types: searchParams.get('types')
        ? searchParams
            .get('types')!
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const parsed = searchQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid search parameters',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { q, flippedQ, locale: rawLocale, category, types, page, limit } =
      parsed.data;

    const query = (q ?? '').trim();
    const flippedQParam = (flippedQ ?? '').trim();
    const flippedQuery =
      flippedQParam || (query ? flipLanguage(query) : null);
    const locale = rawLocale ?? 'en';
    const rawPage = page ? parseInt(page, 10) : 1;
    const safePage = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit = limit ? parseInt(limit, 10) || 20 : 20;
    const safeLimit = Math.min(
      Math.max(requestedLimit, 1),
      MAX_SEARCH_RESULTS
    );

    // Empty query: only return results when types (or category) are specified (browse-by-category).
    if (!query && types.length === 0 && !category) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const nameOrConditions = searchOrConditions(query, flippedQuery);

    const results: any[] = [];
    const categoriesToSearch = category 
      ? [category] 
      : (types && types.length > 0
        ? types 
        : ['skateparks', 'products', 'events', 'guides', 'trainers'];

    const perTypeLimit = Math.min(SEARCH_PER_TYPE_LIMIT, safeLimit);

    // Search Skateparks
    if (categoriesToSearch.includes('skateparks')) {
      const skateparkQuery: any = { status: 'active' };
      if (query) {
        skateparkQuery.$or = [
          ...nameOrConditions.flatMap((cond) => [
            { 'name.en': cond },
            { 'name.he': cond },
          ]),
        ];
      }
      const skateparks = await Skatepark.find(skateparkQuery)
        .limit(perTypeLimit)
        .lean();
      skateparks.forEach((park: any) => {
        const name = getLocalizedText(park.name, locale);
        results.push({
          id: park._id.toString(),
          type: 'skateparks',
          slug: park.slug,
          name: name,
          imageUrl: park.images?.[0]?.url || '',
          area: park.area,
          rating: park.rating,
        });
      });
    }

    // Search Products
    if (categoriesToSearch.includes('products')) {
      const productQuery: any = { status: 'active' };
      if (query) {
        const descOr = searchOrConditions(query, flippedQuery);
        productQuery.$or = [
          ...nameOrConditions.flatMap((cond) => [
            { 'name.en': cond },
            { 'name.he': cond },
          ]),
          ...descOr.flatMap((cond) => [
            { 'description.en': cond },
            { 'description.he': cond },
          ]),
        ];
      }
      const products = await Product.find(productQuery)
        .limit(perTypeLimit)
        .lean();
      products.forEach((product: any) => {
        const name = getLocalizedText(product.name, locale);
        const totalStock = product.variants?.reduce((sum: number, variant: any) => {
          return sum + (variant.sizes?.reduce((s: number, size: any) => s + (size.stock || 0), 0) || 0);
        }, 0) || 0;
        results.push({
          id: product._id.toString(),
          type: 'products',
          slug: product.slug,
          name: name,
          images: product.images || [],
          price: product.price,
          discountPrice: product.discountPrice,
          variants: product.variants || [],
          totalStock,
        });
      });
    }

    // Search Events
    if (categoriesToSearch.includes('events')) {
      const eventQuery: any = { status: 'published', isPublic: true };
      if (query) {
        const descOr = searchOrConditions(query, flippedQuery);
        eventQuery.$or = [
          ...nameOrConditions.flatMap((cond) => [
            { 'title.en': cond },
            { 'title.he': cond },
          ]),
          ...descOr.flatMap((cond) => [
            { 'description.en': cond },
            { 'description.he': cond },
          ]),
        ];
      }
      const events = await Event.find(eventQuery)
        .limit(perTypeLimit)
        .lean();
      events.forEach((event: any) => {
        results.push({
          id: event._id.toString(),
          type: 'events',
          slug: event.slug,
          title: getLocalizedText(event.title, locale),
          image: event.featuredImage || event.images?.[0]?.url || '',
          startDate: event.startDate,
        });
      });
    }

    // Search Guides
    if (categoriesToSearch.includes('guides')) {
      const guideQuery: any = { status: 'published' };
      if (query) {
        const descOr = searchOrConditions(query, flippedQuery);
        guideQuery.$or = [
          ...nameOrConditions.flatMap((cond) => [
            { 'title.en': cond },
            { 'title.he': cond },
          ]),
          ...descOr.flatMap((cond) => [
            { 'description.en': cond },
            { 'description.he': cond },
          ]),
        ];
      }
      const guides = await Guide.find(guideQuery)
        .limit(perTypeLimit)
        .lean();
      guides.forEach((guide: any) => {
        results.push({
          id: guide._id.toString(),
          type: 'guides',
          slug: guide.slug,
          title: getLocalizedText(guide.title, locale),
          description: getLocalizedText(guide.description, locale),
          coverImage: guide.coverImage || '',
          rating: guide.rating,
          ratingCount: guide.ratingCount,
          readTime: guide.readTime,
        });
      });
    }

    // Search Trainers
    if (categoriesToSearch.includes('trainers')) {
      const trainerQuery: any = { status: 'active' };
      if (query) {
        trainerQuery.$or = [
          ...nameOrConditions.flatMap((cond) => [
            { 'name.en': cond },
            { 'name.he': cond },
          ]),
        ];
      }
      const trainers = await Trainer.find(trainerQuery)
        .limit(perTypeLimit)
        .lean();
      trainers.forEach((trainer: any) => {
        results.push({
          id: trainer._id.toString(),
          type: 'trainers',
          slug: trainer.slug,
          name: getLocalizedText(trainer.name, locale),
          profileImage: trainer.profileImage || '',
          area: trainer.area,
          relatedSports: trainer.relatedSports || [],
          rating: trainer.rating,
          totalReviews: trainer.totalReviews || 0,
        });
      });
    }

    // Paginate results
    const skip = (safePage - 1) * safeLimit;
    const paginatedResults = results
      .sort((a, b) => {
        // simple, stable-ish ordering: by type then name/title
        const typeCmp = String(a.type).localeCompare(String(b.type));
        if (typeCmp !== 0) return typeCmp;
        const aLabel = a.name || a.title || '';
        const bLabel = b.name || b.title || '';
        return String(aLabel).localeCompare(String(bLabel));
      })
      .slice(skip, skip + safeLimit);

    return NextResponse.json({
      results: paginatedResults,
      total: results.length,
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search', results: [], total: 0 },
      { status: 500 }
    );
  }
}










