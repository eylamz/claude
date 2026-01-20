'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslations, useLocale } from 'next-intl';

interface DailyForecast {
  date: string;
  precipitation: number;
  probability: number;
  minTemperature?: number;
  maxTemperature?: number;
  weatherCode?: number; // If available from API
}

interface HourlyForecast {
  time: string;
  precipitation: number;
  probability: number;
  temperature?: number;
}

interface WeatherForecast {
  skateparkId: string;
  skateparkSlug: string;
  location: {
    lat: number;
    lng: number;
  };
  dailyForecast: DailyForecast[];
  hourlyForecast?: HourlyForecast[];
  lastUpdated: string;
  expiresAt: string;
}

interface ParkWeatherForecastProps {
  slug: string;
  closingYear?: number | null;
}

// Weather icon mapping based on conditions
type WeatherIconName = 'snow' | 'cloudy' | 'partlyCloudy' | 'sunBold' | 'rainy' | 'smallRain' | 'thunderstorm';

const getWeatherIcon = (precipitation: number, probability: number): WeatherIconName => {
  // Heavy rain / thunderstorm
  if (precipitation > 10 || probability > 80) {
    return 'thunderstorm';
  }
  // Moderate rain
  if (precipitation > 5 || probability > 60) {
    return 'rainy';
  }
  // Light rain
  if (precipitation > 0 || probability > 30) {
    return 'smallRain';
  }
  // Cloudy (low chance of rain)
  if (probability > 15) {
    return 'partlyCloudy';
  }
  // sunBoldny
  return 'sunBold';
};

// Map weather icon names to actual Icon component names
const mapWeatherIconToIconName = (weatherIcon: WeatherIconName): string => {
  switch (weatherIcon) {
    case 'thunderstorm':
        return 'thunderstorm';

    case 'rainy':
    case 'smallRain':
      return 'umbrellaBold';
    case 'snow':
    case 'cloudy':
      return 'cloudy';
    case 'partlyCloudy':
        return 'partlyCloudy';
      return 'sunBold';
    case 'sunBold':
    default:
      return 'sunBold';
  }
};

const getIconColor = (iconName: WeatherIconName): string => {
  switch (iconName) {
    case 'thunderstorm':
      return 'text-purple-600 dark:text-purple-400';
    case 'rainy':
      return 'text-blue dark:text-blue-dark';
    case 'smallRain':
      return 'text-blue dark:text-blue-dark';
    case 'snow':
      return 'text-sky-400 dark:text-sky-300';
    case 'cloudy':
      return 'text-gray dark:text-gray-dark';
    case 'partlyCloudy':
      return 'text-gray-400 dark:text-gray-500';
    case 'sunBold':
    default:
      return 'text-yellow-500 dark:text-yellow-400';
  }
};

