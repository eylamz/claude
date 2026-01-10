'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Users,
  Share2,
  Plus,
  Filter,
  Search,
  X,
  CheckCircle,
} from 'lucide-react';
import { Button, Card, CardContent, Accordion, Checkbox, Drawer, Input, Select, Skeleton } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';

interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  interestedCount: number;
  maxParticipants?: number;
  currentParticipants: number;
  isFree: boolean;
  price?: number;
  sports: string[];
  isHappeningNow: boolean;
  isPast: boolean;
}

interface CalendarEvent {
  date: Date;
  event: Event;
}

export default function EventsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('events');
  
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [sports, setSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View and filter states
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(
    searchParams.get('view') === 'calendar' ? 'calendar' : 'list'
  );
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>(
    searchParams.get('time') === 'past' ? 'past' : 'upcoming'
  );
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  
  // Filters
  const [selectedSports, setSelectedSports] = useState<string[]>(
    searchParams.get('sports')?.split(',').filter(Boolean) || []
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [freeOnly, setFreeOnly] = useState(searchParams.get('freeOnly') === 'true');
  const [hasSpotsAvailable, setHasSpotsAvailable] = useState(searchParams.get('hasSpots') === 'true');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: searchParams.get('startDate') || '',
    end: searchParams.get('endDate') || '',
  });
  
  // Mobile drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch events
  useEffect(() => {
    fetchEvents();
    fetchSports();
  }, [locale]);

  // Filter events
  useEffect(() => {
    filterEvents();
  }, [events, timeFilter, selectedSports, searchQuery, freeOnly, hasSpotsAvailable, dateRange]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with actual API endpoint
      const response = await fetch(`/api/events?locale=${locale}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        // Mock data for development
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // Mock data for development
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const fetchSports = async () => {
    try {
      const response = await fetch(`/api/events/sports?locale=${locale}`);
      if (response.ok) {
        const data = await response.json();
        setSports(data.sports || []);
      } else {
        // Mock sports
        setSports(['Skateboarding', 'BMX', 'Scooter', 'Roller Skates', 'Longboard']);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
      setSports(['Skateboarding', 'BMX', 'Scooter', 'Roller Skates', 'Longboard']);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Time filter
    const now = new Date();
    if (timeFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.startDate + 'T' + event.startTime) >= now);
    } else {
      filtered = filtered.filter(event => new Date(event.startDate + 'T' + event.startTime) < now);
    }

    // Sports filter
    if (selectedSports.length > 0) {
      filtered = filtered.filter(event =>
        event.sports.some(sport => selectedSports.includes(sport))
      );
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Free only
    if (freeOnly) {
      filtered = filtered.filter(event => event.isFree);
    }

    // Has spots available
    if (hasSpotsAvailable) {
      filtered = filtered.filter(event =>
        !event.maxParticipants || event.currentParticipants < event.maxParticipants
      );
    }

    // Date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(event => new Date(event.startDate) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(event => new Date(event.startDate) <= endDate);
    }

    setFilteredEvents(filtered);
  };

  const handleSportToggle = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleClearFilters = () => {
    setSelectedSports([]);
    setSearchQuery('');
    setFreeOnly(false);
    setHasSpotsAvailable(false);
    setDateRange({ start: '', end: '' });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    const eventsOnDate = filteredEvents.filter(event => event.startDate === dateStr);
    setSelectedDateEvents(eventsOnDate);
  };

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (viewMode === 'calendar') params.set('view', 'calendar');
    if (timeFilter === 'past') params.set('time', 'past');
    if (selectedSports.length > 0) params.set('sports', selectedSports.join(','));
    if (searchQuery) params.set('search', searchQuery);
    if (freeOnly) params.set('freeOnly', 'true');
    if (hasSpotsAvailable) params.set('hasSpots', 'true');
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    
    router.push(`/${locale}/events?${params.toString()}`);
  }, [viewMode, timeFilter, selectedSports, searchQuery, freeOnly, hasSpotsAvailable, dateRange, locale, router]);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  const handleShareEvent = async (event: Event) => {
    const url = `${window.location.origin}/${locale}/events/${event.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description,
          url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      // You might want to show a toast notification here
    }
  };

  const handleAddToCalendar = (event: Event) => {
    const startDateTime = new Date(`${event.startDate}T${event.startTime}`);
    const endDateTime = new Date(`${event.endDate || event.startDate}T${event.endTime || event.startTime}`);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const calendarUrl = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDateTime)}`,
      `DTEND:${formatDate(endDateTime)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([calendarUrl], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.slug}.ics`;
    link.click();
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date | null): Event[] => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(event => event.startDate === dateStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const sidebarContent = (
    <div className="space-y-6">
      {/* Related Sports */}
      {sports.length > 0 && (
        <Accordion title={t('filters.sports')} defaultOpen>
          <div className="space-y-2">
            {sports.map((sport) => (
              <Checkbox
                key={sport}
                id={`sport-${sport}`}
                checked={selectedSports.includes(sport)}
                onChange={() => handleSportToggle(sport)}
                label={sport}
              />
            ))}
          </div>
        </Accordion>
      )}
      
      {/* Date Range */}
      <Accordion title={t('filters.dateRange')}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('filters.startDate')}
            </label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('filters.endDate')}
            </label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>
      </Accordion>
      
      {/* Free Events Only */}
      <Checkbox
        id="freeOnly"
        checked={freeOnly}
        onChange={setFreeOnly}
        label={t('filters.freeOnly')}
      />
      
      {/* Has Spots Available */}
      <Checkbox
        id="hasSpotsAvailable"
        checked={hasSpotsAvailable}
        onChange={setHasSpotsAvailable}
        label={t('filters.hasSpotsAvailable')}
      />
      
      {/* Clear Filters */}
      <Button onClick={handleClearFilters} variant="outline" className="w-full">
        {t('filters.clear')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filteredEvents.length} {filteredEvents.length === 1 ? t('event') : t('events')}
              </span>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Icon name="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Upcoming/Past Toggle */}
              <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                <button
                  onClick={() => setTimeFilter('upcoming')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    timeFilter === 'upcoming'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('upcoming')}
                </button>
                <button
                  onClick={() => setTimeFilter('past')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    timeFilter === 'past'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('past')}
                </button>
              </div>

              {/* Calendar/List Toggle */}
              <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={t('listView')}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={t('calendarView')}
                >
                  <CalendarDays className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                {t('filters.title')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            {sidebarContent}
          </aside>
          
          {/* Mobile Drawer */}
          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={t('filters.title')}>
            {sidebarContent}
          </Drawer>
          
          {/* Content */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
              </div>
            ) : viewMode === 'calendar' ? (
              <CalendarView
                currentMonth={currentMonth}
                onMonthChange={navigateMonth}
                events={filteredEvents}
                onDateClick={handleDateClick}
                selectedDate={selectedDate}
                t={t}
              />
            ) : filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                    onShare={() => handleShareEvent(event)}
                    onAddToCalendar={() => handleAddToCalendar(event)}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">{t('noEventsFound')}</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Selected Date Events Modal */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('eventsOnDate')}: {selectedDate.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                {selectedDateEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    locale={locale}
                    onShare={() => handleShareEvent(event)}
                    onAddToCalendar={() => handleAddToCalendar(event)}
                    t={t}
                    compact
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Calendar View Component
interface CalendarViewProps {
  currentMonth: Date;
  onMonthChange: (direction: 'prev' | 'next') => void;
  events: Event[];
  onDateClick: (date: Date) => void;
  selectedDate: Date | null;
  t: any;
}

function CalendarView({ currentMonth, onMonthChange, events, onDateClick, selectedDate, t }: CalendarViewProps) {
  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const getEventsForDate = (date: Date | null): Event[] => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.startDate === dateStr);
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{monthName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMonthChange('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => onMonthChange('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {days.map((date, index) => {
            const dateEvents = getEventsForDate(date);
            const hasEvents = dateEvents.length > 0;
            const today = isToday(date);
            const selected = isSelected(date);
            
            return (
              <button
                key={index}
                onClick={() => date && onDateClick(date)}
                disabled={!date}
                className={`
                  aspect-square p-2 border rounded-lg text-sm transition-colors
                  ${!date ? 'border-transparent' : ''}
                  ${date && !selected && !today ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
                  ${today && !selected ? 'border-blue-400 bg-blue-50 dark:bg-blue-900' : ''}
                  ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'text-gray-900 dark:text-white'}
                  ${!date ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                {date && (
                  <>
                    <div className="font-medium">{date.getDate()}</div>
                    {hasEvents && (
                      <div className="flex justify-center gap-1 mt-1">
                        {dateEvents.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              selected ? 'bg-white' : 'bg-blue-500'
                            }`}
                          />
                        ))}
                        {dateEvents.length > 3 && (
                          <div className={`text-xs ${selected ? 'text-white' : 'text-blue-500'}`}>
                            +{dateEvents.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Event Card Component
interface EventCardProps {
  event: Event;
  locale: string;
  onShare: () => void;
  onAddToCalendar: () => void;
  t: any;
  compact?: boolean;
}

function EventCard({ event, locale, onShare, onAddToCalendar, t, compact = false }: EventCardProps) {
  const isPast = new Date(event.startDate + 'T' + event.startTime) < new Date();
  const hasSpotsAvailable = !event.maxParticipants || event.currentParticipants < event.maxParticipants;
  const isFull = event.maxParticipants && event.currentParticipants >= event.maxParticipants;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg ${isPast ? 'opacity-60' : ''}`}>
      <Link href={`/${locale}/events/${event.slug}`}>
        <div className="relative aspect-video">
          <Image
            src={event.image || '/placeholder-event.jpg'}
            alt={event.title}
            fill
            className="object-cover"
          />
          {event.isHappeningNow && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              {t('happeningNow')}
            </div>
          )}
          {isFull && (
            <div className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-semibold">
              {t('full')}
            </div>
          )}
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/${locale}/events/${event.slug}`}>
          <h3 className={`font-bold text-gray-900 dark:text-white mb-2 ${compact ? 'text-lg' : 'text-xl'}`}>
            {event.title}
          </h3>
        </Link>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date(event.startDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {event.endDate && event.endDate !== event.startDate && (
              <> - {new Date(event.endDate).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
                month: 'short',
                day: 'numeric',
              })}</>
            )}
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 mr-2" />
            {event.startTime}
            {event.endTime && <> - {event.endTime}</>}
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mr-2" />
            {event.location}
          </div>
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 mr-2" />
            {event.interestedCount} {t('interested')}
            {event.maxParticipants && (
              <> ({event.currentParticipants}/{event.maxParticipants} {t('registered')})</>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {event.isFree ? t('free') : `₪${event.price}`}
          </div>
          <div className="flex flex-wrap gap-1">
            {event.sports.map((sport) => (
              <span
                key={sport}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-300"
              >
                {sport}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/${locale}/events/${event.slug}`;
            }}
            disabled={isFull || isPast}
          >
            {isFull ? t('full') : isPast ? t('past') : t('signUp')}
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onShare();
            }}
            title={t('share')}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onAddToCalendar();
            }}
            title={t('addToCalendar')}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for calendar
