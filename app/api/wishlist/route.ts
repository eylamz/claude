import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';

/**
 * Wishlist API Route
 * 
 * GET /api/wishlist - Get user's wishlist
 * POST /api/wishlist - Add product to wishlist
 * DELETE /api/wishlist - Remove product from wishlist or clear wishlist
 */

// GET - Fetch wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id)
      .populate({
        path: 'wishlist',
        select: 'name slug price discountPrice discountStartDate discountEndDate images variants status',
      })
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Filter out deleted products and format response
    const wishlistItems = (user.wishlist || []).filter((product: any) => product).map((product: any) => {
      // Calculate stock
      let totalStock = 0;
      if (product.variants && product.variants.length > 0) {
        totalStock = product.variants.reduce((sum: number, variant: any) => {
          return sum + variant.sizes.reduce((sizeSum: number, size: any) => sizeSum + size.stock, 0);
        }, 0);
      }

      // Check discount
      const now = new Date();
      const hasActiveDiscount = product.discountPrice && 
        (!product.discountStartDate || now >= new Date(product.discountStartDate)) &&
        (!product.discountEndDate || now <= new Date(product.discountEndDate));

      return {
        _id: product._id.toString(),
        name: product.name,
        slug: product.slug,
        price: product.price,
        discountPrice: product.discountPrice,
        hasActiveDiscount,
        imageUrl: product.images?.[0]?.url || '/placeholder-product.jpg',
        images: product.images || [],
        variants: product.variants || [],
        totalStock,
        isInStock: totalStock > 0,
        status: product.status,
      };
    });

    return NextResponse.json({
      wishlist: wishlistItems,
      count: wishlistItems.length,
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add product to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Add to wishlist if not already there
    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    return NextResponse.json({
      message: 'Product added to wishlist',
      success: true,
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove product from wishlist or clear wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const clearAll = searchParams.get('clearAll') === 'true';

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (clearAll) {
      user.wishlist = [];
      await user.save();
      return NextResponse.json({
        message: 'Wishlist cleared',
        success: true,
      });
    } else if (productId) {
      user.wishlist = user.wishlist.filter(
        (id: any) => id.toString() !== productId
      );
      await user.save();
      return NextResponse.json({
        message: 'Product removed from wishlist',
        success: true,
      });
    } else {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


