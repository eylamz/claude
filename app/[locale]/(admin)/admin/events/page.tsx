'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Skeleton, SelectWrapper, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, Toaster } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { NumberInput } from '@/components/ui/number-input';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  startDate: string;
  endDate: string;
  location: {
    name: {
      en: string;
      he: string;
    };
    address: {
      en: string;
      he: string;
    };
  };
  relatedSports: string[];
  category: string;
  viewsCount: number;
  interestedCount: number;
  attendedCount: number;
  status: string;
  isFeatured: boolean;
  featuredImage: string;
  capacity?: number;
  isFree: boolean;
  price?: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

const SPORTS = [
  'Roller',
  'Skate',
  'Scoot',
  'BMX',
  'Longboard',
];

const CATEGORIES = [
  'Competition',
  'Workshop',
  'Jam',
  'Tournament',
  'Meetup',
  'Demo',
  'Other',
];

export default function EventsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewPopoverOpen, setViewPopoverOpen] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [bulkOperation, setBulkOperation] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sport, setSport] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Cache version control
  const [eventsVersion, setEventsVersion] = useState<number>(1);
  const [savingVersion, setSavingVersion] = useState(false);
  
  // Toast hook
  const { toast } = useToast();
  
  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setEventsVersion(data.settings?.eventsVersion || 1);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  // Save version
  const handleSaveVersion = async () => {
    try {
      setSavingVersion(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventsVersion }),
      });
      if (!response.ok) throw new Error('Failed to save version');
      toast({
        title: 'Success',
        description: 'Events cache version saved successfully!',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving version:', error);
      toast({
        title: 'Error',
        description: 'Failed to save events cache version',
        variant: 'error',
      });
    } finally {
      setSavingVersion(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [status, sport, category, sortBy, sortOrder]);

  const fetchEvents = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(status && status !== 'all' && { status }),
        ...(sport && sport !== 'all' && { sport }),
        ...(category && category !== 'all' && { category }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/events?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch events: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      setPagination(data.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: pagination.limit,
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch events',
        variant: 'error',
      });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, status, sport, category, sortBy, sortOrder, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === events.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(events.map(e => e.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.size === 0) return;
    
    const actionLabels: Record<string, string> = {
      'publish': 'publish',
      'cancel': 'cancel',
      'delete': 'delete',
      'toggle-feature': 'toggle featured status',
    };
    
    const actionLabel = actionLabels[action] || action;
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedItems.size} selected event(s)? This action cannot be undone.`
      : `Are you sure you want to ${actionLabel} ${selectedItems.size} selected event(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkOperation(action);
    const eventIds = Array.from(selectedItems);
    const results = { success: 0, failed: 0 };
    const errors: string[] = [];

    try {
      if (action === 'delete') {
        for (const eventId of eventIds) {
          try {
            const response = await fetch(`/api/admin/events/${eventId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete event');
            }
          } catch (error) {
            results.failed++;
            const event = events.find(e => e.id === eventId);
            errors.push(event ? event.title.en : eventId);
            console.error(`Error deleting event ${eventId}:`, error);
          }
        }

        setEvents(prevEvents => prevEvents.filter(event => !eventIds.includes(event.id)));
        
      } else if (action === 'publish' || action === 'cancel') {
        const newStatus = action === 'publish' ? 'published' : 'cancelled';
        
        for (const eventId of eventIds) {
          try {
            const response = await fetch(`/api/admin/events/${eventId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update event');
            }
          } catch (error) {
            results.failed++;
            const event = events.find(e => e.id === eventId);
            errors.push(event ? event.title.en : eventId);
            console.error(`Error updating event ${eventId}:`, error);
          }
        }

        setEvents(prevEvents =>
          prevEvents.map(event =>
            eventIds.includes(event.id) ? { ...event, status: newStatus } : event
          )
        );
      } else if (action === 'toggle-feature') {
        for (const eventId of eventIds) {
          try {
            const event = events.find(e => e.id === eventId);
            if (!event) continue;

            const response = await fetch(`/api/admin/events/${eventId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isFeatured: !event.isFeatured }),
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update event');
            }
          } catch (error) {
            results.failed++;
            const event = events.find(e => e.id === eventId);
            errors.push(event ? event.title.en : eventId);
            console.error(`Error updating event ${eventId}:`, error);
          }
        }

        setEvents(prevEvents =>
          prevEvents.map(event =>
            eventIds.includes(event.id)
              ? { ...event, isFeatured: !event.isFeatured }
              : event
          )
        );
      }

      if (results.failed > 0) {
        toast({
          title: 'Partial Success',
          description: `Completed: ${results.success} succeeded, ${results.failed} failed. Failed events: ${errors.join(', ')}`,
          variant: 'warning',
        });
      } else {
        toast({
          title: 'Success',
          description: `Successfully ${actionLabel}ed ${results.success} event(s).`,
          variant: 'success',
        });
      }

      fetchEvents();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: 'Error',
        description: `Error performing bulk action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'error',
      });
    } finally {
      setBulkOperation(null);
      setSelectedItems(new Set());
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      setUpdatingStatus(eventId);
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId ? { ...event, status: newStatus } : event
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleToggleFeature = async (eventId: string) => {
    try {
      setUpdatingStatus(eventId);
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !event.isFeatured }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === eventId ? { ...e, isFeatured: !e.isFeatured } : e
        )
      );
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update event',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setUpdatingStatus(eventId);
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      
      if (viewPopoverOpen === eventId) {
        setViewPopoverOpen(null);
      }
      
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete event',
        variant: 'error',
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
      published: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
      completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="pt-16 space-y-6">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Events</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage events and competitions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="gray"
            className='flex items-center gap-1'
            onClick={async () => {
              setIsRefreshing(true);
              await fetchEvents();
              setIsRefreshing(false);
              toast({
                title: 'Success',
                description: 'Data has been refreshed successfully!',
                variant: 'success',
              });
            }}
            title="Refresh"
            disabled={isRefreshing}
          >
            Refresh
            <svg 
              className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Button variant="green" onClick={() => router.push(`/${locale}/admin/events/new`)}>
            Create Event
          </Button>
        </div>
      </div>

      {/* Cache Version Control */}
      <Card className="bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Events Cache Version
              </label>
              <NumberInput
                value={eventsVersion}
                onChange={(e) => setEventsVersion(parseInt(e.target.value) || 1)}
                min={1}
                className="w-32"
                showSpinner={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Increment this version to invalidate all client caches
              </p>
            </div>
            <Button
              variant="info"
              onClick={handleSaveVersion}
              disabled={savingVersion}
            >
              {savingVersion ? 'Saving...' : 'Save Version'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="!p-0 bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="Search by title..."
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="">
                <SelectWrapper
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Sports' },
                    ...SPORTS.map(s => ({ value: s.toLowerCase(), label: s }))
                  ]}
                />
              </div>
              <div className="">
                <SelectWrapper
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...CATEGORIES.map(c => ({ value: c.toLowerCase(), label: c }))
                  ]}
                />
              </div>
              <div className="">
                <SelectWrapper
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                />
              </div>
              <div className="">
                <SelectWrapper
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field);
                    setSortOrder(order);
                  }}
                  options={[
                    { value: 'startDate-desc', label: 'Newest First' },
                    { value: 'startDate-asc', label: 'Oldest First' },
                    { value: 'viewsCount-desc', label: 'Most Views' },
                    { value: 'viewsCount-asc', label: 'Least Views' },
                  ]}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card className="bg-card dark:bg-card-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text dark:text-text-dark">
                {selectedItems.size} event(s) selected
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="orange" 
                  onClick={() => handleBulkAction('publish')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'publish' ? 'Publishing...' : 'Publish'}
                </Button>
                <Button 
                  variant="gray" 
                  onClick={() => handleBulkAction('cancel')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'cancel' ? 'Cancelling...' : 'Cancel'}
                </Button>
                <Button 
                  variant="red" 
                  onClick={() => handleBulkAction('delete')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'delete' ? 'Deleting...' : 'Delete Selected'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                variant="brand"
                id="select-all"
                checked={selectedItems.size === events.length && events.length > 0}
                onChange={() => toggleSelectAll()}
                label=""
              />
            </TableHead>
            <TableHead>
              Cover
            </TableHead>
            <TableHead>
              Title
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Date & Time
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Location
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Sports
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Category
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Views
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Interested
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Attended
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Status
            </TableHead>
            <TableHead>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 13 }).map((_, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                No events found
              </TableCell>
            </TableRow>
          ) : (
            events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap px-4 md:px-6 md:py-3">
                  <Checkbox
                    variant="brand"
                    id={`select-${event.id}`}
                    checked={selectedItems.has(event.id)}
                    onChange={() => toggleSelection(event.id)}
                    label=""
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-2 md:px-6 md:py-3 w-12 md:w-16">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                    {event.featuredImage ? (
                      <img
                        src={event.featuredImage}
                        alt={event.title.en}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          if (!img.dataset.errorHandled) {
                            img.dataset.errorHandled = 'true';
                            img.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <button
                      onClick={() => router.push(`/${locale}/admin/events/${event.id}/edit`)}
                      className="text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                    >
                      {event.title.en}
                    </button>
                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">{event.title.he}</div>
                    {event.isFeatured && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        Featured
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {formatDate(event.startDate)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-text-secondary dark:text-text-secondary-dark max-w-xs truncate">
                  {event.location.name.en || event.location.address.en}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {event.relatedSports.slice(0, 2).map((sport) => (
                      <span key={sport} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                        {sport}
                      </span>
                    ))}
                    {event.relatedSports.length > 2 && (
                      <span className="text-xs text-text-secondary dark:text-text-secondary-dark">+{event.relatedSports.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {event.category}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {event.viewsCount.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {event.interestedCount.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {event.attendedCount}
                  {event.capacity && ` / ${event.capacity}`}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                    {event.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <Popover open={viewPopoverOpen === event.id} onOpenChange={(open) => setViewPopoverOpen(open ? event.id : null)}>
                    <PopoverContent className="w-96 p-0" align="end">
                      <div className="p-4 space-y-4">
                        {/* Cover Image */}
                        {event.featuredImage && (
                          <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                            <img
                              src={event.featuredImage}
                              alt={event.title.en}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-event.jpg';
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Title */}
                        <div>
                          <h3 className="text-lg font-semibold text-text dark:text-text-dark">{event.title.en}</h3>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">{event.title.he}</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Views</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{event.viewsCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Interested</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{event.interestedCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Attended</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">
                              {event.attendedCount}{event.capacity && ` / ${event.capacity}`}
                            </p>
                          </div>
                        </div>

                        {/* Sports & Category */}
                        <div className="space-y-2 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Sports</p>
                            <div className="flex flex-wrap gap-1">
                              {event.relatedSports.slice(0, 3).map((sport) => (
                                <span key={sport} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                                  {sport}
                                </span>
                              ))}
                              {event.relatedSports.length > 3 && (
                                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">+{event.relatedSports.length - 3}</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Category</p>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              {event.category}
                            </span>
                          </div>
                        </div>

                        {/* Status Change */}
                        <div className="pt-2 border-t border-border dark:border-border-dark">
                          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                            Status
                          </label>
                          <Select
                            value={event.status}
                            onValueChange={(value) => handleStatusChange(event.id, value)}
                            disabled={updatingStatus === event.id}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          {updatingStatus === event.id && (
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">Updating...</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border dark:border-border-dark">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setViewPopoverOpen(null);
                                router.push(`/${locale}/admin/events/${event.id}/edit`);
                              }}
                            >
                              Edit Event
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setViewPopoverOpen(null);
                                router.push(`/${locale}/events/${event.slug}`);
                              }}
                            >
                              View Public
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setViewPopoverOpen(null);
                              handleDeleteEvent(event.id, event.title.en);
                            }}
                            disabled={updatingStatus === event.id}
                          >
                            {updatingStatus === event.id ? 'Deleting...' : 'Delete Event'}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(`/${locale}/events/${event.slug}`, '_blank')}>
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/events/${event.id}/edit`)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleFeature(event.id)}>
                        {event.isFeatured ? 'Unfeature' : 'Feature'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log('Duplicate:', event.id)}>
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteEvent(event.id, event.title.en)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} events
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1)
                .map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagination({ ...pagination, currentPage: page })}
                    className={`px-3 py-1 text-sm rounded ${
                      page === pagination.currentPage
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-text-secondary dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
