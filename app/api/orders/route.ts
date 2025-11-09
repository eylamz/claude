import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Order, { OrderStatus } from '@/lib/db/models/Order';

/**
 * Orders API Route
 * 
 * GET /api/orders
 * 
 * Fetches orders for the authenticated user with filters and pagination
 */

const ITEMS_PER_PAGE = 10;

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const status = searchParams.get('status') as OrderStatus | null;
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query: any = {
      userId: session.user.id,
    };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Order number search (case-insensitive)
    if (orderNumber) {
      query.orderNumber = { $regex: orderNumber.toUpperCase(), $options: 'i' };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Include the full day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Calculate skip for pagination
    const skip = (page - 1) * ITEMS_PER_PAGE;

    // Fetch orders with pagination
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(ITEMS_PER_PAGE)
        .lean(),
      Order.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const hasMore = page < totalPages;

    return NextResponse.json({
      orders,
      pagination: {
        page,
        totalPages,
        totalItems: total,
        itemsPerPage: ITEMS_PER_PAGE,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}







