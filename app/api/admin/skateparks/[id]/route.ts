import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Skatepark from '@/lib/models/Skatepark';
import Settings from '@/lib/models/Settings';
import mongoose from 'mongoose';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';
import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';

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
      openingYear: skatepark.openingYear ?? null,
      openingMonth: skatepark.openingMonth ?? null,
      closingYear: skatepark.closingYear ?? null,
      closingMonth: skatepark.closingMonth ?? null,
      notes: skatepark.notes || { en: '', he: '' },
      isFeatured: skatepark.isFeatured || false,
      skillLevel: skatepark.skillLevel ?? (skatepark as any).beginners !== undefined
        ? { beginners: (skatepark as any).beginners || false, advanced: (skatepark as any).advanced || false, pro: (skatepark as any).pro || false }
        : { beginners: false, advanced: false, pro: false },
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

    // Store old slug before any updates
    const oldSlug = skatepark.slug;

    const body = await request.json();
    console.log('Update request body keys:', Object.keys(body));
    console.log('Update request body sample:', {
      name: body.name,
      location: body.location,
      operatingHours: body.operatingHours,
      openingYear: body.openingYear,
      openingMonth: body.openingMonth,
      closingYear: body.closingYear,
      closingMonth: body.closingMonth,
    });
    console.log('Raw body openingMonth:', body.openingMonth, 'closingMonth:', body.closingMonth);
    
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
      openingMonth,
      closingYear,
      closingMonth,
      notes,
      is24Hours,
      isFeatured,
      skillLevel,
      status,
      mediaLinks,
      seoMetadata,
      qualityRating,
    } = body;

    // Update fields - explicitly set each field to ensure changes are saved
    if (slug !== undefined) skatepark.slug = slug;
    if (name !== undefined) {
      skatepark.name = name;
      skatepark.markModified('name');
    }
    if (address !== undefined) {
      skatepark.address = address;
      skatepark.markModified('address');
    }
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
          skatepark.markModified('location');
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
          skatepark.markModified('location');
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
      skatepark.markModified('images');
    }
    if (operatingHours !== undefined) {
      // Clean up operating hours - only include times when isOpen is true
      const cleanedOperatingHours: any = {};
      if (operatingHours) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'holidays'];
        days.forEach((day) => {
          const dayHours = operatingHours[day];
          if (dayHours && dayHours.isOpen === true && dayHours.openingTime && dayHours.closingTime) {
            cleanedOperatingHours[day] = {
              isOpen: true,
              openingTime: dayHours.openingTime,
              closingTime: dayHours.closingTime,
            };
          } else if (dayHours) {
            // When closed, only include isOpen - don't include time fields
            cleanedOperatingHours[day] = {
              isOpen: false,
            };
          }
        });
      }
      skatepark.operatingHours = cleanedOperatingHours;
      skatepark.markModified('operatingHours');
    }
    // Handle lightingHours from frontend
    if (lightingHours !== undefined) {
      skatepark.lightingHours = {
        is24Hours: lightingHours.is24Hours || false,
        endTime: lightingHours.endTime || '',
      };
      skatepark.markModified('lightingHours');
    }
    // Also support direct lightingUntil and is24Hours for backward compatibility
    if (lightingUntil !== undefined || is24Hours !== undefined) {
      if (!skatepark.lightingHours) {
        skatepark.lightingHours = {
          is24Hours: false,
          endTime: '',
        };
      }
      if (lightingUntil !== undefined) {
        skatepark.lightingHours.endTime = lightingUntil;
      }
      if (is24Hours !== undefined) {
        skatepark.lightingHours.is24Hours = is24Hours;
      }
      skatepark.markModified('lightingHours');
    }
    if (amenities !== undefined) {
      skatepark.amenities = amenities;
      skatepark.markModified('amenities');
    }
    // Handle openingYear/openingMonth - allow null values (null means "not specified")
    if (openingYear !== undefined) {
      if (openingYear === null || openingYear === '' || openingYear === 0) {
        skatepark.openingYear = null;
        skatepark.markModified('openingYear');
        // Only clear month if year is being cleared
        if (openingMonth === undefined) {
          skatepark.openingMonth = null;
          skatepark.markModified('openingMonth');
        }
      } else {
        const currentYear = new Date().getFullYear();
        const year = typeof openingYear === 'number' ? openingYear : parseInt(openingYear);
        if (!isNaN(year) && year >= 1900 && year <= currentYear) {
          skatepark.openingYear = year;
          skatepark.markModified('openingYear');
        } else {
          // Invalid year - keep existing value or set to null
          console.warn(`Invalid openingYear: ${openingYear}, keeping existing value`);
        }
      }
    }
    if (openingMonth !== undefined) {
      if (openingMonth === null || openingMonth === '' || openingMonth === 0) {
        skatepark.openingMonth = null; // Store null instead of undefined
        skatepark.markModified('openingMonth');
      } else {
        const month = typeof openingMonth === 'number' ? openingMonth : parseInt(openingMonth);
        if (!isNaN(month) && month >= 1 && month <= 12) {
          skatepark.openingMonth = month;
          skatepark.markModified('openingMonth');
        } else {
          console.warn(`Invalid openingMonth: ${openingMonth}, keeping existing value`);
        }
      }
    }
    // Handle closingYear/closingMonth - allow null values (null means "not specified")
    if (closingYear !== undefined) {
      if (closingYear === null || closingYear === '' || closingYear === 0) {
        skatepark.closingYear = null;
        skatepark.markModified('closingYear');
        // Only clear month if year is being cleared
        if (closingMonth === undefined) {
          skatepark.closingMonth = null;
          skatepark.markModified('closingMonth');
        }
      } else {
        const year = typeof closingYear === 'number' ? closingYear : parseInt(closingYear);
        if (!isNaN(year) && year >= 1900) {
          skatepark.closingYear = year;
          skatepark.markModified('closingYear');
        } else {
          // Invalid year - keep existing value or set to null
          console.warn(`Invalid closingYear: ${closingYear}, keeping existing value`);
        }
      }
    }
    if (closingMonth !== undefined) {
      if (closingMonth === null || closingMonth === '' || closingMonth === 0) {
        skatepark.closingMonth = null; // Store null instead of undefined
        skatepark.markModified('closingMonth');
      } else {
        const month = typeof closingMonth === 'number' ? closingMonth : parseInt(closingMonth);
        if (!isNaN(month) && month >= 1 && month <= 12) {
          skatepark.closingMonth = month;
          skatepark.markModified('closingMonth');
        } else {
          console.warn(`Invalid closingMonth: ${closingMonth}, keeping existing value`);
        }
      }
    }
    if (notes !== undefined) {
      skatepark.notes = notes;
      skatepark.markModified('notes');
    }
    if (is24Hours !== undefined) skatepark.is24Hours = is24Hours;
    if (isFeatured !== undefined) skatepark.isFeatured = isFeatured;
    if (skillLevel !== undefined) {
      skatepark.skillLevel = {
        beginners: skillLevel.beginners ?? false,
        advanced: skillLevel.advanced ?? false,
        pro: skillLevel.pro ?? false,
      };
      skatepark.markModified('skillLevel');
    }
    if (status !== undefined) skatepark.status = status;
    if (mediaLinks !== undefined) {
      skatepark.mediaLinks = mediaLinks;
      skatepark.markModified('mediaLinks');
    }
    if (seoMetadata !== undefined) {
      skatepark.seoMetadata = seoMetadata;
      skatepark.markModified('seoMetadata');
    }
    if (qualityRating !== undefined) {
      skatepark.qualityRating = qualityRating;
      skatepark.markModified('qualityRating');
    }

    console.log('About to save skatepark with data:', {
      name: skatepark.name,
      location: skatepark.location,
      operatingHours: skatepark.operatingHours,
      amenities: skatepark.amenities,
      openingYear: skatepark.openingYear,
      openingMonth: skatepark.openingMonth,
      closingYear: skatepark.closingYear,
      closingMonth: skatepark.closingMonth,
      mediaLinks: skatepark.mediaLinks,
    });
    console.log('Month values before save - openingMonth:', skatepark.openingMonth, 'type:', typeof skatepark.openingMonth, 'closingMonth:', skatepark.closingMonth, 'type:', typeof skatepark.closingMonth);
    
    // Explicitly ensure months are set (even if null) before saving
    if (openingMonth !== undefined) {
      const monthValue = openingMonth === null || openingMonth === '' || openingMonth === 0 
        ? null 
        : (typeof openingMonth === 'number' ? openingMonth : parseInt(openingMonth));
      skatepark.set('openingMonth', monthValue);
      skatepark.markModified('openingMonth');
      console.log('Set openingMonth to:', monthValue);
    }
    if (closingMonth !== undefined) {
      const monthValue = closingMonth === null || closingMonth === '' || closingMonth === 0 
        ? null 
        : (typeof closingMonth === 'number' ? closingMonth : parseInt(closingMonth));
      skatepark.set('closingMonth', monthValue);
      skatepark.markModified('closingMonth');
      console.log('Set closingMonth to:', monthValue);
    }

    // Log the document's modified paths
    console.log('Modified paths:', skatepark.modifiedPaths());
    console.log('Schema paths includes openingMonth:', skatepark.schema.paths.openingMonth ? 'YES' : 'NO');
    console.log('Schema paths includes closingMonth:', skatepark.schema.paths.closingMonth ? 'YES' : 'NO');
    
    // Build update object for all changes including month fields
    const updateData: any = {};
    
    // Add month fields to update if they're being changed
    if (openingMonth !== undefined) {
      const monthValue = openingMonth === null || openingMonth === '' || openingMonth === 0 
        ? null 
        : (typeof openingMonth === 'number' ? openingMonth : parseInt(openingMonth));
      updateData.openingMonth = monthValue;
      skatepark.openingMonth = monthValue;
    }
    if (closingMonth !== undefined) {
      const monthValue = closingMonth === null || closingMonth === '' || closingMonth === 0 
        ? null 
        : (typeof closingMonth === 'number' ? closingMonth : parseInt(closingMonth));
      updateData.closingMonth = monthValue;
      skatepark.closingMonth = monthValue;
    }
    
    // Use updateOne with $set to directly update MongoDB for month fields
    // This bypasses any potential Mongoose schema caching issues
    if (Object.keys(updateData).length > 0) {
      console.log('Using updateOne with $set for months:', updateData);
      const updateResult = await Skatepark.updateOne(
        { _id: skatepark._id },
        { $set: updateData }
      );
      console.log('Update result:', updateResult);
    }

    // Now save the rest of the changes (this will also update the document instance)
    const savedSkatepark = await skatepark.save();
    console.log('After save - openingMonth:', savedSkatepark.openingMonth, 'closingMonth:', savedSkatepark.closingMonth);
    
    // Verify in database by fetching fresh using raw MongoDB query to bypass Mongoose
    const db = mongoose.connection.db;
    if (db) {
      const collection = db.collection('skateparks');
      const rawDoc = await collection.findOne({ _id: new mongoose.Types.ObjectId(savedSkatepark._id) });
      console.log('Raw MongoDB doc - openingMonth:', rawDoc?.openingMonth, 'closingMonth:', rawDoc?.closingMonth);
      console.log('Raw MongoDB doc keys:', Object.keys(rawDoc || {}));
    }
    
    // Also try with Mongoose
    const verifyDocLean = await Skatepark.findById(savedSkatepark._id).lean();
    const verifyDoc = await Skatepark.findById(savedSkatepark._id);
    console.log('Verified from DB (lean) - openingMonth:', verifyDocLean?.openingMonth, 'closingMonth:', verifyDocLean?.closingMonth);
    console.log('Verified from DB (non-lean) - openingMonth:', verifyDoc?.openingMonth, 'closingMonth:', verifyDoc?.closingMonth);
    console.log('Full lean doc:', JSON.stringify(verifyDocLean, null, 2));
    
    console.log('Skatepark saved successfully');

    // Revalidate the updated skatepark page for all locales
    const currentSlug = savedSkatepark.slug;
    
    // Revalidate current slug pages
    for (const locale of locales) {
      revalidatePath(`/${locale}/skateparks/${currentSlug}`, 'page');
    }
    
    // If slug changed, also revalidate old slug pages
    if (oldSlug && oldSlug !== currentSlug) {
      for (const locale of locales) {
        revalidatePath(`/${locale}/skateparks/${oldSlug}`, 'page');
      }
    }
    
    // Also revalidate the skateparks listing page
    for (const locale of locales) {
      revalidatePath(`/${locale}/skateparks`, 'page');
    }

    // Bump skateparks version so client caches (localStorage skateparks_cache) refetch
    try {
      const settings = await Settings.findOrCreate();
      const currentVersion = settings.skateparksVersion || 1;
      settings.skateparksVersion = currentVersion + 0.00001;
      await settings.save();
    } catch (versionError) {
      console.error('Failed to increment skateparks version:', versionError);
    }

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

    // Revalidate the deleted skatepark page for all locales
    const deletedSlug = skatepark.slug;
    for (const locale of locales) {
      revalidatePath(`/${locale}/skateparks/${deletedSlug}`, 'page');
    }
    
    // Also revalidate the skateparks listing page
    for (const locale of locales) {
      revalidatePath(`/${locale}/skateparks`, 'page');
    }

    // Bump skateparks version so client caches (localStorage skateparks_cache) refetch
    try {
      const settings = await Settings.findOrCreate();
      const currentVersion = settings.skateparksVersion || 1;
      settings.skateparksVersion = currentVersion + 0.00001;
      await settings.save();
    } catch (versionError) {
      console.error('Failed to increment skateparks version:', versionError);
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

