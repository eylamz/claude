import { NextRequest, NextResponse } from 'next/server';
import Settings from '@/lib/models/Settings';
import Product from '@/lib/models/Product';
import Trainer from '@/lib/models/Trainer';
import Guide from '@/lib/models/Guide';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get locale from query params
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';
    
    // Fetch settings
    const settings = await Settings.findOrCreate();
    const homepageSettings = settings.homepage;
    
    // Fetch all featured data in parallel (skateparks are fetched separately from /api/skateparks)
    const [products, trainers, guides] = await Promise.all([
      // Featured products
      Product.find({ isFeatured: true, status: 'active' })
        .limit(homepageSettings?.featuredProductsCount || 8)
        .select('slug name images price discountPrice discountStartDate discountEndDate category')
        .lean(),
      
      // Featured trainers
      Trainer.find({ isFeatured: true, status: 'active' })
        .limit(homepageSettings?.featuredTrainersCount || 3)
        .select('slug name profileImage area relatedSports')
        .lean(),
      
      // Featured guides
      Guide.find({ isFeatured: true, status: 'published' })
        .limit(homepageSettings?.featuredGuidesCount || 3)
        .select('slug title description coverImage relatedSports viewsCount')
        .lean(),
    ]);
    
    // Transform products
    const transformedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      slug: product.slug,
      name: product.name[locale as 'en' | 'he'] || product.name.en,
      image: product.images && product.images.length > 0 ? product.images[0].url : '',
      price: product.price,
      discountPrice: product.discountPrice,
      hasDiscount: product.discountPrice && product.discountPrice < product.price,
      category: product.category,
    }));
    
    // Transform trainers
    const transformedTrainers = trainers.map((trainer: any) => ({
      id: trainer._id.toString(),
      slug: trainer.slug,
      name: trainer.name[locale as 'en' | 'he'] || trainer.name.en,
      image: trainer.profileImage,
      area: trainer.area,
      sports: trainer.relatedSports,
    }));
    
    // Transform guides
    const transformedGuides = guides.map((guide: any) => ({
      id: guide._id.toString(),
      slug: guide.slug,
      title: guide.title[locale as 'en' | 'he'] || guide.title.en,
      description: guide.description[locale as 'en' | 'he'] || guide.description.en,
      image: guide.coverImage,
      sports: guide.relatedSports,
      views: guide.viewsCount,
    }));
    
    // Return all homepage data in one response (skateparks are fetched separately from /api/skateparks)
    return NextResponse.json({ 
      homepage: homepageSettings,
      products: transformedProducts,
      trainers: transformedTrainers,
      guides: transformedGuides,
    });
  } catch (error: any) {
    console.error('Error fetching homepage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      { status: 500 }
    );
  }
}







