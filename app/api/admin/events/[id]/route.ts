import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import Settings from '@/lib/models/Settings';
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

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

    const event = await Event.findById(id).lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get current participant count
    const currentParticipants = await EventSignup.countByEventId(event._id);

    // Support both new schema (content, dateTime) and legacy flat fields
    const hasNewSchema = event.content && event.dateTime;
    const titleEn = hasNewSchema ? event.content.en?.title : (event.title?.en ?? '');
    const titleHe = hasNewSchema ? event.content.he?.title : (event.title?.he ?? '');
    const descEn = hasNewSchema ? event.content.en?.description : (event.description?.en ?? '');
    const descHe = hasNewSchema ? event.content.he?.description : (event.description?.he ?? '');
    const startDate = hasNewSchema ? event.dateTime?.startDate : event.startDate;
    const endDate = hasNewSchema ? event.dateTime?.endDate : event.endDate;
    const tzEn = hasNewSchema ? event.dateTime?.timezone?.en : null;
    const tzHe = hasNewSchema ? event.dateTime?.timezone?.he : null;
    const timezoneStr = tzEn || tzHe || event.timezone || 'Asia/Jerusalem';
    const featuredImageObj = typeof event.featuredImage === 'object' && event.featuredImage?.url
      ? {
          url: event.featuredImage.url,
          cloudinaryId: event.featuredImage.cloudinaryId || '',
          altText: {
            en: event.featuredImage.altText?.en || '',
            he: event.featuredImage.altText?.he || '',
          },
        }
      : {
          url: typeof event.featuredImage === 'string' ? event.featuredImage : '',
          cloudinaryId: '',
          altText: { en: '', he: '' },
        };
    const tags = hasNewSchema
      ? (event.content.en?.tags && event.content.he?.tags ? event.content.en.tags : event.content.en?.tags || event.content.he?.tags || [])
      : (event.tags || []);

    // Format event data for admin form (flat shape)
    const formattedEvent = {
      id: event._id.toString(),
      slug: event.slug,
      title: { en: titleEn || '', he: titleHe || '' },
      description: { en: descEn || '', he: descHe || '' },
      shortDescription: event.shortDescription || '',
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      timezone: timezoneStr,
      isAllDay: event.isAllDay || false,
      location: event.location || {
        name: { en: '', he: '' },
        address: { en: '', he: '' },
      },
      images: event.images || [],
      media: Array.isArray(event.media)
        ? event.media.map((m: any) => ({
            id: m.id || '',
            url: m.url || '',
            type: m.type || 'image',
            cloudinaryId: m.cloudinaryId || '',
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
      featuredImage: featuredImageObj,
      videoUrl: event.videoUrl || '',
      relatedSports: event.relatedSports || [],
      type: event.type || '',
      organizer: event.organizer || {
        name: '',
        email: '',
        phone: '',
      },
      capacity: event.capacity,
      isFree: event.isFree !== undefined ? event.isFree : true,
      price: event.price,
      currency: event.currency || 'ILS',
      registrationUrl: event.registrationUrl || '',
      viewsCount: event.viewCount ?? event.viewsCount ?? 0,
      interestedCount: event.interestedCount ?? 0,
      attendedCount: currentParticipants,
      status: event.status || 'draft',
      isFeatured: event.isFeatured || false,
      isPublic: event.isPublic !== undefined ? event.isPublic : true,
      registrationRequired: event.registrationRequired || false,
      metaTitle: event.metaTitle ?? { en: '', he: '' },
      metaDescription: event.metaDescription ?? { en: '', he: '' },
      metaKeywords: event.metaKeywords ?? { en: '', he: '' },
      tags: Array.isArray(tags) ? tags : [],
      notes: event.notes || '',
      sections: hasNewSchema
        ? {
            en: Array.isArray(event.content.en?.sections) ? event.content.en.sections : [],
            he: Array.isArray(event.content.he?.sections) ? event.content.he.sections : [],
          }
        : { en: [], he: [] },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return NextResponse.json({ event: formattedEvent });
  } catch (error: any) {
    console.error('Get event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

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

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();

    // DEBUG relatedSports (remove when done)
    console.log('[PUT event] body.relatedSports received:', body.relatedSports);

    // Event model uses content (en/he), dateTime, and featuredImage object — map flat form to schema
    if (body.slug !== undefined) event.slug = body.slug;
    if (body.type !== undefined) event.type = body.type;
    // Always apply relatedSports when sent (client now sends it explicitly)
    const allowedSports = ['roller', 'skate', 'scoot', 'bmx', 'longboard'];
    event.relatedSports = Array.isArray(body.relatedSports)
      ? body.relatedSports.map((s: string) => String(s).toLowerCase()).filter((s: string) => allowedSports.includes(s))
      : (Array.isArray(event.relatedSports) ? event.relatedSports : []);

    console.log('[PUT event] event.relatedSports after apply:', event.relatedSports);
    if (body.status !== undefined) event.status = body.status;
    if (body.isFeatured !== undefined) event.isFeatured = body.isFeatured;
    if (body.isFree !== undefined) event.isFree = body.isFree;
    if (body.registrationRequired !== undefined) event.registrationRequired = body.registrationRequired;
    if (body.registrationUrl !== undefined) event.registrationUrl = body.registrationUrl || '';
    if (body.location !== undefined) event.location = body.location;
    if (body.metaTitle !== undefined) event.metaTitle = { en: body.metaTitle.en ?? '', he: body.metaTitle.he ?? '' };
    if (body.metaDescription !== undefined) event.metaDescription = { en: body.metaDescription.en ?? '', he: body.metaDescription.he ?? '' };
    if (body.metaKeywords !== undefined) event.metaKeywords = { en: body.metaKeywords.en ?? '', he: body.metaKeywords.he ?? '' };

    // content (title, description, tags) — preserve existing sections
    if (event.content) {
      if (body.title !== undefined) {
        if (event.content.en) event.content.en.title = body.title.en ?? event.content.en.title ?? '';
        if (event.content.he) event.content.he.title = body.title.he ?? event.content.he.title ?? '';
      }
      if (body.description !== undefined) {
        if (event.content.en) event.content.en.description = body.description.en ?? event.content.en.description ?? '';
        if (event.content.he) event.content.he.description = body.description.he ?? event.content.he.description ?? '';
      }
      if (body.tags !== undefined && Array.isArray(body.tags)) {
        if (event.content.en) event.content.en.tags = body.tags;
        if (event.content.he) event.content.he.tags = body.tags;
      }
      if (body.sections !== undefined && typeof body.sections === 'object') {
        if (Array.isArray(body.sections.en)) {
          event.content.en.sections = body.sections.en.map((s: any) => ({
            type: s.type,
            order: typeof s.order === 'number' ? s.order : 0,
            level: s.level,
            content: s.content,
            listType: s.listType,
            items: Array.isArray(s.items) ? s.items : [],
            data: s.data,
            links: Array.isArray(s.links) ? s.links : [],
            boxStyle: s.boxStyle,
          }));
        }
        if (Array.isArray(body.sections.he)) {
          event.content.he.sections = body.sections.he.map((s: any) => ({
            type: s.type,
            order: typeof s.order === 'number' ? s.order : 0,
            level: s.level,
            content: s.content,
            listType: s.listType,
            items: Array.isArray(s.items) ? s.items : [],
            data: s.data,
            links: Array.isArray(s.links) ? s.links : [],
            boxStyle: s.boxStyle,
          }));
        }
      }
    } else {
      event.content = {
        en: {
          title: body.title?.en ?? '',
          description: body.description?.en ?? '',
          tags: Array.isArray(body.tags) ? body.tags : [],
          sections: [],
        },
        he: {
          title: body.title?.he ?? '',
          description: body.description?.he ?? '',
          tags: Array.isArray(body.tags) ? body.tags : [],
          sections: [],
        },
      };
    }

    // dateTime
    if (event.dateTime) {
      if (body.startDate !== undefined) event.dateTime.startDate = new Date(body.startDate);
      if (body.endDate !== undefined) event.dateTime.endDate = new Date(body.endDate);
      if (body.timezone !== undefined) {
        event.dateTime.timezone = {
          en: body.timezone,
          he: event.dateTime.timezone?.he ?? body.timezone,
        };
      }
    } else {
      event.dateTime = {
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        timezone: { en: body.timezone || 'Asia/Jerusalem', he: body.timezone || 'אסיה/ירושלים' },
      };
    }

    // media array (each item: id, url, type, cloudinaryId, altText { en, he }, caption { en, he }, usedInSections)
    if (body.media !== undefined && Array.isArray(body.media)) {
      event.media = body.media.map((m: any, idx: number) => {
        const en = m.altText?.en != null ? String(m.altText.en) : '';
        const he = m.altText?.he != null ? String(m.altText.he) : '';
        return {
          id: m.id || `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          url: m.url || '',
          type: m.type === 'video' ? 'video' : 'image',
          cloudinaryId: m.cloudinaryId || undefined,
          altText: { en, he },
          caption: {
            en: m.caption?.en != null ? String(m.caption.en) : '',
            he: m.caption?.he != null ? String(m.caption.he) : '',
          },
          usedInSections: Array.isArray(m.usedInSections) ? m.usedInSections : [],
        };
      });
    }

    // featuredImage (model expects { url, altText, cloudinaryId? })
    if (body.featuredImage !== undefined) {
      const fi = body.featuredImage;
      const url = typeof fi === 'string' ? fi : (fi?.url ?? '');
      const cloudinaryId = typeof fi === 'object' && fi?.cloudinaryId !== undefined ? fi.cloudinaryId : (event.featuredImage && typeof event.featuredImage === 'object' ? event.featuredImage.cloudinaryId : undefined);
      const altText = typeof fi === 'object' && fi?.altText
        ? { en: fi.altText.en ?? '', he: fi.altText.he ?? '' }
        : (event.featuredImage && typeof event.featuredImage === 'object' ? event.featuredImage.altText : { en: '', he: '' });
      event.featuredImage = {
        url,
        ...(cloudinaryId !== undefined && cloudinaryId !== '' && { cloudinaryId: String(cloudinaryId) }),
        altText,
      };
    }

    if (!Array.isArray(event.relatedSports)) {
      event.relatedSports = [];
    }
    // Normalize media.altText so every item has en/he strings (required by schema).
    if (Array.isArray(event.media)) {
      event.media = event.media.map((m: any, idx: number) => {
        const altEn = (m.altText?.en != null && m.altText?.en !== undefined ? String(m.altText.en) : '') as string;
        const altHe = (m.altText?.he != null && m.altText?.he !== undefined ? String(m.altText.he) : '') as string;
        return {
          id: m.id || `media-${Date.now()}-${idx}`,
          url: m.url || '',
          type: m.type === 'video' ? 'video' : 'image',
          cloudinaryId: m.cloudinaryId || undefined,
          altText: { en: altEn, he: altHe },
          caption: {
            en: m.caption?.en != null ? String(m.caption.en) : '',
            he: m.caption?.he != null ? String(m.caption.he) : '',
          },
          usedInSections: Array.isArray(m.usedInSections) ? m.usedInSections : [],
        };
      });
    }

    await event.save();

    // Increment events version to invalidate client caches
    const settings = await Settings.findOrCreate();
    const currentVersion = settings.eventsVersion || 1;
    settings.eventsVersion = currentVersion + 0.00001;
    await settings.save();

    // Format response for form (same shape as GET)
    const hasNewSchema = event.content && event.dateTime;
    const titleEn = hasNewSchema ? event.content.en?.title : '';
    const titleHe = hasNewSchema ? event.content.he?.title : '';
    const descEn = hasNewSchema ? event.content.en?.description : '';
    const descHe = hasNewSchema ? event.content.he?.description : '';
    const startDate = event.dateTime?.startDate ?? null;
    const endDate = event.dateTime?.endDate ?? null;
    const timezoneStr = event.dateTime?.timezone?.en || event.dateTime?.timezone?.he || 'Asia/Jerusalem';
    const featuredImageObj = typeof event.featuredImage === 'object' && event.featuredImage
      ? {
          url: event.featuredImage.url || '',
          cloudinaryId: event.featuredImage.cloudinaryId || '',
          altText: {
            en: event.featuredImage.altText?.en || '',
            he: event.featuredImage.altText?.he || '',
          },
        }
      : { url: '', cloudinaryId: '', altText: { en: '', he: '' } };
    const tags = event.content?.en?.tags ?? event.content?.he?.tags ?? [];

    const formattedEvent = {
      id: event._id.toString(),
      slug: event.slug,
      title: { en: titleEn || '', he: titleHe || '' },
      description: { en: descEn || '', he: descHe || '' },
      shortDescription: '',
      startDate,
      endDate,
      timezone: timezoneStr,
      isAllDay: false,
      location: event.location,
      images: [],
      media: Array.isArray(event.media)
        ? event.media.map((m: any) => ({
            id: m.id || '',
            url: m.url || '',
            type: m.type || 'image',
            cloudinaryId: m.cloudinaryId || '',
            altText: { en: m.altText?.en ?? '', he: m.altText?.he ?? '' },
            caption: { en: m.caption?.en ?? '', he: m.caption?.he ?? '' },
            usedInSections: Array.isArray(m.usedInSections) ? m.usedInSections : [],
          }))
        : [],
      featuredImage: featuredImageObj,
      videoUrl: '',
      relatedSports: event.relatedSports || [],
      type: event.type || '',
      organizer: { name: '', email: '', phone: '' },
      capacity: undefined,
      isFree: event.isFree,
      price: undefined,
      currency: 'ILS',
      registrationUrl: event.registrationUrl || '',
      viewsCount: event.viewCount ?? event.viewsCount ?? 0,
      interestedCount: event.interestedCount ?? 0,
      status: event.status,
      isFeatured: event.isFeatured,
      isPublic: true,
      registrationRequired: event.registrationRequired ?? false,
      metaTitle: event.metaTitle ?? { en: '', he: '' },
      metaDescription: event.metaDescription ?? { en: '', he: '' },
      metaKeywords: event.metaKeywords ?? { en: '', he: '' },
      tags: Array.isArray(tags) ? tags : [],
      notes: '',
      sections: {
        en: event.content?.en?.sections ?? [],
        he: event.content?.he?.sections ?? [],
      },
    };

    return NextResponse.json({
      message: 'Event updated successfully',
      event: formattedEvent,
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'field';
      const duplicateValue = error.keyValue ? Object.values(error.keyValue)[0] : 'value';
      
      if (duplicateField === 'slug') {
        return NextResponse.json(
          { error: `An event with the slug "${duplicateValue}" already exists. Please choose a different slug.` },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `An event with this ${duplicateField} already exists.` },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message || 'Validation failed' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

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

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await event.deleteOne();

    // Increment events version to invalidate client caches
    const settings = await Settings.findOrCreate();
    const currentVersion = settings.eventsVersion || 1;
    settings.eventsVersion = currentVersion + 0.00001;
    await settings.save();

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}
