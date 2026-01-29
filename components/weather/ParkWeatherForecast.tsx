'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslations, useLocale } from 'next-intl';
import { Separator } from '@/components/ui/separator';

interface DailyForecast {
  date: string;
  precipitation: number;
  probability: number;
  minTemperature?: number;
  maxTemperature?: number;
  weatherCode?: number; // If available from API
  weatherMain?: string; // e.g., "Snow", "Rain", "Clear", "Clouds"
}

interface HourlyForecast {
  time: string;
  precipitation: number;
  probability: number;
  temperature?: number;
  weatherCode?: number; // If available from API
  weatherMain?: string; // e.g., "Snow", "Rain", "Clear", "Clouds"
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
type WeatherIconName = 'wind' | 'snow' | 'cloudy' | 'partlyCloudy' | 'sunBold' | 'rainy' | 'smallRain' | 'thunderstorm';

const getWeatherIcon = (
  precipitation: number,
  probability: number,
  temperature?: number,
  weatherMain?: string
): WeatherIconName => {
  // Check for snow conditions (temperature-based)
  // Snow typically occurs when temperature is near or below freezing
  if (temperature !== undefined && temperature <= 2) {
    if (precipitation > 0 || probability > 50) {
      return 'snow';
    }
  }
  
  // Check weather main condition if available
  if (weatherMain) {
    const main = weatherMain.toLowerCase();
    
    // Snow conditions
    if (main.includes('snow')) {
      return 'snow';
    }
    
    // Thunderstorm conditions
    if (main.includes('thunderstorm') || main.includes('thunder')) {
      return 'thunderstorm';
    }
    
    // Rain conditions - determine intensity
    if (main.includes('rain') || main.includes('drizzle')) {
      // Thunderstorm requires both high precipitation AND high probability
      if (precipitation > 15 && probability > 70) {
        return 'thunderstorm';
      }
      // Moderate to heavy rain
      if (precipitation > 5) {
        return 'rainy';
      }
      // Light rain
      return 'smallRain';
    }
    
    // Cloud conditions - distinguish between cloudy and partly cloudy
    if (main.includes('cloud')) {
      // Overcast or heavy clouds
      if (probability > 40 || precipitation > 0) {
        return 'cloudy';
      }
      // Partly cloudy
      if (probability > 15) {
        return 'partlyCloudy';
      }
      // Light clouds
      return 'partlyCloudy';
    }
    
    // Clear/sunny conditions
    if (main.includes('clear') || main.includes('sun')) {
      // Windy conditions (high probability but no precipitation)
      if (probability > 20 && precipitation === 0) {
        return 'wind';
      }
      return 'sunBold';
    }
    
    // Wind conditions (atmosphere, mist, fog, etc. with no precipitation)
    if ((main.includes('mist') || main.includes('fog') || main.includes('haze') || main.includes('dust')) && precipitation === 0) {
      return 'wind';
    }
  }
  
  // Fallback to precipitation/probability-based logic
  // Prioritize precipitation amount for rain intensity
  if (precipitation > 0) {
    // Heavy rain / thunderstorm (requires both high precipitation AND high probability)
    if (precipitation > 15 && probability > 70) {
      return 'thunderstorm';
    }
    // Moderate to heavy rain
    if (precipitation > 5) {
      return 'rainy';
    }
    // Light rain (0.1mm - 5mm)
    return 'smallRain';
  }
  
  // No precipitation - check probability for other conditions
  // Windy conditions (high probability but no precipitation)
  if (probability > 30 && precipitation === 0) {
    return 'wind';
  }
  
  // Cloudy (medium chance of rain, some cloud cover)
  if (probability > 30) {
    return 'cloudy';
  }
  
  // Partly cloudy (low chance of rain, light cloud cover)
  if (probability > 15) {
    return 'partlyCloudy';
  }
  
  // Sunny (clear conditions)
  return 'sunBold';
};

// Map weather icon names to actual Icon component names
const mapWeatherIconToIconName = (weatherIcon: WeatherIconName): 'wind' | 'snow' | 'lightRain' | 'thunderstorm' | 'rainy' | 'cloudy' | 'partlyCloudy' | 'sunBold' => {
  switch (weatherIcon) {
    case 'wind':
      return 'wind';
    case 'thunderstorm':
      return 'thunderstorm';
    case 'rainy':
      return 'rainy';
    case 'smallRain':
      return 'lightRain';
    case 'snow':
      return 'snow';
    case 'cloudy':
      return 'cloudy';
    case 'partlyCloudy':
      return 'partlyCloudy';
    case 'sunBold':
    default:
      return 'sunBold';
  }
};

const getIconColor = (iconName: WeatherIconName): string => {
  switch (iconName) {
    case 'wind':
      return 'text-gray-500 dark:text-gray-400';
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

  const formatLastUpdated = (dateString: string): string => {
    const date = new Date(dateString);
    if (locale === 'he') {
      // Hebrew format: DD/MM/YYYY (20/1/2026)
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } else {
      // English format: MM/DD/YYYY (1/20/2026)
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
  };

  const getPrecipitationUnit = (): string => {
    return locale === 'he' ? 'מ"מ' : 'mm';
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
    <Card className="mb-8 !p-0 shadow-none rounded-none">
      <CardHeader>
        <CardTitle className="flex justify-between items-end">
          <div className="text-xl font-semibold flex items-center gap-2">
            <Icon name="sunBold" className="w-5 h-5" />
          {t('weatherForecast') || 'Weather Forecast'}
            </div>
              {/* Last updated */}
        <p className="font-medium mb-1 text-xs text-text/50 dark:text-text-dark/50 mt-1 text-center">
          {t('lastUpdated') || 'Updated'}: {formatLastUpdated(weather.lastUpdated)}
        </p>     
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Days Grid */}
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2">
          {allDays.map((day, index) => {
            const iconName = getWeatherIcon(
              day.precipitation,
              day.probability,
              day.minTemperature, // Use min temp for snow detection
              day.weatherMain
            );
            const iconColor = getIconColor(iconName);
            
            return (
              <div
                key={index}
                onClick={() => setSelectedDay(day)}
                className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] flex-1 py-3 px-1 rounded-lg bg-gray-bg/50 dark:bg-gray-bg-dark cursor-pointer hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark transition-colors duration-300"
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
                    name={mapWeatherIconToIconName(iconName)}
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
                      {day.precipitation.toFixed(1)} {getPrecipitationUnit()}
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

      
      </CardContent>

      {/* Hourly Forecast Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-background dark:bg-background-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 ">
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
            <Separator className="mx-4"/>

            {/* Hourly Forecast Content */}
            <div className="p-4">
              {getHourlyForecastForDay(selectedDay.date).length > 0 ? (
                <div className="space-y-2">
                  {getHourlyForecastForDay(selectedDay.date).map((hour, idx) => {
                    const iconName = getWeatherIcon(
                      hour.precipitation,
                      hour.probability,
                      hour.temperature,
                      hour.weatherMain
                    );
                    const iconColor = getIconColor(iconName);
                    
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-card dark:bg-card-dark"
                      >
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-text dark:text-text-dark w-20">
                            {formatTime(hour.time)}
                          </p>
                          <Icon
                            name={mapWeatherIconToIconName(iconName)}
                            className={`w-6 h-6 ${iconColor}`}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-semibold text-text dark:text-text-dark w-12 text-right">
                            {hour.temperature !== undefined ? `${Math.round(hour.temperature)}°` : '--'}
                          </p>
                          {hour.precipitation > 0 ? (
                            <p className="text-xs font-semibold text-blue dark:text-blue-dark w-16 text-right">
                              {hour.precipitation.toFixed(1)} {getPrecipitationUnit()}
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