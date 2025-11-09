import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const featured = searchParams.get('featured') || '';
    const stockLevel = searchParams.get('stockLevel') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.he': { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Featured filter
    if (featured === 'true') {
      filter.isFeatured = true;
    } else if (featured === 'false') {
      filter.isFeatured = false;
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch products
    const products = await Product.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate total stock for each product
    const productsWithStock = products.map((product: any) => {
      const totalStock = product.variants.reduce(
        (sum: number, variant: any) =>
          sum + variant.sizes.reduce((sizeSum: number, size: any) => sizeSum + size.stock, 0),
        0
      );

      // Get first image or placeholder
      const image = product.images?.[0]?.url || '/placeholder-image.jpg';

      // Get name in English
      const name = product.name?.en || product.name || 'Untitled Product';

      return {
        id: product._id.toString(),
        name,
        slug: product.slug,
        image,
        category: product.category,
        price: product.price,
        discountPrice: product.discountPrice,
        status: product.status,
        isFeatured: product.isFeatured,
        totalStock,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    // Apply stock level filter after calculating total stock
    let filteredProducts = productsWithStock;
    if (stockLevel) {
      if (stockLevel === 'in-stock') {
        filteredProducts = productsWithStock.filter((p) => p.totalStock > 0);
      } else if (stockLevel === 'low-stock') {
        filteredProducts = productsWithStock.filter((p) => p.totalStock > 0 && p.totalStock <= 10);
      } else if (stockLevel === 'out-of-stock') {
        filteredProducts = productsWithStock.filter((p) => p.totalStock === 0);
      }
    }

    return NextResponse.json({
      products: filteredProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}


