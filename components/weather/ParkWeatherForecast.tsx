'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslations, useLocale } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';


interface DailyForecast {
  date: string;
  precipitation: number;
  probability: number;
  minTemperature?: number;
  maxTemperature?: number;
  weatherCode?: number; 
  weatherMain?: string; 
}

interface HourlyForecast {
  time: string;
  precipitation: number;
  probability: number;
  temperature?: number;
  weatherCode?: number; 
  weatherMain?: string; 
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

const FORECAST_CACHE_TTL_MS = 24 * 60 * 60 * 1000; 
const SKATEPARKS_WEATHER_STORAGE_KEY = 'skateparks_weather';
const forecastCache = new Map<string, { data: WeatherForecast; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<WeatherForecast | null>>();

type StoredWeatherEntry = { data: WeatherForecast; timestamp: number };
type StoredWeatherCache = Record<string, StoredWeatherEntry>;

function getStoredWeatherCache(): StoredWeatherCache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SKATEPARKS_WEATHER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredWeatherCache;
  } catch {
    return {};
  }
}

function setStoredWeatherForSlug(slug: string, entry: StoredWeatherEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getStoredWeatherCache();
    cache[slug] = entry;
    localStorage.setItem(SKATEPARKS_WEATHER_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save weather to localStorage', e);
  }
}

type WeatherIconName = 'wind' | 'snow' | 'cloudy' | 'partlyCloudy' | 'sunBold' | 'rainy' | 'smallRain' | 'thunderstorm';

const getWeatherIcon = (
  precipitation: number,
  probability: number,
  temperature?: number,
  weatherMain?: string
): WeatherIconName => {
  const RAIN_THRESHOLD = 0.1;

  if (temperature !== undefined && temperature <= 2) {
    if (precipitation >= RAIN_THRESHOLD || probability > 50) return 'snow';
  }
  
  if (weatherMain) {
    const main = weatherMain.toLowerCase();
    if (main.includes('snow')) return 'snow';
    if (main.includes('thunderstorm') || main.includes('thunder')) return 'thunderstorm';
    
    if (main.includes('rain') || main.includes('drizzle')) {
      if (precipitation > 15 && probability > 70) return 'thunderstorm';
      if (precipitation > 5) return 'rainy';
      return precipitation >= RAIN_THRESHOLD ? 'smallRain' : 'cloudy';
    }
    
    if (main.includes('cloud')) {
      if (probability > 40 || precipitation >= RAIN_THRESHOLD) return 'cloudy';
      return 'partlyCloudy';
    }
    
    if (main.includes('clear') || main.includes('sun')) {
      if (probability > 20 && precipitation === 0) return 'wind';
      return 'sunBold';
    }
    
    if ((main.includes('mist') || main.includes('fog') || main.includes('haze') || main.includes('dust')) && precipitation === 0) {
      return 'wind';
    }
  }
  
  if (precipitation >= RAIN_THRESHOLD) {
    if (precipitation > 15 && probability > 70) return 'thunderstorm';
    if (precipitation > 5) return 'rainy';
    return 'smallRain';
  }
  
  if (probability > 30 && precipitation === 0) return 'wind';
  if (probability > 30) return 'cloudy';
  if (probability > 15) return 'partlyCloudy';
  
  return 'sunBold';
};

const mapWeatherIconToIconName = (weatherIcon: WeatherIconName): 'wind' | 'snow' | 'lightRain' | 'thunderstorm' | 'rainy' | 'cloudy' | 'partlyCloudy' | 'sunBold' => {
  switch (weatherIcon) {
    case 'wind': return 'wind';
    case 'thunderstorm': return 'thunderstorm';
    case 'rainy': return 'rainy';
    case 'smallRain': return 'lightRain';
    case 'snow': return 'snow';
    case 'cloudy': return 'cloudy';
    case 'partlyCloudy': return 'partlyCloudy';
    default: return 'sunBold';
  }
};

