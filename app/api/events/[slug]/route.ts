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
      status: 'published'
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
    Event.findByIdAndUpdate(event._id, { $inc: { viewCount: 1 } }).exec().catch(console.error);

    // Format response - handle both old and new format
    const formattedEvent = {
      _id: event._id.toString(),
      slug: event.slug,
      category: event.category || 'roller',
      type: event.type || 'event',
      status: event.status || 'published',
      isFeatured: event.isFeatured || false,
      
      // Event timing - new format
      dateTime: event.dateTime || {
        startDate: event.startDate || new Date(),
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        timezone: event.timezone ? 
          (typeof event.timezone === 'string' ? 
            { he: event.timezone, en: event.timezone } : 
            event.timezone
          ) : 
          { he: 'אסיה/ירושלים', en: 'Asia/Jerusalem' }
      },
      
      // Event location - new format
      location: event.location || {
        name: {
          he: event.location?.name?.he || '',
          en: event.location?.name?.en || ''
        },
        address: event.location?.address ? {
          he: event.location.address.he || '',
          en: event.location.address.en || ''
        } : undefined,
        url: event.location?.url || event.location?.venueUrl,
        coordinates: event.location?.coordinates ? {
          lat: event.location.coordinates.lat || event.location.coordinates.latitude,
          lng: event.location.coordinates.lng || event.location.coordinates.longitude
        } : undefined
      },
      
      // Engagement metrics
      viewCount: (event.viewCount || event.viewsCount || 0) + 1,
      interestedCount: event.interestedCount || 0,
      attendingCount: event.attendingCount || currentParticipants || 0,
      
      // Localized content - new format
      content: event.content || {
        he: {
          title: event.title?.he || event.content?.he?.title || '',
          description: event.description?.he || event.content?.he?.description || '',
          tags: event.content?.he?.tags || event.tags || [],
          sections: event.content?.he?.sections || []
        },
        en: {
          title: event.title?.en || event.content?.en?.title || '',
          description: event.description?.en || event.content?.en?.description || '',
          tags: event.content?.en?.tags || event.tags || [],
          sections: event.content?.en?.sections || []
        }
      },
      
      // Media management
      media: event.media || (event.images || []).map((img: any) => ({
        id: img._id?.toString() || Math.random().toString(),
        url: img.url,
        type: 'image',
        cloudinaryId: img.publicId || img.cloudinaryId,
        altText: {
          he: img.alt?.he || '',
          en: img.alt?.en || ''
        },
        caption: img.caption,
        usedInSections: []
      })),
      
      featuredImage: event.featuredImage ? 
        (typeof event.featuredImage === 'string' ? 
          {
            url: event.featuredImage,
            altText: {
              he: event.title?.he || '',
              en: event.title?.en || ''
            }
          } : 
          event.featuredImage
        ) : 
        {
          url: '',
          altText: { he: '', en: '' }
        },
      
      // Event specific fields
      isOnline: event.isOnline || false,
      isFree: event.isFree !== undefined ? event.isFree : true,
      registrationRequired: event.registrationRequired || false,
      registrationUrl: event.registrationUrl,
      
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
