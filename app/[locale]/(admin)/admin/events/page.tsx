'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Dropdown, Skeleton } from '@/components/ui';

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

const CATEGORIES = [
  'Competition',
  'Workshop',
  'Jam',
  'Tournament',
  'Meetup',
  'Demo',
  'Other',
];

const SPORTS = [
  'Skateboarding',
  'BMX',
  'Scooter',
  'Longboarding',
  'Roller Skating',
  'Ski',
  'Snowboard',
];

export default function EventsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [sport, setSport] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(status && { status }),
        ...(category && { category }),
        ...(sport && { sport }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        upcomingOnly: upcomingOnly.toString(),
        sortBy: 'startDate',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, search, status, category, sport, dateFrom, dateTo, upcomingOnly]);

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

  const handleBulkAction = (action: string) => {
    if (selectedItems.size === 0) return;
    if (confirm(`Perform ${action} on ${selectedItems.size} selected event(s)?`)) {
      console.log(`Bulk action ${action}:`, Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleExportAttendees = (eventId: string) => {
    if (confirm('Export attendee list to CSV?')) {
      console.log('Exporting attendees for event:', eventId);
      // In real implementation, download CSV
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (location: Event['location']) => {
    return `${location.name.en}, ${location.address.en}`;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      Competition: 'bg-purple-100 text-purple-800',
      Workshop: 'bg-blue-100 text-blue-800',
      Jam: 'bg-pink-100 text-pink-800',
      Tournament: 'bg-red-100 text-red-800',
      Meetup: 'bg-green-100 text-green-800',
      Demo: 'bg-yellow-100 text-yellow-800',
    };
    const color = colors[category] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{category}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage events and competitions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
          >
            {viewMode === 'table' ? 'Calendar View' : 'Table View'}
          </Button>
          <Button variant="primary" onClick={() => router.push(`/${locale}/admin/events/new`)}>
            Create Event
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                options={[
                  { value: '', label: 'All Sports' },
                  ...SPORTS.map(s => ({ value: s.toLowerCase(), label: s })),
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...CATEGORIES.map(c => ({ value: c.toLowerCase(), label: c })),
                ]}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="upcomingOnly"
                checked={upcomingOnly}
                onChange={(e) => setUpcomingOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="upcomingOnly" className="ml-2 text-sm text-gray-700">
                Upcoming Only
              </label>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="w-48">
              <Input
                type="date"
                label="Date From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Input
                type="date"
                label="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {selectedItems.size} event(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={() => handleBulkAction('publish')}>
                  Publish
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAction('cancel')}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => handleBulkAction('delete')}>
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View Placeholder */}
      {viewMode === 'calendar' && (
        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-12">
              Calendar view implementation would go here. 
              This would show events on a calendar with month/week/day views.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === events.length && events.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sports
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attended
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 11 }).map((_, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                        No events found
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(event.id)}
                            onChange={() => toggleSelection(event.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                            <img
                              src={event.featuredImage}
                              alt={event.title.en}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-event.jpg';
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <button
                              onClick={() => router.push(`/${locale}/admin/events/${event.id}`)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {event.title.en}
                            </button>
                            <div className="text-xs text-gray-500">{event.title.he}</div>
                            <div className="mt-1">{getCategoryBadge(event.category)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(event.startDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="truncate">{formatAddress(event.location)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {event.relatedSports.slice(0, 2).map((sport) => (
                              <span key={sport} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {sport}
                              </span>
                            ))}
                            {event.relatedSports.length > 2 && (
                              <span className="text-xs text-gray-500">+{event.relatedSports.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.viewsCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {event.interestedCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="text-center">
                            <div>{event.attendedCount}</div>
                            {event.capacity && (
                              <div className="text-xs text-gray-400">/ {event.capacity}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Dropdown
                            trigger={
                              <button className="text-gray-600 hover:text-gray-900">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            }
                            options={[
                              {
                                label: 'View',
                                value: 'view',
                                onClick: () => router.push(`/${locale}/admin/events/${event.id}`),
                              },
                              {
                                label: 'Edit',
                                value: 'edit',
                                onClick: () => router.push(`/${locale}/admin/events/${event.id}/edit`),
                              },
                              {
                                label: 'Export Attendees',
                                value: 'export',
                                onClick: () => handleExportAttendees(event.id),
                              },
                              {
                                label: event.status === 'published' ? 'Unpublish' : 'Publish',
                                value: 'toggle-publish',
                                onClick: () => handleBulkAction('toggle-publish'),
                              },
                              {
                                label: 'Duplicate',
                                value: 'duplicate',
                                onClick: () => console.log('Duplicate:', event.id),
                              },
                              {
                                label: 'Delete',
                                value: 'delete',
                                onClick: () => {
                                  if (confirm(`Delete ${event.title.en}?`)) {
                                    console.log('Delete:', event.id);
                                  }
                                },
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                  {pagination.totalCount} events
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1)
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => setPagination({ ...pagination, currentPage: page })}
                          className={`px-3 py-1 text-sm rounded ${
                            page === pagination.currentPage
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}



