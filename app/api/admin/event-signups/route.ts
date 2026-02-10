import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import EventSignup from '@/lib/models/EventSignup';
import mongoose from 'mongoose';

/**
 * GET /api/admin/event-signups
 * List event signups with filters and pagination (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 5000);
    const status = searchParams.get('status') || '';
    const eventId = searchParams.get('eventId') || '';
    const eventSlug = searchParams.get('eventSlug') || '';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'submittedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (eventId && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.eventId = new mongoose.Types.ObjectId(eventId);
    }

    if (eventSlug) {
      filter.eventSlug = eventSlug;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { confirmationNumber: searchRegex },
        { userEmail: searchRegex },
        { userName: searchRegex },
      ];
    }

    const totalCount = await EventSignup.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const signups = await EventSignup.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('eventId', 'slug content dateTime')
      .lean();

    const formatted = signups.map((s: any) => ({
      id: s._id.toString(),
      eventId: s.eventId?._id?.toString() || s.eventId?.toString(),
      eventSlug: s.eventSlug,
      eventTitle: s.eventId?.content?.en?.title || s.eventId?.content?.he?.title || s.eventSlug,
      formData: s.formData || [],
      userEmail: s.userEmail,
      userName: s.userName,
      submittedAt: s.submittedAt,
      confirmationNumber: s.confirmationNumber,
      status: s.status,
      notes: s.notes,
    }));

    return NextResponse.json({
      signups: formatted,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('Event signups list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event signups' },
      { status: 500 }
    );
  }
}
