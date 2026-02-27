import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import mongoose from 'mongoose';
import { validateCsrf } from '@/lib/security/csrf';

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
 * Update signup (status, formData, userEmail, userName, notes) (admin only)
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

    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    const body = await request.json();
    const { status, formData, userEmail, userName, notes } = body;

    const update: Record<string, unknown> = {};

    if (status !== undefined) {
      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Use pending, confirmed, or cancelled' },
          { status: 400 }
        );
      }
      update.status = status;
    }

    if (formData !== undefined) {
      if (!Array.isArray(formData)) {
        return NextResponse.json({ error: 'formData must be an array' }, { status: 400 });
      }
      update.formData = formData;
    }

    if (userEmail !== undefined) update.userEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
    if (userName !== undefined) update.userName = typeof userName === 'string' ? userName.trim() : '';
    if (notes !== undefined) update.notes = typeof notes === 'string' ? notes.trim() : '';

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectDB();

    const signup = await EventSignup.findByIdAndUpdate(id, update, { new: true })
      .populate('eventId', 'slug content dateTime')
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

/**
 * DELETE /api/admin/event-signups/[id]
 * Delete a signup (admin only). Decrements event attendingCount.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid signup ID' }, { status: 400 });
    }

    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
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

    const signup = await EventSignup.findById(id).lean();
    if (!signup) {
      return NextResponse.json({ error: 'Signup not found' }, { status: 404 });
    }

    const eventId = (signup as any).eventId?.toString?.() || (signup as any).eventId;
    await EventSignup.findByIdAndDelete(id);

    if (eventId) {
      await Event.findByIdAndUpdate(eventId, { $inc: { attendingCount: -1 } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event signup delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete signup' },
      { status: 500 }
    );
  }
}
