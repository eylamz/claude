import { NextRequest, NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const sort = searchParams.get('sort') || 'createdAt-desc';
    const category = searchParams.get('category');
    const sports = searchParams.get('sports')?.split(',').filter(Boolean);
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    // Build query
    const query: any = { status: 'active' };
    
    if (category) {
      query.category = category;
    }
    
    if (sports && sports.length > 0) {
      query.relatedSports = { $in: sports };
    }
    
    if (inStockOnly) {
      // Add logic to check stock
      // For now, we'll just fetch all active products
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Size and color filters would require more complex queries
    // For MVP, we'll skip these or implement them later
    
    // Sorting
    const sortOptions: any = {};
    switch (sort) {
      case 'popular':
        sortOptions.rating = -1;
        break;
      case 'new':
        sortOptions.createdAt = -1;
        break;
      case 'price-asc':
        sortOptions.price = 1;
        break;
      case 'price-desc':
        sortOptions.price = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }
    
    // Fetch products
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Product.countDocuments(query);
    
    // Transform data for client
    const transformedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      slug: product.slug,
      name: product.name[locale as 'en' | 'he'] || product.name.en,
      image: product.images && product.images.length > 0 ? product.images[0].url : '',
      images: product.images || [],
      price: product.price,
      discountPrice: product.discountPrice,
      hasDiscount: product.discountPrice && product.discountPrice < product.price,
      category: product.category,
      variants: product.variants || [],
    }));
    
    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

