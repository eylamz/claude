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
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';
    const flippedQParam = searchParams.get('flippedQ')?.trim() || '';
    const flippedQuery = flippedQParam || (query ? flipLanguage(query) : null);
    const locale = searchParams.get('locale') || 'en';
    const category = searchParams.get('category');
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 10000) : 10000;

    // Empty query: only return results when types (or category) are specified (browse-by-category).
    if (!query && types.length === 0 && !category) {
      return NextResponse.json({ results: [], total: 0 });
    }

    const nameOrConditions = searchOrConditions(query, flippedQuery);

    const results: any[] = [];
    const categoriesToSearch = category 
      ? [category] 
      : types.length > 0 
        ? types 
        : ['skateparks', 'products', 'events', 'guides', 'trainers'];

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
      const skateparks = await Skatepark.find(skateparkQuery).limit(limit).lean();
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
      const products = await Product.find(productQuery).limit(limit).lean();
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
      const events = await Event.find(eventQuery).limit(limit).lean();
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
      const guides = await Guide.find(guideQuery).limit(limit).lean();
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
      const trainers = await Trainer.find(trainerQuery).limit(limit).lean();
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
    const skip = (page - 1) * limit;
    const paginatedResults = results.slice(skip, skip + limit);

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










