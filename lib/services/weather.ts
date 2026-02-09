import connectDB from '@/lib/db/mongodb';
import WeatherForecast, { IWeatherForecast, IHourlyForecast, IDailyForecast } from '@/lib/models/WeatherForecast';
import Skatepark from '@/lib/models/Skatepark';

/**
 * OpenWeatherMap API response interfaces
 */
interface OpenWeatherMapHourly {
  dt: number; // Unix timestamp
  rain?: {
    '1h': number; // Precipitation in mm for the last hour
  };
  pop: number; // Probability of precipitation (0-1)
  temp?: number; // Temperature in Celsius
}

interface OpenWeatherMapDaily {
  dt: number; // Unix timestamp
  rain?: number; // Precipitation in mm
  pop: number; // Probability of precipitation (0-1)
  temp?: {
    min: number;
    max: number;
  };
}

interface OpenWeatherMapResponse {
  lat: number;
  lon: number;
  hourly?: OpenWeatherMapHourly[];
  daily?: OpenWeatherMapDaily[];
}

/**
 * Weather service configuration
 */
const getWeatherConfig = () => {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    throw new Error('OPENWEATHERMAP_API_KEY environment variable is not defined');
  }
  return { apiKey };
};

/**
 * Rate limiting configuration
 */
const RATE_LIMIT = {
  maxCallsPerMinute: 60,
  maxCallsPerDay: 1000,
};

let callCount = 0;
let lastResetTime = Date.now();
const callHistory: number[] = []; // Track calls for rate limiting

/**
 * Reset rate limit counters
 */
function resetRateLimit() {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove calls older than 1 minute
  while (callHistory.length > 0 && callHistory[0] < oneMinuteAgo) {
    callHistory.shift();
  }

  // Reset daily counter if needed
  if (now - lastResetTime > 86400000) {
    callCount = 0;
    lastResetTime = now;
  }
}

/**
 * Check if we can make an API call (rate limiting)
 */
function canMakeAPICall(): boolean {
  resetRateLimit();
  
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const recentCalls = callHistory.filter(time => time > oneMinuteAgo).length;

  // Check per-minute limit
  if (recentCalls >= RATE_LIMIT.maxCallsPerMinute) {
    return false;
  }

  // Check per-day limit
  if (callCount >= RATE_LIMIT.maxCallsPerDay) {
    return false;
  }

  return true;
}

/**
 * Record an API call
 */
function recordAPICall() {
  const now = Date.now();
  callHistory.push(now);
  callCount++;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch weather forecast from OpenWeatherMap API
 */
export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  retries: number = 3
): Promise<OpenWeatherMapResponse> {
  const config = getWeatherConfig();

  // Check rate limit
  if (!canMakeAPICall()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=current,minutely,alerts&units=metric&appid=${config.apiKey}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      recordAPICall();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          if (attempt < retries) {
            await sleep(60000); // Wait 1 minute
            continue;
          }
          throw new Error('OpenWeatherMap API rate limit exceeded');
        }

        if (response.status >= 500 && attempt < retries) {
          await sleep(1000 * attempt);
          continue;
        }

        const errorText = await response.text();
        throw new Error(`OpenWeatherMap API error: ${response.status} ${errorText}`);
      }

      const data: OpenWeatherMapResponse = await response.json();
      return data;
    } catch (error: any) {
      if (attempt === retries) {
        console.error('Failed to fetch weather forecast after retries:', error);
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }

  throw new Error('Failed to fetch weather forecast after all retries');
}

/**
 * Transform OpenWeatherMap response to our format
 */
function transformWeatherData(
  apiData: OpenWeatherMapResponse,
  skateparkId: string,
  skateparkSlug: string
): Omit<IWeatherForecast, '_id' | 'createdAt' | 'updatedAt'> {
  const ttl = parseInt(process.env.WEATHER_CACHE_TTL || '86400', 10); // Default 24 hours
  const expiresAt = new Date(Date.now() + ttl * 1000);

  // Transform hourly forecast (next 48 hours)
  const hourlyForecast: IHourlyForecast[] = (apiData.hourly || [])
    .slice(0, 48) // Next 48 hours
    .map((item) => ({
      time: new Date(item.dt * 1000),
      precipitation: item.rain?.['1h'] || 0,
      probability: Math.round(item.pop * 100), // Convert 0-1 to 0-100
      temperature: item.temp,
    }));

  // Transform daily forecast (next 14 days)
  const dailyForecast: IDailyForecast[] = (apiData.daily || [])
    .slice(0, 14) // Next 14 days
    .map((item) => ({
      date: new Date(item.dt * 1000),
      precipitation: item.rain || 0,
      probability: Math.round(item.pop * 100), // Convert 0-1 to 0-100
      minTemperature: item.temp?.min,
      maxTemperature: item.temp?.max,
    }));

  return {
    skateparkId: skateparkId as any,
    skateparkSlug,
    location: {
      lat: apiData.lat,
      lng: apiData.lon,
    },
    hourlyForecast,
    dailyForecast,
    lastUpdated: new Date(),
    expiresAt,
    fetchedAt: new Date(),
  } as Omit<IWeatherForecast, '_id' | 'createdAt' | 'updatedAt'>;
}

