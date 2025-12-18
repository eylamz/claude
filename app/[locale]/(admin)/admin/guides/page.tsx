'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Input, Skeleton } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

interface Guide {
  id: string;
  slug: string;
  title: {
    en: string;
    he: string;
  };
  description: {
    en: string;
    he: string;
  };
  coverImage: string;
  relatedSports: string[];
  tags: string[] | { en: string[]; he: string[] }; // Support both old (array) and new (localized) formats
  viewsCount: number;
  likesCount: number;
  rating: number;
  ratingCount: number;
  status: string;
  isFeatured: boolean;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

const SPORTS = [
  'Skateboarding',
  'BMX',
  'Scooter',
  'Longboarding',
  'Roller Skating',
  'Ski',
  'Snowboard',
];

// Helper function to get tags array based on locale
const getTagsForLocale = (tags: string[] | { en: string[]; he: string[] } | undefined, locale: string): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags; // Old format
  if (typeof tags === 'object' && 'en' in tags && 'he' in tags) {
    return tags[locale as 'en' | 'he'] || tags.en || tags.he || [];
  }
  return [];
};

export default function GuidesPage() {
  const locale = useLocale();
  const router = useRouter();
  const [guides, setGuides] = useState<Guide[]>([]);
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
  const [status, setStatus] = useState('all');
  const [sport, setSport] = useState('all');
  const [sortBy, setSortBy] = useState('viewsCount');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchGuides = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(status && status !== 'all' && { status }),
        ...(sport && sport !== 'all' && { sport }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/guides?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch guides');

      const data = await response.json();
      setGuides(data.guides);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, search, status, sport, sortBy, sortOrder]);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

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
    if (selectedItems.size === guides.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(guides.map(g => g.id)));
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedItems.size === 0) return;
    
    const actionLabels: Record<string, string> = {
      'publish': 'publish',
      'archive': 'archive',
      'delete': 'delete',
      'toggle-feature': 'toggle featured status',
      'toggle-publish': 'toggle publish status',
    };
    
    const actionLabel = actionLabels[action] || action;
    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to delete ${selectedItems.size} selected guide(s)? This action cannot be undone.`
      : `Are you sure you want to ${actionLabel} ${selectedItems.size} selected guide(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkOperation(action);
    const guideIds = Array.from(selectedItems);
    const results = { success: 0, failed: 0 };
    const errors: string[] = [];

    try {
      if (action === 'delete') {
        // Delete guides
        for (const guideId of guideIds) {
          try {
            const response = await fetch(`/api/admin/guides/${guideId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to delete guide');
            }
          } catch (error) {
            results.failed++;
            const guide = guides.find(g => g.id === guideId);
            errors.push(guide ? guide.title.en : guideId);
            console.error(`Error deleting guide ${guideId}:`, error);
          }
        }

        // Remove successfully deleted guides from local state
        setGuides(prevGuides => prevGuides.filter(guide => !guideIds.includes(guide.id)));
        
      } else if (action === 'publish' || action === 'archive') {
        // Update status
        const newStatus = action === 'publish' ? 'published' : 'archived';
        
        for (const guideId of guideIds) {
          try {
            const response = await fetch(`/api/admin/guides/${guideId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update guide');
            }
          } catch (error) {
            results.failed++;
            const guide = guides.find(g => g.id === guideId);
            errors.push(guide ? guide.title.en : guideId);
            console.error(`Error updating guide ${guideId}:`, error);
          }
        }

        // Update guides in local state
        setGuides(prevGuides =>
          prevGuides.map(guide =>
            guideIds.includes(guide.id) ? { ...guide, status: newStatus } : guide
          )
        );
      } else if (action === 'toggle-feature') {
        // Toggle featured status
        for (const guideId of guideIds) {
          try {
            const guide = guides.find(g => g.id === guideId);
            if (!guide) continue;

            const response = await fetch(`/api/admin/guides/${guideId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isFeatured: !guide.isFeatured }),
            });

            if (response.ok) {
              results.success++;
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to update guide');
            }
          } catch (error) {
            results.failed++;
            const guide = guides.find(g => g.id === guideId);
            errors.push(guide ? guide.title.en : guideId);
            console.error(`Error updating guide ${guideId}:`, error);
          }
        }

        // Update guides in local state
        setGuides(prevGuides =>
          prevGuides.map(guide =>
            guideIds.includes(guide.id)
              ? { ...guide, isFeatured: !guide.isFeatured }
              : guide
          )
        );
      }

      // Show results
      if (results.failed > 0) {
        alert(`Completed: ${results.success} succeeded, ${results.failed} failed.\n\nFailed guides: ${errors.join(', ')}`);
      } else {
        alert(`Successfully ${actionLabel}ed ${results.success} guide(s).`);
      }

      // Refresh the list
      fetchGuides();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert(`Error performing bulk action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkOperation(null);
      setSelectedItems(new Set());
    }
  };

  const handleStatusChange = async (guideId: string, newStatus: string) => {
    try {
      setUpdatingStatus(guideId);
      const response = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Update the guide in the local state
      setGuides(prevGuides =>
        prevGuides.map(guide =>
          guide.id === guideId ? { ...guide, status: newStatus } : guide
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleToggleFeature = async (guideId: string) => {
    try {
      setUpdatingStatus(guideId);
      const guide = guides.find(g => g.id === guideId);
      if (!guide) return;

      const response = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !guide.isFeatured }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update guide');
      }

      // Update the guide in the local state
      setGuides(prevGuides =>
        prevGuides.map(g =>
          g.id === guideId ? { ...g, isFeatured: !g.isFeatured } : g
        )
      );
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update guide');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDeleteGuide = async (guideId: string, guideTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${guideTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setUpdatingStatus(guideId);
      const response = await fetch(`/api/admin/guides/${guideId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete guide');
      }

      // Remove the guide from the local state
      setGuides(prevGuides => prevGuides.filter(guide => guide.id !== guideId));
      
      // Close popover if it was open for this guide
      if (viewPopoverOpen === guideId) {
        setViewPopoverOpen(null);
      }
      
      // Refresh the list to update pagination
      fetchGuides();
    } catch (error) {
      console.error('Error deleting guide:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete guide');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300',
      published: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      archived: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < fullStars) {
            return (
              <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            );
          } else if (i === fullStars && hasHalfStar) {
            return (
              <svg key={i} className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path fill={`url(#half-${i})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            );
          } else {
            return (
              <svg key={i} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Guides</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage guides and tutorials
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="primary" onClick={() => router.push(`/${locale}/admin/guides/new`)}>
            Create Guide
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
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sports" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sports</SelectItem>
                  {SPORTS.map(s => (
                    <SelectItem key={s.toLowerCase()} value={s.toLowerCase()}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewsCount-desc">Most Views</SelectItem>
                  <SelectItem value="viewsCount-asc">Least Views</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="rating-asc">Lowest Rated</SelectItem>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
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
                {selectedItems.size} guide(s) selected
              </p>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="secondary" 
                  onClick={() => handleBulkAction('publish')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'publish' ? 'Publishing...' : 'Publish'}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => handleBulkAction('archive')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'archive' ? 'Archiving...' : 'Archive'}
                </Button>
                <Button 
                  variant="destructive" 
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

      {/* Guides Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === guides.length && guides.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cover
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Featured
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
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : guides.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No guides found
                    </td>
                  </tr>
                ) : (
                  guides.map((guide) => (
                    <tr key={guide.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(guide.id)}
                          onChange={() => toggleSelection(guide.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                          {guide.coverImage ? (
                            <img
                              src={guide.coverImage}
                              alt={guide.title.en}
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
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <button
                            onClick={() => router.push(`/${locale}/admin/guides/${guide.id}`)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {guide.title.en}
                          </button>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{guide.title.he}</div>
                          {guide.isFeatured && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {guide.relatedSports.slice(0, 2).map((sport) => (
                            <span key={sport} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                              {sport}
                            </span>
                          ))}
                          {guide.relatedSports.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">+{guide.relatedSports.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {(() => {
                          const tags = getTagsForLocale(guide.tags, locale);
                          return tags.slice(0, 3).join(', ') + (tags.length > 3 ? '...' : '');
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {renderStars(guide.rating)}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {guide.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({guide.ratingCount})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {guide.viewsCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guide.status)}`}>
                          {guide.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {guide.isFeatured ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                            Featured
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Popover open={viewPopoverOpen === guide.id} onOpenChange={(open) => setViewPopoverOpen(open ? guide.id : null)}>
                            <PopoverTrigger asChild>
                              <Button type="button" variant="secondary" size="sm">
                                View
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-96 p-0" align="end">
                              <div className="p-4 space-y-4">
                                {/* Cover Image */}
                                {guide.coverImage && (
                                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                    <img
                                      src={guide.coverImage}
                                      alt={guide.title.en}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder-guide.jpg';
                                      }}
                                    />
                                  </div>
                                )}
                                
                                {/* Title */}
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{guide.title.en}</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{guide.title.he}</p>
                                </div>

                                {/* Description */}
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{guide.description.en}</p>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{guide.viewsCount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Likes</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{guide.likesCount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{guide.rating.toFixed(1)} ({guide.ratingCount})</p>
                                  </div>
                                </div>

                                {/* Sports & Tags */}
                                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sports</p>
                                    <div className="flex flex-wrap gap-1">
                                      {guide.relatedSports.slice(0, 3).map((sport) => (
                                        <span key={sport} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                                          {sport}
                                        </span>
                                      ))}
                                      {guide.relatedSports.length > 3 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">+{guide.relatedSports.length - 3}</span>
                                      )}
                                    </div>
                                  </div>
                                  {(() => {
                                    const tags = getTagsForLocale(guide.tags, locale);
                                    return tags.length > 0 && (
                                      <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tags</p>
                                        <div className="flex flex-wrap gap-1">
                                          {tags.slice(0, 5).map((tag) => (
                                            <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                              {tag}
                                            </span>
                                          ))}
                                          {tags.length > 5 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">+{tags.length - 5}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Status Change */}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                  </label>
                                  <Select
                                    value={guide.status}
                                    onValueChange={(value) => handleStatusChange(guide.id, value)}
                                    disabled={updatingStatus === guide.id}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="published">Published</SelectItem>
                                      <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {updatingStatus === guide.id && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Updating...</p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => {
                                        setViewPopoverOpen(null);
                                        router.push(`/${locale}/admin/guides/${guide.id}/edit`);
                                      }}
                                    >
                                      Edit Guide
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => {
                                        setViewPopoverOpen(null);
                                        router.push(`/${locale}/guides/${guide.slug}`);
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
                                      handleDeleteGuide(guide.id, guide.title.en);
                                    }}
                                    disabled={updatingStatus === guide.id}
                                  >
                                    {updatingStatus === guide.id ? 'Deleting...' : 'Delete Guide'}
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/${locale}/admin/guides/${guide.id}/edit`)}
                          >
                            Edit
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleFeature(guide.id)}>
                                {guide.isFeatured ? 'Unfeature' : 'Feature'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => console.log('Duplicate:', guide.id)}>
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteGuide(guide.id, guide.title.en)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
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
                {pagination.totalCount} guides
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



