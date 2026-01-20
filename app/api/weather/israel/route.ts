import { NextRequest, NextResponse } from 'next/server';
import { getIsraelWeatherSummary } from '@/lib/services/weather';

/**
 * Israel Weather Summary API Route
 * 
 * GET /api/weather/israel
 * 
 * Returns general Israel weather summary for the list page
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
    const summary = await getIsraelWeatherSummary();

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to fetch weather summary' },
        { status: 500 }
      );
    }

    // Format response - return daily forecast for next 7 days
    const response = {
      location: summary.location,
      dailyForecast: summary.dailyForecast
        .slice(0, 7) // Next 7 days
        .map(item => ({
          date: item.date,
          precipitation: item.precipitation,
          probability: item.probability,
          minTemperature: item.minTemperature,
          maxTemperature: item.maxTemperature,
        })),
      lastUpdated: summary.lastUpdated,
      expiresAt: summary.expiresAt,
    };

    return NextResponse.json({ summary: response });
  } catch (error: any) {
    console.error('Error fetching Israel weather summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

