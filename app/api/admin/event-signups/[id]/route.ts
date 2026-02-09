import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import EventSignup from '@/lib/models/EventSignup';
import mongoose from 'mongoose';

/**
 * GET /api/admin/event-signups/[id]
 * Get a single event signup (admin only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid signup ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const signup = await EventSignup.findById(id)
      .populate('eventId', 'slug content dateTime location')
      .lean();

    if (!signup) {
      return NextResponse.json({ error: 'Signup not found' }, { status: 404 });
    }

    const s = signup as any;
    return NextResponse.json({
      signup: {
        id: s._id.toString(),
        eventId: s.eventId?._id?.toString(),
        eventSlug: s.eventSlug,
        eventTitle: s.eventId?.content?.en?.title || s.eventId?.content?.he?.title,
        formData: s.formData || [],
        userEmail: s.userEmail,
        userName: s.userName,
        submittedAt: s.submittedAt,
        confirmationNumber: s.confirmationNumber,
        status: s.status,
        notes: s.notes,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      },
    });
  } catch (error) {
    console.error('Event signup get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signup' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/event-signups/[id]
 * Update signup status (e.g. cancel) (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid signup ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Use pending, confirmed, or cancelled' },
        { status: 400 }
      );
    }

    await connectDB();

    const signup = await EventSignup.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();

    if (!signup) {
      return NextResponse.json({ error: 'Signup not found' }, { status: 404 });
    }

    return NextResponse.json({
      signup: {
        id: (signup as any)._id.toString(),
        status: (signup as any).status,
      },
    });
  } catch (error) {
    console.error('Event signup update error:', error);
    return NextResponse.json(
      { error: 'Failed to update signup' },
      { status: 500 }
    );
  }
}
