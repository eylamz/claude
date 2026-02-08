import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import Settings from '@/lib/models/Settings';

export async function GET(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const sport = searchParams.get('sport') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const upcomingOnly = searchParams.get('upcomingOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'startDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter - handle both new format (content[locale].title) and old format (title[locale])
    if (search) {
      filter.$or = [
        { 'content.en.title': { $regex: search, $options: 'i' } },
        { 'content.he.title': { $regex: search, $options: 'i' } },
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.he': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Sport filter (relatedSports)
    if (sport && sport !== 'all') {
      filter.relatedSports = { $in: [sport] };
    }

    // Date range filter - handle both new format (dateTime.startDate) and old format (startDate)
    // Use $or to match either format
    const dateConditions: any[] = [];
    if (dateFrom || dateTo || upcomingOnly) {
      const newFormatCondition: any = {};
      const oldFormatCondition: any = {};
      const now = new Date();
      
      if (dateFrom) {
        newFormatCondition['dateTime.startDate'] = { $gte: new Date(dateFrom) };
        oldFormatCondition.startDate = { $gte: new Date(dateFrom) };
      }
      if (dateTo) {
        if (newFormatCondition['dateTime.startDate']) {
          newFormatCondition['dateTime.startDate'].$lte = new Date(dateTo);
        } else {
          newFormatCondition['dateTime.startDate'] = { $lte: new Date(dateTo) };
        }
        if (oldFormatCondition.startDate) {
          oldFormatCondition.startDate.$lte = new Date(dateTo);
        } else {
          oldFormatCondition.startDate = { $lte: new Date(dateTo) };
        }
      }
      if (upcomingOnly) {
        if (newFormatCondition['dateTime.startDate']) {
          newFormatCondition['dateTime.startDate'].$gte = now;
        } else {
          newFormatCondition['dateTime.startDate'] = { $gte: now };
        }
        if (oldFormatCondition.startDate) {
          oldFormatCondition.startDate.$gte = now;
        } else {
          oldFormatCondition.startDate = { $gte: now };
        }
      }
      
      if (Object.keys(newFormatCondition).length > 0) {
        dateConditions.push(newFormatCondition);
      }
      if (Object.keys(oldFormatCondition).length > 0) {
        dateConditions.push(oldFormatCondition);
      }
    }

    // Combine search and date filters
    if (dateConditions.length > 0) {
      if (filter.$or) {
        // If we already have $or from search, use $and to combine
        filter.$and = [
          { $or: filter.$or },
          { $or: dateConditions }
        ];
        delete filter.$or;
      } else {
        filter.$or = dateConditions;
      }
    }

    // Sort configuration - prefer new format (dateTime.startDate) but fallback to old format
    const sortConfig: any = {};
    if (sortBy === 'startDate') {
      // Try new format first, MongoDB will use whichever exists
      sortConfig['dateTime.startDate'] = sortOrder === 'asc' ? 1 : -1;
      sortConfig.startDate = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    // Calculate total count for pagination
    const totalCount = await Event.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch events
    const events = await Event.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format events data - handle both new format (content[locale].title) and old format (title[locale])
    const formattedEvents = (events || []).map((event: any) => {
      // Handle title - new format uses content[locale].title, old format uses title[locale]
      const titleEn = event.content?.en?.title 
        || event.title?.en 
        || (typeof event.title === 'string' ? event.title : 'Untitled');
      const titleHe = event.content?.he?.title 
        || event.title?.he 
        || titleEn;

      // Handle dates - new format uses dateTime.startDate, old format uses startDate
      const startDate = event.dateTime?.startDate || event.startDate;
      const endDate = event.dateTime?.endDate || event.endDate || startDate;

      // Handle location - new format uses location.name[locale], old format might be different
      const locationName = event.location?.name || { en: '', he: '' };
      const locationAddress = event.location?.address || { en: '', he: '' };

      // Handle featured image - can be string or object
      const featuredImage = typeof event.featuredImage === 'string' 
        ? event.featuredImage 
        : event.featuredImage?.url 
        || event.images?.[0]?.url 
        || '/placeholder-event.jpg';

      return {
        id: event._id.toString(),
        slug: event.slug,
        title: {
          en: titleEn,
          he: titleHe,
        },
        startDate: startDate,
        endDate: endDate,
        location: {
          name: locationName,
          address: locationAddress,
        },
        relatedSports: event.relatedSports || [],
        viewsCount: event.viewCount || event.viewsCount || 0,
        interestedCount: event.interestedCount || 0,
        attendedCount: event.attendingCount || event.attendedCount || 0,
        status: event.status || 'draft',
        featuredImage: featuredImage,
        capacity: event.capacity,
        isFree: event.isFree !== undefined ? event.isFree : true,
        price: event.price,
      };
    });

    return NextResponse.json({
      events: formattedEvents || [],
      pagination: {
        currentPage: page,
        totalPages: totalPages || 1,
        totalCount: totalCount || 0,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();

    // Build event in new schema (content, dateTime, featuredImage) from flat form body
    const relatedSports = Array.isArray(body.relatedSports)
      ? body.relatedSports.map((s: string) => String(s).toLowerCase()).filter((s: string) => ['roller', 'skate', 'scoot', 'bmx', 'longboard'].includes(s))
      : [];

    const newEvent = new Event({
      slug: body.slug || body.title?.en?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'event',
      relatedSports,
      type: body.type || 'event',
      status: body.status || 'draft',
      isFeatured: body.isFeatured || false,
      dateTime: {
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        timezone: {
          en: body.timezone || 'Asia/Jerusalem',
          he: body.timezone === 'Asia/Jerusalem' ? 'אסיה/ירושלים' : (body.timezone || 'אסיה/ירושלים'),
        },
      },
      location: body.location || { name: { en: '', he: '' }, address: { en: '', he: '' } },
      content: {
        en: {
          title: body.title?.en ?? '',
          description: body.description?.en ?? '',
          tags: Array.isArray(body.tags) ? body.tags : [],
          sections: Array.isArray(body.sections?.en) ? body.sections.en.map((s: any) => ({
            type: s.type,
            order: typeof s.order === 'number' ? s.order : 0,
            level: s.level,
            content: s.content,
            listType: s.listType,
            items: Array.isArray(s.items) ? s.items : [],
            data: s.data,
            links: Array.isArray(s.links) ? s.links : [],
            boxStyle: s.boxStyle,
          })) : [],
        },
        he: {
          title: body.title?.he ?? '',
          description: body.description?.he ?? '',
          tags: Array.isArray(body.tags) ? body.tags : [],
          sections: Array.isArray(body.sections?.he) ? body.sections.he.map((s: any) => ({
            type: s.type,
            order: typeof s.order === 'number' ? s.order : 0,
            level: s.level,
            content: s.content,
            listType: s.listType,
            items: Array.isArray(s.items) ? s.items : [],
            data: s.data,
            links: Array.isArray(s.links) ? s.links : [],
            boxStyle: s.boxStyle,
          })) : [],
        },
      },
      featuredImage: (() => {
        const fi = body.featuredImage;
        const url = typeof fi === 'string' ? fi : (fi?.url || '');
        const altText = typeof fi === 'object' && fi?.altText ? { en: fi.altText.en || '', he: fi.altText.he || '' } : { en: '', he: '' };
        const cloudinaryId = typeof fi === 'object' && fi?.cloudinaryId ? fi.cloudinaryId : undefined;
        return { url, altText, ...(cloudinaryId && { cloudinaryId }) };
      })(),
      media: Array.isArray(body.media)
        ? body.media.map((m: any) => ({
            id: m.id || `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            url: m.url || '',
            type: m.type === 'video' ? 'video' : 'image',
            cloudinaryId: m.cloudinaryId || undefined,
            altText: {
              en: m.altText?.en != null ? String(m.altText.en) : '',
              he: m.altText?.he != null ? String(m.altText.he) : '',
            },
            caption: {
              en: m.caption?.en != null ? String(m.caption.en) : '',
              he: m.caption?.he != null ? String(m.caption.he) : '',
            },
            usedInSections: Array.isArray(m.usedInSections) ? m.usedInSections : [],
          }))
        : [],
      isFree: body.isFree !== undefined ? body.isFree : true,
      registrationRequired: body.registrationRequired || false,
      registrationUrl: body.registrationUrl || '',
      registrationClosesAt: body.registrationClosesAt && String(body.registrationClosesAt).trim() ? new Date(body.registrationClosesAt) : undefined,
      metaTitle: body.metaTitle ? { en: body.metaTitle.en ?? '', he: body.metaTitle.he ?? '' } : undefined,
      metaDescription: body.metaDescription ? { en: body.metaDescription.en ?? '', he: body.metaDescription.he ?? '' } : undefined,
      metaKeywords: body.metaKeywords ? { en: body.metaKeywords.en ?? '', he: body.metaKeywords.he ?? '' } : undefined,
    });

    await newEvent.save();

    // Increment events version to invalidate client caches
    const settings = await Settings.findOrCreate();
    const currentVersion = settings.eventsVersion || 1;
    settings.eventsVersion = currentVersion + 0.00001;
    await settings.save();

    return NextResponse.json(
      { message: 'Event created successfully', event: newEvent },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}



