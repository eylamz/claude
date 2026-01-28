import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import Settings from '@/lib/models/Settings';
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
    const versionOnly = searchParams.get('versionOnly') === 'true';
    const locale = searchParams.get('locale') || 'en';
    
    // If only version is requested, return it without fetching events
    if (versionOnly) {
      const settings = await Settings.findOrCreate();
      const version = settings.eventsVersion || 1;
      return NextResponse.json({ version });
    }

    // Build query for published events
    // Note: isPublic field doesn't exist in Event schema, so we only filter by status
    const query: any = {
      status: 'published',
    };

    // Fetch all published events
    const events = await Event.find(query)
      .sort({ startDate: 1 })
      .lean();

    console.log(`[Events API] Found ${events.length} events matching query:`, JSON.stringify(query));

    // Format events data to match the frontend interface
    const formattedEvents = await Promise.all(
      events.map(async (event: any) => {
        // Get current participant count
        const currentParticipants = await EventSignup.countByEventId(event._id);
        
        // Handle both new format (dateTime.startDate) and old format (startDate)
        const startDate = event.dateTime?.startDate 
          ? new Date(event.dateTime.startDate) 
          : (event.startDate ? new Date(event.startDate) : new Date());
        const endDate = event.dateTime?.endDate 
          ? new Date(event.dateTime.endDate) 
          : (event.endDate ? new Date(event.endDate) : startDate);
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

        // Handle title - new format uses content[locale].title, old format uses title[locale] or title
        const title = event.content?.[locale]?.title 
          || event.content?.en?.title 
          || event.title?.[locale] 
          || event.title?.en 
          || (typeof event.title === 'string' ? event.title : '')
          || 'Untitled Event';

        // Handle description - new format uses content[locale].description
        const description = event.content?.[locale]?.description 
          || event.content?.en?.description 
          || event.description?.[locale] 
          || event.description?.en 
          || event.shortDescription?.[locale]
          || event.shortDescription?.en
          || (typeof event.description === 'string' ? event.description : '')
          || '';

        // Handle featured image
        const featuredImage = typeof event.featuredImage === 'string' 
          ? event.featuredImage 
          : event.featuredImage?.url 
          || event.images?.[0]?.url 
          || '/placeholder-event.jpg';

        // Handle location name
        const locationName = event.location?.name?.[locale] 
          || event.location?.name?.en 
          || '';

        // Handle location address
        const locationAddress = event.location?.address?.[locale] 
          || event.location?.address?.en 
          || '';

        // Handle isAllDay - check dateTime or event level
        const isAllDay = event.dateTime?.isAllDay !== undefined 
          ? event.dateTime.isAllDay 
          : event.isAllDay || false;

        // Handle start/end times from dateTime or calculate from dates
        let startTime = event.dateTime?.startTime;
        let endTime = event.dateTime?.endTime;
        if (!startTime && !isAllDay) {
          startTime = formatTime(startDate);
        }
        if (!endTime && !isAllDay) {
          endTime = formatTime(endDate);
        }

        return {
          id: event._id.toString(),
          slug: event.slug,
          title,
          description,
          image: featuredImage,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          startTime: isAllDay ? '00:00' : (startTime || formatTime(startDate)),
          endTime: isAllDay ? '23:59' : (endTime || formatTime(endDate)),
          location: locationName,
          address: locationAddress,
          interestedCount: event.interestedCount || 0,
          maxParticipants: event.capacity,
          currentParticipants,
          isFree: event.isFree !== undefined ? event.isFree : true,
          price: event.price,
          sports: event.relatedSports || [],
          isHappeningNow,
          isPast,
        };
      })
    );

    // Get version from settings
    const settings = await Settings.findOrCreate();
    const version = settings.eventsVersion || 1;

    return NextResponse.json({
      events: formattedEvents,
      version,
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}








