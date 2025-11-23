import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Skatepark from '@/lib/models/Skatepark';
import mongoose from 'mongoose';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';

const ENDPOINT = '/api/admin/skateparks/[id]';

/**
 * GET /api/admin/skateparks/[id]
 * Get a single skatepark by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId first (before checking circuit breaker)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid skatepark ID' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, id)) {
      return NextResponse.json(
        { error: 'Skatepark not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Verify authentication (before database call)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const skatepark = await Skatepark.findById(id).lean();

    if (!skatepark) {
      // Record 404 error
      record404(ENDPOINT, id);
      return NextResponse.json({ error: 'Skatepark not found' }, { status: 404 });
    }

    // Record success to reset counter
    recordSuccess(ENDPOINT, id);

    const [lng, lat] = skatepark.location?.coordinates || [0, 0];

    // Format response
    const formattedSkatepark = {
      id: skatepark._id.toString(),
      slug: skatepark.slug,
      name: skatepark.name || { en: '', he: '' },
      address: skatepark.address || {},
      area: skatepark.area || '',
      location: {
        lat,
        lng,
      },
      images: (skatepark.images || []).map((img: any) => ({
        url: img.url,
        isFeatured: img.isFeatured || false,
        orderNumber: img.orderNumber ?? img.order ?? 0,
        publicId: img.publicId || '',
      })),
      operatingHours: skatepark.operatingHours || {},
      lightingHours: skatepark.is24Hours || skatepark.lightingUntil ? {
        is24Hours: skatepark.is24Hours || false,
        endTime: skatepark.lightingUntil || '',
      } : undefined,
      amenities: skatepark.amenities || {},
      openingYear: skatepark.openingYear || null,
      closingYear: skatepark.closingYear || null,
      notes: skatepark.notes || { en: '', he: '' },
      isFeatured: skatepark.isFeatured || false,
      status: skatepark.status || 'active',
      mediaLinks: skatepark.mediaLinks || { youtube: '', googleMapsFrame: '' },
      rating: skatepark.rating || 0,
      totalReviews: skatepark.totalReviews || 0,
      createdAt: skatepark.createdAt,
      updatedAt: skatepark.updatedAt,
    };

    return NextResponse.json({ skatepark: formattedSkatepark });
  } catch (error: any) {
    console.error('Skatepark API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skatepark' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/skateparks/[id]
 * Update a skatepark by ID
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId first (before checking circuit breaker)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid skatepark ID' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, id)) {
      return NextResponse.json(
        { error: 'Skatepark not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Verify authentication (before database call)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const skatepark = await Skatepark.findById(id);
    if (!skatepark) {
      // Record 404 error
      record404(ENDPOINT, id);
      return NextResponse.json({ error: 'Skatepark not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      slug,
      name,
      address,
      area,
      location,
      images,
      operatingHours,
      lightingHours,
      lightingUntil,
      amenities,
      openingYear,
      closingYear,
      notes,
      is24Hours,
      isFeatured,
      status,
      mediaLinks,
    } = body;

    // Update fields
    if (slug !== undefined) skatepark.slug = slug;
    if (name !== undefined) skatepark.name = name;
    if (address !== undefined) skatepark.address = address;
    if (area !== undefined) skatepark.area = area;
    if (location !== undefined) {
      // Handle location in different formats
      if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        // Format: { type: 'Point', coordinates: [lng, lat] }
        const lng = typeof location.coordinates[0] === 'number' 
          ? location.coordinates[0] 
          : parseFloat(location.coordinates[0]);
        const lat = typeof location.coordinates[1] === 'number' 
          ? location.coordinates[1] 
          : parseFloat(location.coordinates[1]);
        
        if (!isNaN(lng) && !isNaN(lat)) {
          skatepark.location = {
            type: 'Point',
            coordinates: [lng, lat] as [number, number],
          };
          console.log('Updated location coordinates:', skatepark.location.coordinates);
        }
      } else if (location.lng !== undefined && location.lat !== undefined) {
        // Format: { lng: number, lat: number }
        const lng = typeof location.lng === 'number' ? location.lng : parseFloat(location.lng);
        const lat = typeof location.lat === 'number' ? location.lat : parseFloat(location.lat);
        
        if (!isNaN(lng) && !isNaN(lat)) {
          skatepark.location = {
            type: 'Point',
            coordinates: [lng, lat] as [number, number],
          };
          console.log('Updated location coordinates:', skatepark.location.coordinates);
        }
      }
    }
    if (images !== undefined) {
      // Clean up images: convert empty publicId strings to undefined and ensure orderNumber is set
      skatepark.images = images.map((img: any, index: number) => ({
        url: img.url || '',
        isFeatured: img.isFeatured || false,
        orderNumber: img.orderNumber ?? img.order ?? index,
        publicId: img.publicId && img.publicId.trim() ? img.publicId.trim() : undefined,
      }));
    }
    if (operatingHours !== undefined) skatepark.operatingHours = operatingHours;
    // Handle lightingHours from frontend (converts to is24Hours and lightingUntil)
    if (lightingHours !== undefined) {
      skatepark.is24Hours = lightingHours.is24Hours || false;
      skatepark.lightingUntil = lightingHours.endTime || null;
    }
    // Also support direct lightingUntil and is24Hours for backward compatibility
    if (lightingUntil !== undefined) skatepark.lightingUntil = lightingUntil;
    if (is24Hours !== undefined) skatepark.is24Hours = is24Hours;
    if (amenities !== undefined) skatepark.amenities = amenities;
    if (openingYear !== undefined) skatepark.openingYear = openingYear;
    if (closingYear !== undefined) skatepark.closingYear = closingYear;
    if (notes !== undefined) skatepark.notes = notes;
    if (is24Hours !== undefined) skatepark.is24Hours = is24Hours;
    if (isFeatured !== undefined) skatepark.isFeatured = isFeatured;
    if (status !== undefined) skatepark.status = status;
    if (mediaLinks !== undefined) skatepark.mediaLinks = mediaLinks;

    await skatepark.save();

    // Record success to reset counter
    recordSuccess(ENDPOINT, id);

    return NextResponse.json({
      message: 'Skatepark updated successfully',
      skatepark,
    });
  } catch (error: any) {
    console.error('Update skatepark error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update skatepark' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/skateparks/[id]
 * Delete a skatepark by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ObjectId first (before checking circuit breaker)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid skatepark ID' }, { status: 400 });
    }

    // Check circuit breaker - if blocked, return early without database call
    if (isBlocked(ENDPOINT, id)) {
      return NextResponse.json(
        { error: 'Skatepark not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    // Verify authentication (before database call)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const skatepark = await Skatepark.findByIdAndDelete(id);
    if (!skatepark) {
      // Record 404 error
      record404(ENDPOINT, id);
      return NextResponse.json({ error: 'Skatepark not found' }, { status: 404 });
    }

    // Record success to reset counter (even for delete)
    recordSuccess(ENDPOINT, id);

    return NextResponse.json({ message: 'Skatepark deleted successfully' });
  } catch (error: any) {
    console.error('Delete skatepark error:', error);
    return NextResponse.json(
      { error: 'Failed to delete skatepark' },
      { status: 500 }
    );
  }
}

