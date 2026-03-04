# Weather Forecast Setup Guide

This guide explains how to set up the weather forecast feature for skateparks.

## Overview

The weather forecast system provides rain/precipitation forecasts for skateparks:
- **List Page**: Shows general Israel weather summary (7-day forecast)
- **Detail Page**: Shows detailed 2-week forecast for each park
- **Scheduled Updates**: MongoDB Atlas function fetches weather daily
- **Caching**: 24-hour cache to minimize API calls

## Prerequisites

1. OpenWeatherMap API key (free tier: 1,000 calls/day, 60 calls/minute)
   - Sign up at: https://openweathermap.org/api
   - Get your API key from the dashboard

2. MongoDB Atlas account with App Services enabled

## Environment Variables

Add these to your `.env.local` file:

```env
# Weather Forecast Feature
NEXT_PUBLIC_ENABLE_WEATHER_FORECAST=true
OPENWEATHERMAP_API_KEY=your_api_key_here
WEATHER_CACHE_TTL=86400  # 24 hours in seconds (optional, defaults to 86400)
```

### Environment Variable Descriptions

- `NEXT_PUBLIC_ENABLE_WEATHER_FORECAST`: Enable/disable the weather feature (set to `true` or `false`)
- `OPENWEATHERMAP_API_KEY`: Your OpenWeatherMap API key
- `WEATHER_CACHE_TTL`: Cache TTL in seconds (default: 86400 = 24 hours)

## MongoDB Atlas Scheduled Function Setup

### Step 1: Enable App Services

1. Go to MongoDB Atlas → Your Project
2. Navigate to **App Services** (formerly Realm)
3. If not enabled, click **Enable App Services**

### Step 2: Create Environment Variables

1. In App Services, go to **Values** (or **Environment Variables**)
2. Add the following values:
   - `OPENWEATHERMAP_API_KEY`: Your OpenWeatherMap API key
   - `WEATHER_CACHE_TTL`: `86400` (or your preferred TTL in seconds)
   - `DATABASE_NAME`: Your database name (e.g., `enboss`)

### Step 3: Enable HTTP Service

1. In App Services, go to **Services**
2. Enable **HTTP Service** (if not already enabled)
3. This allows the function to make external API calls

### Step 4: Create the Scheduled Function

1. Go to **Functions** in App Services
2. Click **Create New Function**
3. Name it: `fetchWeatherForecast`
4. Set **Function Type** to **Scheduled Trigger**
5. Configure the schedule:
   - **Schedule Type**: Recurring
   - **Frequency**: Daily
   - **Time**: Choose a time (e.g., 2:00 AM UTC) when traffic is low
6. Copy the code from `mongodb-atlas-function-weather-fetch.js` into the function editor
7. Save and enable the function

### Step 5: Test the Function

1. In the function editor, click **Run** to test manually
2. Check the logs for any errors
3. Verify that weather data appears in the `weatherforecasts` collection

## API Endpoints

The system creates two API endpoints:

- `GET /api/weather/israel` - Returns Israel weather summary (7 days)
- `GET /api/weather/forecast?slug=park-slug` - Returns forecast for specific park (14 days)

Both endpoints:
- Check `NEXT_PUBLIC_ENABLE_WEATHER_FORECAST` flag
- Return cached data if available (24h TTL)
- Fetch new data if cache expired
- Skip closed parks automatically

## Features

### Automatic Filtering

- **Closed Parks**: Weather is never fetched or displayed for parks with `closingYear <= currentYear`
- **Active Parks Only**: Only parks with `status: 'active'` are included

### Rate Limiting

The service respects OpenWeatherMap rate limits:
- 60 calls per minute
- 1,000 calls per day (free tier)

The scheduled function includes rate limiting logic to stay within these limits.

### Caching Strategy

1. **Database Cache**: 24-hour TTL (configurable via `WEATHER_CACHE_TTL`)
2. **API Cache**: Checks database first, fetches if expired
3. **Client Cache**: Components handle loading states gracefully

### Research Data

All weather data is stored in the `weatherforecasts` collection with:
- `fetchedAt`: Timestamp for research queries
- `hourlyForecast`: 48-hour hourly breakdown
- `dailyForecast`: 14-day daily forecast
- `precipitation`: Amount in mm
- `probability`: Probability percentage (0-100)

## Troubleshooting

### Weather Not Showing

1. Check `NEXT_PUBLIC_ENABLE_WEATHER_FORECAST` is set to `true`
2. Verify `OPENWEATHERMAP_API_KEY` is set correctly
3. Check browser console for API errors
4. Verify the park is not closed (`closingYear` check)

### Scheduled Function Not Running

1. Check function is enabled in Atlas
2. Verify schedule is set correctly
3. Check function logs for errors
4. Ensure HTTP service is enabled
5. Verify environment variables are set in Atlas

### API Rate Limit Errors

1. Check OpenWeatherMap dashboard for usage
2. Reduce frequency of scheduled function if needed
3. Increase delay between calls in the function
4. Consider upgrading OpenWeatherMap plan if needed

### Database Connection Issues

1. Verify `MONGODB_URI` is set correctly
2. Check Atlas network access allows your IP
3. Verify database name matches in Atlas function

## Cost Optimization

- Uses free tier efficiently (1,000 calls/day)
- Aggressive caching (24 hours)
- Only fetches for active, non-closed parks
- Batch processing with rate limiting
- Falls back to expired cache if API fails

## Next Steps

1. Add weather icons (cloud, rain, etc.) to the icon system
2. Consider adding temperature display
3. Add weather alerts/notifications
4. Expand research data collection




