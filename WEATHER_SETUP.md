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






# Database
MONGODB_URI=mongodb+srv://eylam:zrihan46@claudecluster1.nvoih7d.mongodb.net/?appName=claudeCluster1

#Goole Maps Platform API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDeNP6B3aNjpEoj4njDBpBRx7udnDRqF2A
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=879c291b01556f6c6256c022

# Redis
UPSTASH_REDIS_REST_URL="https://tender-burro-28302.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AW6OAAIncDFkZGMxMGQwMzAxM2Q0MjlhODc4YmFlZmJhMmIzOWZiNnAxMjgzMDI"
# Analytics: when true, enable analytics (Metrics) tracking
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# IL cookie policy: when true, show simplified IL banner and accept all cookies (including analytics)
NEXT_PUBLIC_SET_IL_COOKIE_POLICY=true


#  User Login Disable
NEXT_PUBLIC_ENABLE_LOGIN=true


# User Ragistration Disable
NEXT_PUBLIC_ENABLE_REGISTER=false

# Community Page Disable
NEXT_PUBLIC_ENABLE_COMMUNITY=false


# Growth Lab Disable
NEXT_PUBLIC_ENABLE_GROWTH_LAB=true

# Shop Pages Disable
NEXT_PUBLIC_ENABLE_ECOMMERCE=false

# Trainers Page Disable
NEXT_PUBLIC_ENABLE_TRAINERS=false


# false = show reviews in the same language as the skatepark locale
NEXT_PUBLIC_ENABLE_MULTILINGUAL_REVIEWS=true

# Let only Users add Reviews
NEXT_PUBLIC_ENABLE_USERREVIEWS=false

# Let Everyone add Reviews
NEXT_PUBLIC_ENABLE_EVERYONEREVIEWS=true

# Allow multiple reviews from the same user
NEXT_PUBLIC_ENABLE_MULTIPLE_REVIEWS=true

# Newsletter Page Disable
NEXT_PUBLIC_ENABLE_NEWSLETTER=true

NEXT_PUBLIC_ENABLE_WEATHER_FORECAST=true


# NextAuth.js
NEXTAUTH_SECRET=Pyh3G9Ln2jG1pWvwOjjy0UsY8moNm0OZG6oDUH2o9M4=
NEXTAUTH_URL=http://localhost:3000

# Shopify
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_WEBHOOK_SECRET=your_shopify_webhook_secret

# Cloudinary (for client-side uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dr0rvohz9
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=enboss_skateparks
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_GUIDES=enboss_guideAssets
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EVENTS=enboss_EventsAssets

# Cloudinary (for server-side operations - keep these if needed)
CLOUDINARY_API_KEY=647527477623629
CLOUDINARY_API_SECRET=tiG9Gq3iBGR6PbA_SDymmMqX4lA

OPENWEATHERMAP_API_KEY=96a68a33e19c56e83e7ba69b6df3ae7c
WEATHER_CACHE_TTL=86400  # 24 hours in seconds (optional, defaults to 86400)
# EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=service_iy6vxkp
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=template_1s8me4r
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=Q6qM2TZz6NIBFEQDf
NEXT_PUBLIC_EMAILJS_PASSWORD_RESET_TEMPLATE_ID=template_ybk3l4g