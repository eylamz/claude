import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Settings from '@/lib/models/Settings';
import { isBlocked, record404, recordSuccess } from '@/lib/utils/circuitBreaker';

const ENDPOINT = '/api/skateparks/[slug]';

/**
 * Skatepark Detail API Route
 * 
 * GET /api/skateparks/[slug]
 * 
 * Fetches a single skatepark by slug with nearby parks
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Check circuit breaker - if blocked, return early without database call
    // Use slug as the identifier for this endpoint
    if (isBlocked(ENDPOINT, slug.toLowerCase())) {
      return NextResponse.json(
        { error: 'Skatepark not found', message: 'Resource access temporarily blocked due to repeated 404 errors' },
        { status: 404 }
      );
    }

    await connectDB();

    const skatepark = await Skatepark.findOne({ slug: slug.toLowerCase(), status: 'active' }).lean();

    if (!skatepark) {
      // Record 404 error
      record404(ENDPOINT, slug.toLowerCase());
      return NextResponse.json(
        { error: 'Skatepark not found' },
        { status: 404 }
      );
    }

    // Record success to reset counter
    recordSuccess(ENDPOINT, slug.toLowerCase());

    const [lng, lat] = skatepark.location.coordinates;

    // Get nearby parks (same area, limit 4 excluding current)
    const nearbyParks = await Skatepark.find({
      area: skatepark.area,
      status: 'active',
      _id: { $ne: skatepark._id },
    })
      .limit(4)
      .select('slug name images location area rating totalReviews')
      .lean();

    // Format nearby parks
    const formattedNearby = nearbyParks.map((park: any) => ({
      _id: park._id.toString(),
      slug: park.slug,
      name: park.name,
      imageUrl: park.images?.[0]?.url || '/placeholder-skatepark.jpg',
      area: park.area,
      rating: park.rating || 0,
      totalReviews: park.totalReviews || 0,
    }));

    // Check if open now
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      now.getDay()
    ];
    const dayHours = skatepark.operatingHours?.[currentDay as keyof typeof skatepark.operatingHours];
    let isOpen = false;
    if (skatepark.lightingHours?.is24Hours) {
      isOpen = true;
    } else if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      isOpen = currentTime >= dayHours.open && currentTime <= dayHours.close;
    }

    // Format response
    const formattedSkatepark = {
      _id: skatepark._id.toString(),
      slug: skatepark.slug,
      name: skatepark.name,
      address: skatepark.address,
      area: skatepark.area,
      location: {
        lat,
        lng,
      },
      images: skatepark.images || [],
      operatingHours: skatepark.operatingHours || {},
      lightingHours: skatepark.lightingHours || undefined,
      amenities: skatepark.amenities || {},
      openingYear: skatepark.openingYear,
      closingYear: skatepark.closingYear,
      notes: skatepark.notes || {},
      rating: skatepark.rating || 0,
      totalReviews: skatepark.totalReviews || 0,
      mediaLinks: skatepark.mediaLinks || {},
      isOpen,
      createdAt: skatepark.createdAt,
      updatedAt: skatepark.updatedAt,
    };

    // Get cache version
    const settings = await Settings.findOrCreate();
    const version = settings.skateparksVersion || 1;

    return NextResponse.json({
      skatepark: formattedSkatepark,
      nearbyParks: formattedNearby,
      version,
    });
  } catch (error) {
    console.error('Error fetching skatepark:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