const getIconColor = (iconName: WeatherIconName): string => {
  switch (iconName) {
    case 'wind': return 'text-gray-500 dark:text-gray-400';
    case 'thunderstorm': return 'text-purple-600 dark:text-purple-400';
    case 'rainy':
    case 'smallRain': return 'text-blue dark:text-blue-dark';
    case 'snow': return 'text-sky-400 dark:text-sky-300';
    case 'cloudy': return 'text-gray dark:text-gray-dark';
    case 'partlyCloudy': return 'text-gray-400 dark:text-gray-500';
    default: return 'text-yellow-400 dark:text-yellow-500';
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
    if (closingYear && closingYear <= currentYear) { setLoading(false); return; }
    const weatherEnabled = process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST === 'true';
    if (!weatherEnabled) { setLoading(false); return; }

    const cacheKey = slug;
    const cached = forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FORECAST_CACHE_TTL_MS) { setWeather(cached.data); setLoading(false); return; }

    const stored = getStoredWeatherCache()[cacheKey];
    if (stored && Date.now() - stored.timestamp < FORECAST_CACHE_TTL_MS) {
      forecastCache.set(cacheKey, stored);
      setWeather(stored.data);
      setLoading(false);
      return;
    }

    let promise = inFlightRequests.get(cacheKey);
    if (!promise) {
      promise = (async (): Promise<WeatherForecast | null> => {
        try {
          const response = await fetch(`/api/weather/forecast?slug=${slug}`);
          if (!response.ok) { if (response.status === 404) return null; throw new Error('Failed to fetch weather'); }
          const data = await response.json();
          const forecast = data.forecast as WeatherForecast;
          const entry = { data: forecast, timestamp: Date.now() };
          forecastCache.set(cacheKey, entry);
          setStoredWeatherForSlug(cacheKey, entry);
          return forecast;
        } catch (err) { throw err; } finally { inFlightRequests.delete(cacheKey); }
      })();
      inFlightRequests.set(cacheKey, promise);
    }

    let cancelled = false;
    promise.then((forecast) => {
      if (!cancelled) { if (forecast) setWeather(forecast); else setError('Weather forecast not available'); }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load weather');
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug, closingYear]);

  if (!process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST || process.env.NEXT_PUBLIC_ENABLE_WEATHER_FORECAST !== 'true') return null;
  if (closingYear && closingYear <= new Date().getFullYear()) return null;

  if (loading) {
    return (
      <Card className="mb-8 shadow-none">
        <CardHeader><CardTitle className="text-xl font-semibold flex items-center gap-2"><Icon name="sunBold" className="w-5 h-5" />{t('weatherForecast')}</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center py-8"><LoadingSpinner className="h-8" /></div></CardContent>
      </Card>
    );
  }

  if (error || !weather) return null;

  const formatDayName = (dateString: string) => new Date(dateString).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
  const formatDateShort = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatLastUpdated = (dateString: string) => {
    const d = new Date(dateString);
    return locale === 'he' ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const getHourlyForecastForDay = (dayDate: string) => {
    if (!weather.hourlyForecast) return [];
    const target = dayDate.split('T')[0];
    return weather.hourlyForecast.filter(h => h.time.startsWith(target));
  };

  // Helper to get probability color based on skater risk
  const getProbColor = (prob: number) => {
    if (prob <= 20) return 'text-green dark:text-green-dark';
    if (prob <= 45) return 'text-orange dark:text-orange-dark';
    return 'text-red dark:text-red-dark';
  };

  return (
    <Card className="mb-8 !p-0 shadow-none rounded-none">
      <CardHeader>
        <CardTitle className="flex justify-between items-end">
          <div className="text-base sm:text-lg font-semibold flex items-center gap-2"><Icon name="sunBold" className="w-5 h-5" />{t('weatherForecast')}</div>
          <p className="font-medium text-xs text-text/50 dark:text-text-dark/50">{t('lastUpdated')}: {formatLastUpdated(weather.lastUpdated)}</p> 
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2">
          {weather.dailyForecast.slice(0, 7).map((day, index) => {
            const dayHours = getHourlyForecastForDay(day.date);
            
            const skatingHours = dayHours.filter(h => {
              const hr = new Date(h.time).getHours();
              return hr >= 8 && hr <= 22;
            });

            const maxSkateProb = skatingHours.length > 0 ? Math.max(...skatingHours.map(h => h.probability)) : day.probability;

            // Localized labels for AM/PM context
            const isPMRisk = skatingHours.some(h => new Date(h.time).getHours() >= 16 && h.probability >= 20);
            const isAMRisk = skatingHours.some(h => new Date(h.time).getHours() < 12 && h.probability >= 20);
            
            const timeContext = locale === 'he' 
              ? (isPMRisk && !isAMRisk ? 'בערב' : isAMRisk && !isPMRisk ? 'בבוקר' : '')
              : (isPMRisk && !isAMRisk ? 'PM' : isAMRisk && !isPMRisk ? 'AM' : '');

            const activeRainInWindow = skatingHours.some(h => h.probability > 25 || h.precipitation > 0.2);
            
            let iconName = getWeatherIcon(day.precipitation, day.probability, day.minTemperature, day.weatherMain);

            if (activeRainInWindow && maxSkateProb >= 35) {
              iconName = 'smallRain'; 
            } else if (maxSkateProb > 20) {
              iconName = 'cloudy';
            } else {
              iconName = 'sunBold';
            }

            return (
              <div key={index} onClick={() => setSelectedDay(day)} className="flex flex-col items-center min-w-[65px] flex-1 py-3 px-1 rounded-lg bg-gray-bg/50 dark:bg-gray-bg-dark cursor-pointer hover:bg-gray-hover-bg dark:hover:bg-gray-hover-bg-dark transition-all">
                <p className="text-[10px] text-gray dark:text-gray-dark">{formatDateShort(day.date)}</p>
                <p className="text-sm font-semibold mt-0.5">{formatDayName(day.date)}</p>
                <div className="my-3">
                  <Icon name={mapWeatherIconToIconName(iconName)} className={`w-8 h-8 navLowShadow ${getIconColor(iconName)}`} />
                </div>

                <p className="text-sm font-medium">{Math.round(day.maxTemperature ?? 0)}°</p>
                
                <div className="mt-2 h-4 flex flex-col items-center justify-center">
                  {maxSkateProb > 10 ? (
                    <div className="flex items-center gap-1 leading-none">
                      <p className={`text-[11px] font-bold ${getProbColor(maxSkateProb)}`}>
                        {maxSkateProb}%
                      </p>
                      {timeContext && (
                        <span className="text-xs text-gray-400 font-medium -mt-[2px]">
                          {timeContext}
                        </span>
                      )}
                    </div>
                  ) : <p className="text-sm text-gray-300">--</p>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div className="bg-background dark:bg-background-dark rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold">{new Date(selectedDay.date).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <button onClick={() => setSelectedDay(null)} className="p-1 rounded-full">
                <X className="w-6 h-6" />
                </button>
            </div>
            <Separator />
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {getHourlyForecastForDay(selectedDay.date).map((hour, idx) => {
                const hIcon = getWeatherIcon(hour.precipitation, hour.probability, hour.temperature, hour.weatherMain);
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-12">{formatTime(hour.time)}</span>
                      <Icon name={mapWeatherIconToIconName(hIcon)} className={`w-5 h-5 ${getIconColor(hIcon)}`} />
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-semibold">{Math.round(hour.temperature ?? 0)}°</span>
                      <span className={`text-xs font-bold w-12 text-right ${getProbColor(hour.probability)}`}>
                        {hour.probability > 0 ? `${hour.probability}%` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}