import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Order from '@/lib/db/models/Order';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';
import mongoose from 'mongoose';

/**
 * Account Stats API Route
 * 
 * GET /api/account/stats
 * 
 * Returns user statistics: total orders, wishlist items, reviews, points
 */

export async function GET(_request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Ensure Product model is registered in mongoose's model registry
    // This is needed because populate requires the model to be registered
    // In Next.js with hot reload, models can sometimes not be registered properly
    // Access the Product model to ensure mongoose knows about it for populate
    const ProductModel = mongoose.models.Product || Product;
    if (!ProductModel) {
      throw new Error('Product model is not available');
    }

    const userId = session.user.id;

    // Fetch stats in parallel
    const [totalOrders, user, recentOrders] = await Promise.all([
      Order.countDocuments({ userId }),
      User.findById(userId).populate('wishlist', 'name images price discountPrice slug'),
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    // Get wishlist count
    const wishlistCount = user?.wishlist?.length || 0;

    // Get wishlist products (first 6)
    const wishlistProducts = (user?.wishlist || [])
      .slice(0, 6)
      .filter((product: any) => product && product._id) // Filter out any null/undefined products
      .map((product: any) => ({
        _id: product._id.toString(),
        name: product.name || { en: 'Product', he: 'מוצר' },
        slug: product.slug || '',
        imageUrl: product.images?.[0]?.url || '/placeholder-product.jpg',
        price: product.price || 0,
        discountPrice: product.discountPrice,
      }));

    // TODO: Implement reviews count and points/rewards
    // For now, using placeholder values
    const reviewsCount = 0; // TODO: Implement when reviews system is ready
    const points = 0; // TODO: Implement rewards system

    return NextResponse.json({
      stats: {
        totalOrders,
        wishlistItems: wishlistCount,
        reviewsWritten: reviewsCount,
        points,
      },
      recentOrders,
      wishlistProducts,
    });
  } catch (error) {
    console.error('Error fetching account stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

