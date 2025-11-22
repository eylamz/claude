import { NextRequest, NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/db/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const locale = searchParams.get('locale') || 'en';
    
    // Fetch featured products
    const products = await Product.findFeatured()
      .limit(limit)
      .select('slug name images price discountPrice discountStartDate discountEndDate category')
      .lean();
    
    // Transform data for client
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
    
    return NextResponse.json({ products: transformedProducts });
  } catch (error: any) {
    console.error('Error fetching featured products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured products' },
      { status: 500 }
    );
  }
}














