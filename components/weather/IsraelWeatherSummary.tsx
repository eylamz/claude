'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslations } from 'next-intl';

interface DailyForecast {
  date: string;
  precipitation: number;
  probability: number;
  minTemperature?: number;
  maxTemperature?: number;
}

interface WeatherSummary {
  location: {
    lat: number;
    lng: number;
  };
  dailyForecast: DailyForecast[];
  lastUpdated: string;
  expiresAt: string;
}

/**
 * Israel Weather Summary Component
 * Shows a simple 7-day weather forecast for Israel on the skateparks list page
 */
export default function IsraelWeatherSummary() {
  const t = useTranslations('skateparks');
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if weather is enabled
    const weatherEnabled = process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST === 'true';
    if (!weatherEnabled) {
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch('/api/weather/israel');
        if (!response.ok) {
          throw new Error('Failed to fetch weather');
        }
        const data = await response.json();
        setWeather(data.summary);
      } catch (err: any) {
        console.error('Error fetching weather:', err);
        setError(err.message || 'Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Don't render if weather is disabled or there's an error
  if (!process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST || process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST !== 'true') {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-6 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Icon name="cloudRain" className="w-5 h-5" />
            {t('weatherForecast') || 'Weather Forecast'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner className="h-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return null; // Fail silently
  }

  const formatDate = (dateString: string, locale: string = 'en'): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getRainIcon = (precipitation: number, probability: number): string => {
    if (precipitation > 5 || probability > 70) {
      return 'sunset'; // Heavy rain - using sunset as placeholder
    }
    if (precipitation > 0 || probability > 30) {
      return 'sunset'; // Light rain - using sunset as placeholder
    }
    return 'sun'; // No rain
  };

  const getRainColor = (precipitation: number, probability: number): string => {
    if (precipitation > 5 || probability > 70) {
      return 'text-blue-600 dark:text-blue-400';
    }
    if (precipitation > 0 || probability > 30) {
      return 'text-blue-500 dark:text-blue-300';
    }
    return 'text-gray-400 dark:text-gray-500';
  };

  return (
    <Card className="mb-6 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Icon name="sunset" className="w-5 h-5" />
          {t('weatherForecast') || 'Weather Forecast'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {weather.dailyForecast.map((day, index) => {
            const iconName = getRainIcon(day.precipitation, day.probability);
            const iconColor = getRainColor(day.precipitation, day.probability);
            const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';

            return (
              <div
                key={index}
                className="flex flex-col items-center p-2 rounded-lg bg-gray-bg dark:bg-gray-bg-dark border border-gray-border dark:border-gray-border-dark"
              >
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {formatDate(day.date, locale)}
                </p>
                <Icon
                  name={iconName as any}
                  className={`w-6 h-6 mb-1 ${iconColor}`}
                />
                {day.precipitation > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {day.precipitation.toFixed(1)}mm
                  </p>
                )}
                {day.probability > 0 && day.precipitation === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {day.probability}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
          {t('lastUpdated') || 'Last updated'}: {new Date(weather.lastUpdated).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

