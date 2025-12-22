import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Skatepark from '@/lib/models/Skatepark';

export async function GET(request: Request) {
  try {
    // Connect to database first
    await connectDB();

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    // First check session role (faster), then verify in database
    if (session.user.role !== 'admin') {
      // Verify in database as well to ensure role is up to date
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const fetchAll = searchParams.get('all') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = fetchAll ? 10000 : parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const area = searchParams.get('area') || '';
    const status = searchParams.get('status') || '';
    const amenities = searchParams.get('amenities') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.he': { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    // Area filter
    if (area) {
      filter.area = area;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Amenities filter
    if (amenities) {
      filter.amenities = { $in: [amenities] };
    }

    // Sort configuration
    const sortConfig: any = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate total count for pagination
    const totalCount = await Skatepark.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Fetch skateparks
    const skateparks = await Skatepark.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(limit)
      .lean();

    // Format skateparks data
    const formattedSkateparks = skateparks.map((skatepark: any) => ({
      id: skatepark._id.toString(),
      name: {
        en: skatepark.name?.en || 'Untitled',
        he: skatepark.name?.he || 'ללא כותרת',
      },
      area: skatepark.area || skatepark.address?.area || '',
      address: {
        en: skatepark.address?.en || skatepark.address?.street || '',
        he: skatepark.address?.he || skatepark.address?.city || '',
        street: skatepark.address?.street || '',
        city: skatepark.address?.city || '',
        zip: skatepark.address?.zip || '',
      },
      status: skatepark.status || 'active',
      isFeatured: skatepark.isFeatured || false,
      openingYear: skatepark.openingYear ?? null,
      openingMonth: skatepark.openingMonth ?? null,
      closingYear: skatepark.closingYear ?? null,
      closingMonth: skatepark.closingMonth ?? null,
      image: skatepark.images?.[0]?.url || null,
      amenities: skatepark.amenities || {},
      location: skatepark.location || { lat: 0, lng: 0 },
    }));

    return NextResponse.json({
      skateparks: formattedSkateparks,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error: any) {
    console.error('Skateparks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skateparks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Connect to database first
    await connectDB();

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    // First check session role (faster), then verify in database
    if (session.user.role !== 'admin') {
      // Verify in database as well to ensure role is up to date
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
      lightingUntil,
      amenities,
      openingYear,
      openingMonth,
      closingYear,
      closingMonth,
      notes,
      is24Hours,
      isFeatured,
      status,
      mediaLinks,
    } = body;

    // Validate required fields
    if (!slug || !name?.en || !name?.he || !address?.en || !address?.he || !area) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingSkatepark = await Skatepark.findBySlug(slug);
    if (existingSkatepark) {
      return NextResponse.json(
        { error: 'A skatepark with this slug already exists' },
        { status: 400 }
      );
    }

    // Clean up operating hours - only include times when isOpen is true
    // When isOpen is false, completely omit time fields (don't set them at all)
    const cleanedOperatingHours: any = {};
    if (operatingHours) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'holidays'];
      days.forEach((day) => {
        const dayHours = operatingHours[day];
        if (dayHours) {
          if (dayHours.isOpen === true && dayHours.openingTime && dayHours.closingTime) {
            // Only include times when day is open and times are provided
            cleanedOperatingHours[day] = {
              isOpen: true,
              openingTime: dayHours.openingTime,
              closingTime: dayHours.closingTime,
            };
          } else if (dayHours.isOpen === false) {
            // When closed, create object with ONLY isOpen - no time fields whatsoever
            const closedDay: any = { isOpen: false };
            cleanedOperatingHours[day] = closedDay;
          }
        }
      });
    }
    
    console.log('Cleaned operating hours:', JSON.stringify(cleanedOperatingHours, null, 2));

    // Create new skatepark - only include operatingHours if it has content
    const skateparkData: any = {
      slug,
      name,
      address,
      area,
      location: {
        type: 'Point',
        coordinates: location.coordinates, // [longitude, latitude]
      },
      images: images ? images.map((img: any) => ({
        ...img,
        publicId: img.publicId && img.publicId.trim() ? img.publicId.trim() : undefined,
      })) : [],
    };

    // Only add operatingHours if it exists and has at least one day
    if (cleanedOperatingHours && Object.keys(cleanedOperatingHours).length > 0) {
      skateparkData.operatingHours = cleanedOperatingHours;
    }

    // Add remaining fields
    skateparkData.lightingUntil = lightingUntil;
    skateparkData.amenities = amenities || {
      entryFee: false,
      parking: false,
      shade: false,
      bathroom: false,
      helmetRequired: false,
      guard: false,
      seating: false,
      bombShelter: false,
      scootersAllowed: false,
      bikesAllowed: false,
      noWax: false,
      nearbyRestaurants: false,
    };
    // Only set openingYear/openingMonth if they are valid numbers and not in the future
    const currentYear = new Date().getFullYear();
    if (openingYear !== undefined && openingYear !== null && openingYear !== '') {
      const year = typeof openingYear === 'number' ? openingYear : parseInt(openingYear);
      if (!isNaN(year) && year >= 1900 && year <= currentYear) {
        skateparkData.openingYear = year;
        // Set openingMonth if provided and valid
        if (openingMonth !== undefined && openingMonth !== null && openingMonth !== '') {
          const month = typeof openingMonth === 'number' ? openingMonth : parseInt(openingMonth);
          if (!isNaN(month) && month >= 1 && month <= 12) {
            skateparkData.openingMonth = month;
          }
        }
      }
    }
    if (closingYear !== undefined && closingYear !== null && closingYear !== '') {
      const year = typeof closingYear === 'number' ? closingYear : parseInt(closingYear);
      if (!isNaN(year) && year >= 1900) {
        skateparkData.closingYear = year;
        // Set closingMonth if provided and valid
        if (closingMonth !== undefined && closingMonth !== null && closingMonth !== '') {
          const month = typeof closingMonth === 'number' ? closingMonth : parseInt(closingMonth);
          if (!isNaN(month) && month >= 1 && month <= 12) {
            skateparkData.closingMonth = month;
          }
        }
      }
    }
    
    console.log('Opening year value:', openingYear, 'Processed:', skateparkData.openingYear);
    skateparkData.notes = notes || { en: '', he: '' };
    skateparkData.is24Hours = is24Hours || false;
    skateparkData.isFeatured = isFeatured || false;
    skateparkData.status = status || 'active';
    skateparkData.mediaLinks = mediaLinks || { youtube: '', googleMapsFrame: '' };
    skateparkData.rating = 0;
    skateparkData.totalReviews = 0;

    const newSkatepark = new Skatepark(skateparkData);

    await newSkatepark.save();

    return NextResponse.json(
      { message: 'Skatepark created successfully', skatepark: newSkatepark },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create skatepark error:', error);
    
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'A skatepark with this slug already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create skatepark' },
      { status: 500 }
    );
  }
}

