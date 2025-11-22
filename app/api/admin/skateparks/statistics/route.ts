import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Skatepark from '@/lib/models/Skatepark';

export async function GET() {
  try {
    // Connect to database first
    await connectDB();

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch all skateparks for statistics
    const skateparks = await Skatepark.find({}).lean();

    // Calculate amenities statistics with park names
    const amenitiesStats: Record<string, { count: number; parks: string[] }> = {
      paidEntry: { count: 0, parks: [] }, // entryFee: true
      bikesAllowed: { count: 0, parks: [] },
      parking: { count: 0, parks: [] },
      shade: { count: 0, parks: [] },
      bathroom: { count: 0, parks: [] },
      helmetRequired: { count: 0, parks: [] },
      guard: { count: 0, parks: [] },
      seating: { count: 0, parks: [] },
      bombShelter: { count: 0, parks: [] },
      scootersAllowed: { count: 0, parks: [] },
      noWax: { count: 0, parks: [] },
      nearbyRestaurants: { count: 0, parks: [] },
    };

    // Calculate opening years distribution with park names
    const openingYearsMap: Record<number, { count: number; parks: string[] }> = {};

    // Calculate area distribution
    const areaStats = {
      north: 0,
      center: 0,
      south: 0,
    };

    skateparks.forEach((skatepark: any) => {
      // Amenities with park names
      if (skatepark.amenities) {
        const parkName = skatepark.name?.en || skatepark.name?.he || 'Unknown';
        
        if (skatepark.amenities.entryFee === true) {
          amenitiesStats.paidEntry.count++;
          amenitiesStats.paidEntry.parks.push(parkName);
        }
        if (skatepark.amenities.bikesAllowed === true) {
          amenitiesStats.bikesAllowed.count++;
          amenitiesStats.bikesAllowed.parks.push(parkName);
        }
        if (skatepark.amenities.parking === true) {
          amenitiesStats.parking.count++;
          amenitiesStats.parking.parks.push(parkName);
        }
        if (skatepark.amenities.shade === true) {
          amenitiesStats.shade.count++;
          amenitiesStats.shade.parks.push(parkName);
        }
        if (skatepark.amenities.bathroom === true) {
          amenitiesStats.bathroom.count++;
          amenitiesStats.bathroom.parks.push(parkName);
        }
        if (skatepark.amenities.helmetRequired === true) {
          amenitiesStats.helmetRequired.count++;
          amenitiesStats.helmetRequired.parks.push(parkName);
        }
        if (skatepark.amenities.guard === true) {
          amenitiesStats.guard.count++;
          amenitiesStats.guard.parks.push(parkName);
        }
        if (skatepark.amenities.seating === true) {
          amenitiesStats.seating.count++;
          amenitiesStats.seating.parks.push(parkName);
        }
        if (skatepark.amenities.bombShelter === true) {
          amenitiesStats.bombShelter.count++;
          amenitiesStats.bombShelter.parks.push(parkName);
        }
        if (skatepark.amenities.scootersAllowed === true) {
          amenitiesStats.scootersAllowed.count++;
          amenitiesStats.scootersAllowed.parks.push(parkName);
        }
        if (skatepark.amenities.noWax === true) {
          amenitiesStats.noWax.count++;
          amenitiesStats.noWax.parks.push(parkName);
        }
        if (skatepark.amenities.nearbyRestaurants === true) {
          amenitiesStats.nearbyRestaurants.count++;
          amenitiesStats.nearbyRestaurants.parks.push(parkName);
        }
      }

      // Opening years with park names
      if (skatepark.openingYear) {
        const year = skatepark.openingYear;
        if (!openingYearsMap[year]) {
          openingYearsMap[year] = { count: 0, parks: [] };
        }
        openingYearsMap[year].count++;
        const parkName = skatepark.name?.en || skatepark.name?.he || 'Unknown';
        openingYearsMap[year].parks.push(parkName);
      }

      // Area distribution
      if (skatepark.area) {
        if (skatepark.area === 'north') {
          areaStats.north++;
        } else if (skatepark.area === 'center') {
          areaStats.center++;
        } else if (skatepark.area === 'south') {
          areaStats.south++;
        }
      }
    });

    // Generate all years from 2005 to current year
    const currentYear = new Date().getFullYear();
    const openingYears = [];
    for (let year = 2005; year <= currentYear; year++) {
      const yearData = openingYearsMap[year];
      openingYears.push({
        year,
        count: yearData ? yearData.count : 0,
        parks: yearData ? yearData.parks : [],
      });
    }

    return NextResponse.json({
      amenities: amenitiesStats,
      openingYears,
      areas: areaStats,
      totalParks: skateparks.length,
    });
  } catch (error: any) {
    console.error('Statistics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

