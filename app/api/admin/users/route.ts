import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';
import { AuthError, requireAdmin } from '@/lib/auth/server';
import { validateCsrf } from '@/lib/security/csrf';
import { MAX_ADMIN_PAGE_SIZE } from '@/lib/config/api';

const ENDPOINT = '/api/admin/users';

export async function GET(request: Request) {
  try {
    await requireAdmin();

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const requestedLimit = parseInt(searchParams.get('limit') || '20');
    const limit = Math.min(
      Math.max(Number.isNaN(requestedLimit) ? 20 : requestedLimit, 1),
      MAX_ADMIN_PAGE_SIZE
    );
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Role filter
    if (role) {
      filter.role = role;
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        filter.emailVerified = true;
      } else if (status === 'pending') {
        filter.emailVerified = false;
      } else if (status === 'banned') {
        // In real implementation, add a 'banned' or 'status' field to User model
        // filter.banned = true;
        // For now, we'll leave this as a placeholder
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch users
    const users = await User.find(filter)
      .select('-password')
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format users data
    const formattedUsers = users.map((user: any) => ({
      id: user._id.toString(),
      fullName: user.fullName || 'Unknown',
      email: user.email,
      role: user.role || 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified || false,
      addresses: user.addresses || [],
      orderCount: 0, // Would need to query Order model
      lastLogin: user.updatedAt || user.createdAt, // Would need to track separately
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    await requireAdmin();

    await connectDB();

    const body = await request.json();
    const { userId, updates } = body;

    // Validate userId
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, userId)) {
      return NextResponse.json(
        { error: 'User not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      // Record 404 error
      record404(ENDPOINT, userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Record success to reset counter
    recordSuccess(ENDPOINT, userId);

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }
    await requireAdmin();

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await User.findByIdAndDelete(userId);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}



