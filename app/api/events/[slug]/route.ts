import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import { getLocalizedText } from '@/lib/seo/utils';

/**
 * Event Detail API Route
 * 
 * GET /api/events/[slug]
 * 
 * Fetches a single event by slug
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || 'en';

    await connectDB();

    const event = await Event.findOne({ 
      slug: slug.toLowerCase(), 
      status: 'published',
      isPublic: true
    }).lean();

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get current participant count
    const currentParticipants = await EventSignup.countByEventId(event._id);

    // Increment views count (async, don't wait)
    Event.findByIdAndUpdate(event._id, { $inc: { viewsCount: 1 } }).exec().catch(console.error);

    // Format response
    const formattedEvent = {
      _id: event._id.toString(),
      slug: event.slug,
      title: event.title,
      description: event.description,
      shortDescription: event.shortDescription,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
      location: event.location,
      images: event.images || [],
      featuredImage: event.featuredImage,
      videoUrl: event.videoUrl,
      relatedSports: event.relatedSports || [],
      category: event.category,
      organizer: event.organizer,
      capacity: event.capacity,
      isFree: event.isFree || false,
      price: event.price,
      currency: event.currency || 'ILS',
      registrationUrl: event.registrationUrl,
      viewsCount: (event.viewsCount || 0) + 1,
      interestedCount: event.interestedCount || 0,
      attendedCount: currentParticipants,
      status: event.status,
      isFeatured: event.isFeatured || false,
      isPublic: event.isPublic,
      registrationRequired: event.registrationRequired || false,
      metaTitle: event.metaTitle,
      metaDescription: event.metaDescription,
      tags: event.tags || [],
      notes: event.notes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

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
