import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import Settings from '@/lib/models/Settings';

/**
 * Skateparks API Route
 * 
 * GET /api/skateparks
 * 
 * Fetches all skateparks with filtering (no pagination, no server-side sorting)
 */

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const versionOnly = searchParams.get('versionOnly') === 'true';
    
    // If only version is requested, return it without fetching skateparks
    if (versionOnly) {
      const settings = await Settings.findOrCreate();
      const version = settings.skateparksVersion || 1;
      return NextResponse.json({ version });
    }

    const area = searchParams.get('area'); // 'north' | 'center' | 'south'
    const search = searchParams.get('search')?.trim();
    const amenities = searchParams.getAll('amenities'); // array of amenity keys
    const openNow = searchParams.get('openNow') === 'true';
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

    // Build query
    const query: any = {
      status: 'active',
    };

    // Area filter
    if (area && ['north', 'center', 'south'].includes(area)) {
      query.area = area;
    }

    // Search filter (text search)
    if (search && search.length > 0) {
      query.$text = { $search: search };
    }

    // Amenities filter
    if (amenities.length > 0) {
      const amenityQueries = amenities.map((key) => ({
        [`amenities.${key}`]: true,
      }));
      query.$and = amenityQueries;
    }

    // Fetch ALL skateparks (no pagination, no sorting)
    let skateparks = await Skatepark.find(query).lean();

    // Filter by "open now" if requested
    if (openNow) {
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
        now.getDay()
      ];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      skateparks = skateparks.filter((park: any) => {
        if (park.is24Hours) return true;
        const dayHours = park.operatingHours?.[currentDay as keyof typeof park.operatingHours];
        if (!dayHours || dayHours.closed) return false;
        if (dayHours.open && dayHours.close) {
          return currentTime >= dayHours.open && currentTime <= dayHours.close;
        }
        return true;
      });
    }

    // Calculate distances for all parks if user location is provided
    // This allows client-side sorting by distance
    const calculateDistance = (parkLat: number, parkLng: number, userLat: number, userLng: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((userLat - parkLat) * Math.PI) / 180;
      const dLon = ((userLng - parkLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((parkLat * Math.PI) / 180) *
          Math.cos((userLat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Format response with all data including complete fields
    const formattedSkateparks = skateparks.map((park: any) => {
      const [parkLng, parkLat] = park.location.coordinates;
      
      // Calculate distance if user location is provided
      let distance: number | null = null;
      if (lat && lng) {
        distance = calculateDistance(parkLat, parkLng, lat, lng);
      }

      return {
        _id: park._id.toString(),
        slug: park.slug,
        name: park.name,
        address: park.address,
        area: park.area,
        location: {
          type: 'Point',
          coordinates: [parkLng, parkLat], // [longitude, latitude] format to match detail page
        },
        imageUrl: park.images?.[0]?.url || '/placeholder-skatepark.jpg',
        images: park.images || [],
        operatingHours: park.operatingHours || {},
        lightingHours: park.lightingHours || undefined,
        amenities: park.amenities || {},
        rating: park.rating || 0,
        totalReviews: park.totalReviews || 0,
        is24Hours: park.is24Hours || false,
        isFeatured: park.isFeatured || false,
        // Normalize skillLevel from nested object or legacy top-level beginners/advanced/pro
        skillLevel: {
          beginners: park.skillLevel?.beginners ?? (park as any).beginners ?? false,
          advanced: park.skillLevel?.advanced ?? (park as any).advanced ?? false,
          pro: park.skillLevel?.pro ?? (park as any).pro ?? false,
        },
        openingYear: park.openingYear ?? null,
        openingMonth: park.openingMonth ?? null,
        closingYear: park.closingYear ?? null,
        closingMonth: park.closingMonth ?? null,
        notes: park.notes || {},
        mediaLinks: park.mediaLinks || {},
        status: park.status || 'active',
        seoMetadata: park.seoMetadata || undefined,
        qualityRating: park.qualityRating || undefined,
        createdAt: park.createdAt || null,
        updatedAt: park.updatedAt || null,
        distance,
      };
    });

    // Get cache version
    const settings = await Settings.findOrCreate();
    const version = settings.skateparksVersion || 1;

    return NextResponse.json({
      skateparks: formattedSkateparks,
      version,
    });
  } catch (error) {
    console.error('Error fetching skateparks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