/**
 * Get cached forecast for a skatepark
 */
export async function getCachedForecast(
  skateparkId: string | { _id: string; slug: string }
): Promise<IWeatherForecast | null> {
  await connectDB();

  const id = typeof skateparkId === 'string' ? skateparkId : skateparkId._id.toString();
  const slug = typeof skateparkId === 'string' ? undefined : skateparkId.slug;

  // Try by ID first
  let forecast = await WeatherForecast.findBySkateparkId(id);
  
  // If not found and we have slug, try by slug
  if (!forecast && slug) {
    forecast = await WeatherForecast.findBySkateparkSlug(slug);
  }

  return forecast;
}

/**
 * Save forecast to database
 */
export async function saveForecast(
  skateparkId: string,
  _skateparkSlug: string,
  forecastData: Omit<IWeatherForecast, '_id' | 'createdAt' | 'updatedAt'>
): Promise<IWeatherForecast> {
  await connectDB();

  // Check if forecast already exists
  const existing = await WeatherForecast.findOne({
    skateparkId: skateparkId as any,
  });

  if (existing) {
    // Update existing forecast
    Object.assign(existing, forecastData);
    await existing.save();
    return existing;
  } else {
    // Create new forecast
    const forecast = new WeatherForecast(forecastData);
    await forecast.save();
    return forecast;
  }
}

/**
 * Fetch and save weather forecast for a skatepark
 */
export async function fetchAndSaveForecast(
  skateparkId: string,
  skateparkSlug: string,
  lat: number,
  lng: number
): Promise<IWeatherForecast> {
  // Fetch from API
  const apiData = await fetchWeatherForecast(lat, lng);
  
  // Transform data
  const forecastData = transformWeatherData(apiData, skateparkId, skateparkSlug);
  
  // Save to database
  return await saveForecast(skateparkId, skateparkSlug, forecastData);
}

/**
 * Get or fetch forecast for a skatepark (with caching)
 */
export async function getOrFetchForecast(
  skateparkId: string,
  skateparkSlug: string,
  lat: number,
  lng: number
): Promise<IWeatherForecast | null> {
  try {
    // Check cache first
    const cached = await getCachedForecast({ _id: skateparkId, slug: skateparkSlug });
    
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    // Cache expired or doesn't exist - fetch new data
    return await fetchAndSaveForecast(skateparkId, skateparkSlug, lat, lng);
  } catch (error) {
    console.error('Error getting or fetching forecast:', error);
    
    // Return expired cache if available as fallback
    const expiredCache = await getCachedForecast({ _id: skateparkId, slug: skateparkSlug });
    if (expiredCache) {
      return expiredCache;
    }
    
    return null;
  }
}

/**
 * Fetch weather for all active skateparks (for scheduled job)
 */
export async function fetchWeatherForAllActiveParks(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ skateparkId: string; error: string }>;
}> {
  await connectDB();

  // Get all active parks that are not closed
  const currentYear = new Date().getFullYear();
  const parks = await Skatepark.find({
    status: 'active',
    $or: [
      { closingYear: { $exists: false } },
      { closingYear: null },
      { closingYear: { $gt: currentYear } },
    ],
  })
    .select('_id slug location')
    .lean();

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ skateparkId: string; error: string }>,
  };

  // Process parks with rate limiting
  for (const park of parks) {
    try {
      // Check rate limit before each call
      if (!canMakeAPICall()) {
        console.warn(`Rate limit reached. Processed ${results.success} parks, ${parks.length - results.success} remaining.`);
        break;
      }

      const coords = park.location?.coordinates;
      if (!coords || !Array.isArray(coords) || coords.length < 2) {
        results.failed++;
        results.errors.push({
          skateparkId: park._id.toString(),
          error: 'Invalid coordinates',
        });
        continue;
      }

      const [lng, lat] = coords;
      
      // Small delay between requests to respect rate limits
      if (results.success > 0) {
        await sleep(1000); // 1 second between requests
      }

      await fetchAndSaveForecast(
        park._id.toString(),
        park.slug,
        lat,
        lng
      );

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({
        skateparkId: park._id.toString(),
        error: error.message || 'Unknown error',
      });
      console.error(`Failed to fetch weather for park ${park.slug}:`, error);
    }
  }

  return results;
}

/**
 * Get Israel weather summary (average of major cities)
 */
export async function getIsraelWeatherSummary(): Promise<IWeatherForecast | null> {
  // Use Tel Aviv coordinates as Israel center
  const israelCenter = {
    lat: 31.7683,
    lng: 35.2137,
  };

  try {
    // Check if we have cached summary
    const cached = await WeatherForecast.findOne({
      skateparkSlug: 'israel-summary',
      expiresAt: { $gt: new Date() },
    });

    if (cached) {
      return cached;
    }

    // Fetch new summary
    const apiData = await fetchWeatherForecast(israelCenter.lat, israelCenter.lng);
    const forecastData = transformWeatherData(
      apiData,
      'israel-summary' as any,
      'israel-summary'
    );

    // Save summary
    return await saveForecast('israel-summary' as any, 'israel-summary', forecastData);
  } catch (error) {
    console.error('Error fetching Israel weather summary:', error);
    return null;
  }
}