function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
}

// Mock events data for development
const mockEvents: Event[] = [
  {
    id: '1',
    slug: 'skateboard-competition-2024',
    title: 'Tel Aviv Skateboard Competition',
    description: 'Annual skateboard competition in Tel Aviv',
    image: '/placeholder-event.jpg',
    startDate: '2024-12-15',
    endDate: '2024-12-15',
    startTime: '10:00',
    endTime: '18:00',
    location: 'Tel Aviv Skatepark',
    address: '123 Main St, Tel Aviv',
    interestedCount: 45,
    maxParticipants: 100,
    currentParticipants: 67,
    isFree: false,
    price: 50,
    sports: ['Skateboarding'],
    isHappeningNow: false,
    isPast: false,
  },
  {
    id: '2',
    slug: 'bmx-workshop',
    title: 'BMX Freestyle Workshop',
    description: 'Learn BMX tricks from professionals',
    image: '/placeholder-event.jpg',
    startDate: '2024-12-20',
    endDate: '2024-12-20',
    startTime: '14:00',
    endTime: '16:00',
    location: 'Haifa Skatepark',
    address: '456 Park Ave, Haifa',
    interestedCount: 32,
    maxParticipants: 30,
    currentParticipants: 30,
    isFree: true,
    sports: ['BMX'],
    isHappeningNow: false,
    isPast: false,
  },
];


