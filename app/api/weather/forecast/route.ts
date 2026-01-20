import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Skatepark from '@/lib/models/Skatepark';
import { getOrFetchForecast } from '@/lib/services/weather';

/**
 * Weather Forecast API Route
 * 
 * GET /api/weather/forecast?slug=park-slug
 * 
 * Returns weather forecast for a specific skatepark
 */

export async function GET(request: NextRequest) {
  // Check if weather forecast is enabled
  const weatherEnabled = process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST === 'true';
  if (!weatherEnabled) {
    return NextResponse.json(
      { error: 'Weather forecast is disabled' },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find skatepark
    const skatepark = await Skatepark.findOne({ 
      slug: slug.toLowerCase(),
      status: 'active',
    }).lean();

    if (!skatepark) {
      return NextResponse.json(
        { error: 'Skatepark not found' },
        { status: 404 }
      );
    }

    // Check if park is closed
    const currentYear = new Date().getFullYear();
    if (skatepark.closingYear && skatepark.closingYear <= currentYear) {
      return NextResponse.json(
        { error: 'Weather forecast not available for closed parks' },
        { status: 404 }
      );
    }

    // Get coordinates
    const coords = skatepark.location?.coordinates;
    if (!coords || !Array.isArray(coords) || coords.length < 2) {
      return NextResponse.json(
        { error: 'Invalid park coordinates' },
        { status: 400 }
      );
    }

    const [lng, lat] = coords;

    // Get or fetch forecast
    const forecast = await getOrFetchForecast(
      skatepark._id.toString(),
      skatepark.slug,
      lat,
      lng
    );

    if (!forecast) {
      return NextResponse.json(
        { error: 'Failed to fetch weather forecast' },
        { status: 500 }
      );
    }

    // Format response (exclude internal fields)
    const response = {
      skateparkId: forecast.skateparkId.toString(),
      skateparkSlug: forecast.skateparkSlug,
      location: forecast.location,
      hourlyForecast: forecast.hourlyForecast.map(item => ({
        time: item.time,
        precipitation: item.precipitation,
        probability: item.probability,
        temperature: item.temperature,
      })),
      dailyForecast: forecast.dailyForecast.map(item => ({
        date: item.date,
        precipitation: item.precipitation,
        probability: item.probability,
        minTemperature: item.minTemperature,
        maxTemperature: item.maxTemperature,
      })),
      lastUpdated: forecast.lastUpdated,
      expiresAt: forecast.expiresAt,
    };

    return NextResponse.json({ forecast: response });
  } catch (error: any) {
    console.error('Error fetching weather forecast:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

