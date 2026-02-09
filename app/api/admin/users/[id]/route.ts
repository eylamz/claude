import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import mongoose from 'mongoose';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';

const ENDPOINT = '/api/admin/users/[id]';

/**
 * GET /api/admin/users/[id]
 * Get a single user by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId first (before checking circuit breaker)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, id)) {
      return NextResponse.json(
        { error: 'User not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Verify authentication (before database call)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const user = await User.findById(id).select('-password').lean();

    if (!user) {
      // Record 404 error
      record404(ENDPOINT, id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Record success to reset counter
    recordSuccess(ENDPOINT, id);

    // Format response
    const formattedUser = {
      id: user._id.toString(),
      fullName: user.fullName || 'Unknown',
      email: user.email,
      role: user.role || 'user',
      emailVerified: user.emailVerified || false,
      addresses: user.addresses || [],
      preferences: user.preferences || {
        language: 'en',
        colorMode: 'system',
        emailMarketing: false,
      },
      wishlist: user.wishlist || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error: any) {
    console.error('User API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[id]
 * Update a user by ID
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId first (before checking circuit breaker)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, id)) {
      return NextResponse.json(
        { error: 'User not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Verify authentication (before database call)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const user = await User.findById(id);
    if (!user) {
      // Record 404 error
      record404(ENDPOINT, id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      fullName,
      email,
      role,
      emailVerified,
      addresses,
      preferences,
    } = body;

    // Update fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (emailVerified !== undefined) user.emailVerified = emailVerified;
    if (addresses !== undefined) user.addresses = addresses;
    if (preferences !== undefined) user.preferences = preferences;

    await user.save();

    // Return user without password
    const updatedUser = await User.findById(id).select('-password').lean();

    // Record success to reset counter
    recordSuccess(ENDPOINT, id);

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

