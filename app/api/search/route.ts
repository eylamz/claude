import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Product from '@/lib/models/Product';
import Event from '@/lib/models/Event';
import Guide from '@/lib/models/Guide';
import Trainer from '@/lib/models/Trainer';
import { getLocalizedText } from '@/lib/seo/utils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';
    const locale = searchParams.get('locale') || 'en';
    const category = searchParams.get('category');
    const types = searchParams.get('types')?.split(',').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;

    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }

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
          { 'name.en': { $regex: query, $options: 'i' } },
          { 'name.he': { $regex: query, $options: 'i' } },
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
        productQuery.$or = [
          { 'name.en': { $regex: query, $options: 'i' } },
          { 'name.he': { $regex: query, $options: 'i' } },
          { 'description.en': { $regex: query, $options: 'i' } },
          { 'description.he': { $regex: query, $options: 'i' } },
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
        eventQuery.$or = [
          { 'title.en': { $regex: query, $options: 'i' } },
          { 'title.he': { $regex: query, $options: 'i' } },
          { 'description.en': { $regex: query, $options: 'i' } },
          { 'description.he': { $regex: query, $options: 'i' } },
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
        guideQuery.$or = [
          { 'title.en': { $regex: query, $options: 'i' } },
          { 'title.he': { $regex: query, $options: 'i' } },
          { 'description.en': { $regex: query, $options: 'i' } },
          { 'description.he': { $regex: query, $options: 'i' } },
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
          { 'name.en': { $regex: query, $options: 'i' } },
          { 'name.he': { $regex: query, $options: 'i' } },
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







