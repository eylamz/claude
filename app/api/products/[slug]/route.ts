import { NextRequest, NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/db/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';
    const { slug } = await params;

    // Fetch product by slug
    const product = await Product.findBySlug(slug);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is active
    if (product.status !== 'active') {
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 404 }
      );
    }

    // Calculate total stock
    const totalStock = product.variants.reduce(
      (total, variant) =>
        total + variant.sizes.reduce((sum, size) => sum + size.stock, 0),
      0
    );

    // Check if discount is active
    const now = new Date();
    const isOnSale =
      product.discountPrice &&
      (!product.discountStartDate || now >= product.discountStartDate) &&
      (!product.discountEndDate || now <= product.discountEndDate);

    // Get available colors
    const availableColors = product.variants.map((variant) => ({
      name: variant.color.name[locale as 'en' | 'he'] || variant.color.name.en,
      hex: variant.color.hex,
    }));

    // Transform data for client
    const transformedProduct = {
      id: String(product._id),
      slug: product.slug,
      name: product.name[locale as 'en' | 'he'] || product.name.en,
      description: product.description[locale as 'en' | 'he'] || product.description.en,
      price: product.price,
      discountPrice: product.discountPrice,
      isOnSale,
      currentPrice: product.getCurrentPrice(),
      category: product.category,
      subcategory: product.subcategory,
      relatedSports: product.relatedSports,
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt[locale as 'en' | 'he'] || img.alt.en,
        order: img.order,
      })),
      variants: product.variants.map((variant) => ({
        color: {
          name: variant.color.name[locale as 'en' | 'he'] || variant.color.name.en,
          hex: variant.color.hex,
        },
        sizes: variant.sizes.map((size) => ({
          size: size.size,
          stock: size.stock,
          sku: size.sku,
          isInStock: size.stock > 0,
        })),
      })),
      totalStock,
      isFeatured: product.isFeatured,
      isPreorder: product.isPreorder,
      availableColors,
      metadata: product.metadata
        ? {
            title:
              product.metadata.title[locale as 'en' | 'he'] ||
              product.metadata.title.en,
            description:
              product.metadata.description[locale as 'en' | 'he'] ||
              product.metadata.description.en,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json({ product: transformedProduct });
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}




