import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import { getLocalizedText } from '@/lib/seo/utils';

/**
 * Public Events API Route
 * 
 * GET /api/events?locale=en
 * 
 * Fetches all published public events
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale') || 'en';

    // Build query for published, public events
    const query: any = {
      status: 'published',
      isPublic: true,
    };

    // Fetch all published events
    const events = await Event.find(query)
      .sort({ startDate: 1 })
      .lean();

    // Format events data to match the frontend interface
    const formattedEvents = await Promise.all(
      events.map(async (event: any) => {
        // Get current participant count
        const currentParticipants = await EventSignup.countByEventId(event._id);
        
        // Format dates
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate || event.startDate);
        const now = new Date();

        // Determine if event is happening now or past
        const isHappeningNow = startDate <= now && endDate >= now;
        const isPast = endDate < now;

        // Format time strings
        const formatTime = (date: Date) => {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        };

        // Format date strings (YYYY-MM-DD)
        const formatDate = (date: Date) => {
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        return {
          id: event._id.toString(),
          slug: event.slug,
          title: getLocalizedText(event.title, locale),
          description: getLocalizedText(event.description || event.shortDescription, locale),
          image: event.featuredImage || event.images?.[0]?.url || '/placeholder-event.jpg',
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          startTime: event.isAllDay ? '00:00' : formatTime(startDate),
          endTime: event.isAllDay ? '23:59' : formatTime(endDate),
          location: getLocalizedText(event.location?.name, locale),
          address: getLocalizedText(event.location?.address, locale),
          interestedCount: event.interestedCount || 0,
          maxParticipants: event.capacity,
          currentParticipants,
          isFree: event.isFree || false,
          price: event.price,
          sports: event.relatedSports || [],
          isHappeningNow,
          isPast,
        };
      })
    );

    return NextResponse.json({
      events: formattedEvents,
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}




