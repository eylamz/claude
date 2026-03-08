import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';
import { validateCsrf } from '@/lib/security/csrf';
import { AuthError, requireUser } from '@/lib/auth/server';
import { authErrorResponse, internalError } from '@/lib/api/errors';

/**
 * Wishlist API Route
 * 
 * GET /api/wishlist - Get user's wishlist
 * POST /api/wishlist - Add product to wishlist
 * DELETE /api/wishlist - Remove product from wishlist or clear wishlist
 */

// GET - Fetch wishlist
export async function GET(_request: NextRequest) {
  try {
    const sessionUser = await requireUser();

    await connectDB();

    const user = await User.findById(sessionUser.id)
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
  } catch (error: any) {
    if (error instanceof AuthError) {
      return authErrorResponse(error.status);
    }
    return internalError(error, 'wishlist/GET');
  }
}

// POST - Add product to wishlist
export async function POST(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const sessionUser = await requireUser();

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(sessionUser.id);
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
  } catch (error: any) {
    if (error instanceof AuthError) {
      return authErrorResponse(error.status);
    }
    return internalError(error, 'wishlist/POST');
  }
}

// DELETE - Remove product from wishlist or clear wishlist
export async function DELETE(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const sessionUser = await requireUser();

    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const clearAll = searchParams.get('clearAll') === 'true';

    await connectDB();

    const user = await User.findById(sessionUser.id);
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
  } catch (error: any) {
    if (error instanceof AuthError) {
      return authErrorResponse(error.status);
    }
    return internalError(error, 'wishlist/DELETE');
  }
}


