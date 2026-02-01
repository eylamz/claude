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

    // Get all active parks (excluding current) - no area filter
    const allParks = await Skatepark.find({
      status: 'active',
      _id: { $ne: skatepark._id },
    })
      .select('slug name images location area rating totalReviews')
      .lean();

    // Calculate distance for each park and sort by distance
    const parksWithDistance = allParks
      .map((park: any) => {
        const coords = park.location?.coordinates;
        if (!coords || !Array.isArray(coords) || coords.length < 2) {
          return null; // Skip parks with invalid coordinates
        }
        
        const [parkLng, parkLat] = coords;
        
        // Skip parks with invalid coordinates (0,0)
        if (parkLng === 0 && parkLat === 0) {
          return null;
        }
        
        // Haversine formula to calculate distance
        const R = 6371; // Earth's radius in km
        const dLat = ((parkLat - lat) * Math.PI) / 180;
        const dLng = ((parkLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((parkLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return { ...park, distance };
      })
      .filter((park): park is NonNullable<typeof park> => park !== null) // Remove null entries
      .sort((a, b) => a.distance - b.distance) // Sort by distance (closest first)
      .slice(0, 4); // Take top 4 closest

    // Format nearby parks (remove distance from response)
    const formattedNearby = parksWithDistance.map((park: any) => {
      const coords = park.location?.coordinates;
      const [parkLng, parkLat] = coords || [0, 0];
      
      // Only include location if coordinates are valid (non-zero)
      const hasValidCoords = coords && 
                             Array.isArray(coords) && 
                             coords.length >= 2 && 
                             (coords[0] !== 0 || coords[1] !== 0);
      
      return {
        _id: park._id.toString(),
        slug: park.slug,
        name: park.name,
        imageUrl: park.images?.[0]?.url || PLACEHOLDER_SKATEPARK_IMAGE,
        area: park.area,
        rating: park.rating || 0,
        totalReviews: park.totalReviews || 0,
        location: hasValidCoords ? {
          lat: parkLat,
          lng: parkLng,
        } : undefined,
      };
    });

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

    // Format response with all fields including mediaLinks, isFeatured, status, etc.
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
      openingYear: skatepark.openingYear ?? null,
      openingMonth: skatepark.openingMonth ?? null,
      closingYear: skatepark.closingYear ?? null,
      closingMonth: skatepark.closingMonth ?? null,
      notes: skatepark.notes || {},
      rating: skatepark.rating || 0,
      totalReviews: skatepark.totalReviews || 0,
      mediaLinks: skatepark.mediaLinks || {},
      isFeatured: skatepark.isFeatured || false,
      status: skatepark.status || 'active',
      seoMetadata: skatepark.seoMetadata || undefined,
      qualityRating: skatepark.qualityRating || undefined,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


