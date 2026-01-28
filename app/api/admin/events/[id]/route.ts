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

    // Format event data
    const formattedEvent = {
      id: event._id.toString(),
      slug: event.slug,
      title: event.title || { en: '', he: '' },
      description: event.description || { en: '', he: '' },
      shortDescription: event.shortDescription || { en: '', he: '' },
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone || 'Asia/Jerusalem',
      isAllDay: event.isAllDay || false,
      location: event.location || {
        name: { en: '', he: '' },
        address: { en: '', he: '' },
      },
      images: event.images || [],
      featuredImage: event.featuredImage || '',
      videoUrl: event.videoUrl,
      relatedSports: event.relatedSports || [],
      category: event.category || '',
      organizer: event.organizer || {
        name: '',
        email: '',
        phone: '',
      },
      capacity: event.capacity,
      isFree: event.isFree !== undefined ? event.isFree : true,
      price: event.price,
      currency: event.currency || 'ILS',
      registrationUrl: event.registrationUrl,
      viewsCount: event.viewsCount || 0,
      interestedCount: event.interestedCount || 0,
      attendedCount: currentParticipants,
      status: event.status || 'draft',
      isFeatured: event.isFeatured || false,
      isPublic: event.isPublic !== undefined ? event.isPublic : true,
      registrationRequired: event.registrationRequired || false,
      metaTitle: event.metaTitle,
      metaDescription: event.metaDescription,
      tags: event.tags || [],
      notes: event.notes,
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
    
    // Update fields
    if (body.slug !== undefined) event.slug = body.slug;
    if (body.title !== undefined) event.title = body.title;
    if (body.description !== undefined) event.description = body.description;
    if (body.shortDescription !== undefined) event.shortDescription = body.shortDescription;
    if (body.startDate !== undefined) event.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) event.endDate = new Date(body.endDate);
    if (body.timezone !== undefined) event.timezone = body.timezone;
    if (body.isAllDay !== undefined) event.isAllDay = body.isAllDay;
    if (body.location !== undefined) event.location = body.location;
    if (body.images !== undefined) event.images = body.images;
    if (body.featuredImage !== undefined) event.featuredImage = body.featuredImage;
    if (body.videoUrl !== undefined) event.videoUrl = body.videoUrl;
    if (body.relatedSports !== undefined) event.relatedSports = body.relatedSports;
    if (body.category !== undefined) event.category = body.category;
    if (body.organizer !== undefined) event.organizer = body.organizer;
    if (body.capacity !== undefined) event.capacity = body.capacity;
    if (body.isFree !== undefined) event.isFree = body.isFree;
    if (body.price !== undefined) event.price = body.price;
    if (body.currency !== undefined) event.currency = body.currency;
    if (body.registrationUrl !== undefined) event.registrationUrl = body.registrationUrl;
    if (body.status !== undefined) event.status = body.status;
    if (body.isFeatured !== undefined) event.isFeatured = body.isFeatured;
    if (body.isPublic !== undefined) event.isPublic = body.isPublic;
    if (body.registrationRequired !== undefined) event.registrationRequired = body.registrationRequired;
    if (body.metaTitle !== undefined) event.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) event.metaDescription = body.metaDescription;
    if (body.tags !== undefined) event.tags = body.tags;
    if (body.notes !== undefined) event.notes = body.notes;

    await event.save();

    // Increment events version to invalidate client caches
    const settings = await Settings.findOrCreate();
    const currentVersion = settings.eventsVersion || 1;
    settings.eventsVersion = currentVersion + 0.00001;
    await settings.save();

    // Format response
    const formattedEvent = {
      id: event._id.toString(),
      slug: event.slug,
      title: event.title,
      description: event.description,
      shortDescription: event.shortDescription,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      isAllDay: event.isAllDay,
      location: event.location,
      images: event.images,
      featuredImage: event.featuredImage,
      videoUrl: event.videoUrl,
      relatedSports: event.relatedSports,
      category: event.category,
      organizer: event.organizer,
      capacity: event.capacity,
      isFree: event.isFree,
      price: event.price,
      currency: event.currency,
      registrationUrl: event.registrationUrl,
      viewsCount: event.viewsCount,
      interestedCount: event.interestedCount,
      status: event.status,
      isFeatured: event.isFeatured,
      isPublic: event.isPublic,
      registrationRequired: event.registrationRequired,
      metaTitle: event.metaTitle,
      metaDescription: event.metaDescription,
      tags: event.tags,
      notes: event.notes,
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
