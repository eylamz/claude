'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Input, Select, Dropdown, Skeleton } from '@/components/ui';

interface Skatepark {
  _id?: string;
  id?: string;
  slug: string;
  name: {
    en: string;
    he: string;
  };
  address: {
    en: string;
    he: string;
  };
  area: 'north' | 'center' | 'south';
  status: 'active' | 'inactive';
  isFeatured: boolean;
  openingYear?: number;
  images: Array<{
    url: string;
    isFeatured: boolean;
    orderNumber: number;
  }>;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  rating: number;
  totalReviews: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export default function SkateparksPage() {
  const locale = useLocale();
  const router = useRouter();
  const [skateparks, setSkateparks] = useState<Skatepark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('');
  const [amenities, setAmenities] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset to page 1 when search changes
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change (except search, which is handled above)
  useEffect(() => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [area, status, amenities, sortBy, sortOrder]);

  const fetchSkateparks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        search: debouncedSearch,
        sortBy,
        sortOrder,
        ...(area && { area }),
        ...(status && { status }),
        ...(amenities && { amenities }),
      });

      const response = await fetch(`/api/admin/skateparks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch skateparks');

      const data = await response.json();
      setSkateparks(data.skateparks);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching skateparks:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, area, status, amenities, sortBy, sortOrder]);

  useEffect(() => {
    fetchSkateparks();
  }, [fetchSkateparks]);

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
    if (selectedItems.size === skateparks.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(skateparks.map(s => s._id || s.id || '').filter(Boolean)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    if (confirm(`Delete ${selectedItems.size} selected skatepark(s)?`)) {
      console.log('Deleting:', Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleBulkStatusUpdate = (newStatus: string) => {
    if (selectedItems.size === 0) return;
    console.log('Updating status:', Array.from(selectedItems), newStatus);
    setSelectedItems(new Set());
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const getAreaName = (area: string) => {
    const areas: Record<string, string> = {
      north: 'North',
      center: 'Center',
      south: 'South',
    };
    return areas[area] || area;
  };

  const formatAddress = (address: { en: string; he: string }) => {
    return address.en || address.he || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skateparks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage skatepark listings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          >
            {viewMode === 'list' ? 'Map View' : 'List View'}
          </Button>
          <Button variant="primary" onClick={() => router.push(`/${locale}/admin/skateparks/new`)}>
            Add Skatepark
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
                placeholder="Search by name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                options={[
                  { value: '', label: 'All Areas' },
                  { value: 'north', label: 'North' },
                  { value: 'center', label: 'Center' },
                  { value: 'south', label: 'South' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
                options={[
                  { value: '', label: 'All Amenities' },
                  { value: 'parking', label: 'Parking' },
                  { value: 'bathroom', label: 'Bathroom' },
                  { value: 'shade', label: 'Shade' },
                  { value: 'guard', label: 'Guard' },
                  { value: 'seating', label: 'Seating' },
                  { value: 'bombShelter', label: 'Bomb Shelter' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedItems.size} skatepark(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={() => handleBulkStatusUpdate('active')}>
                  Set Active
                </Button>
                <Button variant="secondary" onClick={() => handleBulkStatusUpdate('inactive')}>
                  Set Inactive
                </Button>
                <Button variant="secondary" onClick={() => console.log('Export to CSV')}>
                  Export to CSV
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete}>
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skateparks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === skateparks.length && skateparks.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Area
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Opening Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Featured
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : skateparks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No skateparks found
                    </td>
                  </tr>
                ) : (
                  skateparks.map((skatepark) => {
                    const skateparkId = skatepark._id || skatepark.id || '';
                    return (
                    <tr key={skateparkId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(skateparkId)}
                          onChange={() => toggleSelection(skateparkId)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                          <img
                            src={skatepark.images?.[0]?.url || '/placeholder-skatepark.jpg'}
                            alt={skatepark.name.en}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-skatepark.jpg';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <button
                            onClick={() => router.push(`/${locale}/admin/skateparks/${skateparkId}`)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {skatepark.name.en}
                          </button>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{skatepark.name.he}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {getAreaName(skatepark.area)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {formatAddress(skatepark.address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {skatepark.openingYear || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {skatepark.isFeatured ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                            Featured
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(skatepark.status)}`}>
                          {skatepark.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Dropdown
                          trigger={
                            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          }
                          options={[
                            {
                              label: 'Edit',
                              value: 'edit',
                              onClick: () => router.push(`/${locale}/admin/skateparks/${skateparkId}`),
                            },
                            {
                              label: 'Delete',
                              value: 'delete',
                              onClick: () => {
                                if (confirm(`Delete ${skatepark.name.en}?`)) {
                                  console.log('Delete:', skateparkId);
                                }
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} skateparks
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
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
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
    </div>
  );
}