export default function ParkWeatherForecast({ slug, closingYear }: ParkWeatherForecastProps) {
  const t = useTranslations('skateparks');
  const locale = useLocale();
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyForecast | null>(null);

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    if (closingYear && closingYear <= currentYear) {
      setLoading(false);
      return;
    }

    const weatherEnabled = process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST === 'true';
    if (!weatherEnabled) {
      setLoading(false);
      return;
    }

    const fetchWeather = async () => {
      try {
        const response = await fetch(`/api/weather/forecast?slug=${slug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Weather forecast not available');
            return;
          }
          throw new Error('Failed to fetch weather');
        }
        const data = await response.json();
        setWeather(data.forecast);
      } catch (err: any) {
        console.error('Error fetching weather:', err);
        setError(err.message || 'Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [slug, closingYear]);

  // Don't render conditions
  if (!process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST || process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST !== 'true') {
    return null;
  }

  const currentYear = new Date().getFullYear();
  if (closingYear && closingYear <= currentYear) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-8 shadow-none">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Icon name="sunBold" className="w-5 h-5" />
            {t('weatherForecast') || 'Weather Forecast'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return null;
  }

  const formatDayName = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'short',
    });
  };

  const formatDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDateLong = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getHourlyForecastForDay = (dayDate: string): HourlyForecast[] => {
    if (!weather.hourlyForecast) return [];
    
    const selectedDate = new Date(dayDate);
    const selectedDateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return weather.hourlyForecast.filter((hour) => {
      const hourDate = new Date(hour.time);
      const hourDateStr = hourDate.toISOString().split('T')[0];
      return hourDateStr === selectedDateStr;
    });
  };

  const allDays = weather.dailyForecast.slice(0, 7);

  return (
    <Card className="mb-8 shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Icon name="sunBold" className="w-5 h-5 text-yellow-500" />
          {t('weatherForecast') || 'Weather Forecast'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Days Grid */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2">
          {allDays.map((day, index) => {
            const iconName = getWeatherIcon(day.precipitation, day.probability);
            const iconColor = getIconColor(iconName);
            
            return (
              <div
                key={index}
                onClick={() => setSelectedDay(day)}
                className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] flex-1 py-3 px-1 rounded-lg bg-gray-bg dark:bg-gray-bg-dark cursor-pointer hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark transition-colors duration-300"
              >
                {/* Date */}
                <p className="text-xs text-gray dark:text-gray-dark">
                  {formatDateShort(day.date)}
                </p>
                
                {/* Day name */}
                <p className="text-sm font-semibold text-text dark:text-text-dark mt-0.5">
                  {formatDayName(day.date)}
                </p>
                
                {/* Weather icon */}
                <div className="my-3">
                  <Icon
                    name={mapWeatherIconToIconName(iconName) as any}
                    className={`w-8 h-8 ${iconColor}`}
                  />
                </div>
                
                {/* Temperature */}
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {day.maxTemperature !== undefined && day.minTemperature !== undefined ? (
                    <>
                      <span className="font-semibold">{Math.round(day.maxTemperature)}°</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-0.5">/</span>
                      <span className="text-gray dark:text-gray-dark">{Math.round(day.minTemperature)}°</span>
                    </>
                  ) : day.maxTemperature !== undefined ? (
                    `${Math.round(day.maxTemperature)}°`
                  ) : (
                    '--'
                  )}
                </p>
                
                {/* Precipitation */}
                <div className="mt-2 text-center">
                  {day.precipitation > 0 ? (
                    <p className="text-xs font-semibold text-blue dark:text-blue-dark duration-300">
                      {day.precipitation.toFixed(1)}mm
                    </p>
                  ) : day.probability > 0 ? (
                    <p className="text-xs text-blue dark:text-blue-dark">
                      {day.probability}%
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      --
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Last updated */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
          {t('lastUpdated') || 'Updated'}: {new Date(weather.lastUpdated).toLocaleDateString()}
        </p>
      </CardContent>

      {/* Hourly Forecast Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-text dark:text-text-dark">
                  {formatDateLong(selectedDay.date)}
                </h3>
                <p className="text-sm text-gray dark:text-gray-dark mt-1">
                  {selectedDay.maxTemperature !== undefined && selectedDay.minTemperature !== undefined
                    ? `${Math.round(selectedDay.maxTemperature)}° / ${Math.round(selectedDay.minTemperature)}°`
                    : selectedDay.maxTemperature !== undefined
                    ? `${Math.round(selectedDay.maxTemperature)}°`
                    : '--'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <Icon name="X" className="w-6 h-6" />
              </button>
            </div>

            {/* Hourly Forecast Content */}
            <div className="p-4">
              {getHourlyForecastForDay(selectedDay.date).length > 0 ? (
                <div className="space-y-2">
                  {getHourlyForecastForDay(selectedDay.date).map((hour, idx) => {
                    const iconName = getWeatherIcon(hour.precipitation, hour.probability);
                    const iconColor = getIconColor(iconName);
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                      >
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-text dark:text-text-dark w-20">
                            {formatTime(hour.time)}
                          </p>
                          <Icon
                            name={mapWeatherIconToIconName(iconName) as any}
                            className={`w-6 h-6 ${iconColor}`}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-semibold text-text dark:text-text-dark w-12 text-right">
                            {hour.temperature !== undefined ? `${Math.round(hour.temperature)}°` : '--'}
                          </p>
                          {hour.precipitation > 0 ? (
                            <p className="text-xs font-semibold text-blue dark:text-blue-dark w-16 text-right">
                              {hour.precipitation.toFixed(1)}mm
                            </p>
                          ) : hour.probability > 0 ? (
                            <p className="text-xs text-blue dark:text-blue-dark w-16 text-right">
                              {hour.probability}%
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500 w-16 text-right">
                              --
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray dark:text-gray-dark text-center py-8">
                  {t('hourlyForecastNotAvailable') || 'Hourly forecast not available for this day'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}