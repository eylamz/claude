import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import { formatEventForDetail } from '@/lib/events/formatEvent';

/**
 * Event Detail API Route
 *
 * GET /api/events/[slug]
 *
 * Fetches a single event by slug
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectDB();

    const event = await Event.findOne({
      slug: slug.toLowerCase(),
      status: 'published',
    }).lean();

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const currentParticipants = await EventSignup.countByEventId(String(event._id));

    // Increment views count (async, don't wait)
    Event.findByIdAndUpdate(event._id, { $inc: { viewCount: 1 } }).exec().catch(console.error);

    const formattedEvent = formatEventForDetail(event, {
      currentParticipants,
      incrementView: true,
    });

    return NextResponse.json({
      event: formattedEvent,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
