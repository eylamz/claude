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
      openingYear: skatepark.openingYear || null,
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
      closingYear,
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

    // Create new skatepark
    const newSkatepark = new Skatepark({
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
      operatingHours: operatingHours || {},
      lightingUntil,
      amenities: amenities || {
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
      },
      openingYear,
      closingYear,
      notes: notes || { en: '', he: '' },
      is24Hours: is24Hours || false,
      isFeatured: isFeatured || false,
      status: status || 'active',
      mediaLinks: mediaLinks || { youtube: '', googleMapsFrame: '' },
      rating: 0,
      totalReviews: 0,
    });

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

