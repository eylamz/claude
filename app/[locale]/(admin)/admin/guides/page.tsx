'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardContent, Skeleton, SelectWrapper, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { NumberInput } from '@/components/ui/number-input';

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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sport, setSport] = useState('all');
  const [sortBy, setSortBy] = useState('viewsCount');
  const [sortOrder, setSortOrder] = useState('desc');

  // Cache version control
  const [guidesVersion, setGuidesVersion] = useState<number>(1);
  const [savingVersion, setSavingVersion] = useState(false);
  
  // Refs to prevent duplicate API calls
  const isFetchingRef = useRef(false);
  const versionCheckInProgressRef = useRef(false);
  const lastVersionCheckRef = useRef<number>(0);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setGuidesVersion(data.settings?.guidesVersion || 1);
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
        body: JSON.stringify({ guidesVersion }),
      });
      if (!response.ok) throw new Error('Failed to save version');
      alert('Version updated successfully!');
    } catch (error) {
      console.error('Error updating version:', error);
      alert('Failed to update version');
    } finally {
      setSavingVersion(false);
    }
  };

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
  }, [status, sport, sortBy, sortOrder]);

  // Check version and update cache if needed (debounced)
  // Using ref to avoid circular dependency
  const fetchGuidesRef = useRef<(() => Promise<void>) | null>(null);

  const fetchGuides = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    const cacheKey = 'guides_cache_all'; // Use all guides cache for admin view
    const versionKey = 'guides_version';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedVersion = localStorage.getItem(versionKey);

    // If cache exists, use it and apply filters/pagination on client side
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        let filteredGuides = [...parsedData];

        // Apply filters
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          filteredGuides = filteredGuides.filter((guide: any) => {
            const titleEn = guide.title?.en || '';
            const titleHe = guide.title?.he || '';
            return titleEn.toLowerCase().includes(searchLower) || 
                   titleHe.toLowerCase().includes(searchLower);
          });
        }

        if (status && status !== 'all') {
          filteredGuides = filteredGuides.filter((guide: any) => guide.status === status);
        }

        if (sport && sport !== 'all') {
          filteredGuides = filteredGuides.filter((guide: any) => 
            guide.relatedSports?.includes(sport)
          );
        }

        // Apply sorting
        filteredGuides.sort((a: any, b: any) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'viewsCount':
              aValue = a.viewsCount || 0;
              bValue = b.viewsCount || 0;
              return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            case 'rating':
              aValue = a.rating || 0;
              bValue = b.rating || 0;
              return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
            case 'createdAt':
            default:
              aValue = new Date(a.createdAt || 0).getTime();
              bValue = new Date(b.createdAt || 0).getTime();
              return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          }
        });

        // Apply pagination
        const totalCount = filteredGuides.length;
        const totalPages = Math.ceil(totalCount / pagination.limit);
        const startIndex = (pagination.currentPage - 1) * pagination.limit;
        const paginatedGuides = filteredGuides.slice(startIndex, startIndex + pagination.limit);

        setGuides(paginatedGuides);
        setPagination({
          currentPage: pagination.currentPage,
          totalPages,
          totalCount,
          limit: pagination.limit,
        });
        setLoading(false);
        isFetchingRef.current = false;

        // Check version in background (debounced, non-blocking)
        // Only check if at least 5 seconds have passed since last check
        const now = Date.now();
        if (now - lastVersionCheckRef.current >= 5000 && !versionCheckInProgressRef.current) {
          versionCheckInProgressRef.current = true;
          lastVersionCheckRef.current = now;
          
          (async () => {
            try {
              const versionResponse = await fetch('/api/guides?versionOnly=true');
              if (versionResponse.ok) {
                const versionData = await versionResponse.json();
                const currentVersion = versionData.version || 1;
                const storedVersion = cachedVersion ? parseInt(cachedVersion) : 0;

                // If versions don't match, update cache
                if (storedVersion !== currentVersion) {
                  // Fetch and cache all guides (including non-published) for admin view
                  try {
                    const allResponse = await fetch('/api/admin/guides?limit=10000');
                    if (allResponse.ok) {
                      const allData = await allResponse.json();
                      const allGuides = allData.guides || [];
                      localStorage.setItem('guides_cache_all', JSON.stringify(allGuides));
                      localStorage.setItem(versionKey, currentVersion.toString());
                    }
                  } catch (e) {
                    console.warn('Failed to fetch all guides during version check', e);
                  }
                  
                  // Also update public cache
                  try {
                    const publicResponse = await fetch('/api/guides?limit=100');
                    if (publicResponse.ok) {
                      const publicData = await publicResponse.json();
                      localStorage.setItem('guides_cache', JSON.stringify(publicData.guides || []));
                    }
                  } catch (e) {
                    console.warn('Failed to update public guides cache during version check', e);
                  }
                  
                  // Only trigger refetch if we're not already fetching
                  if (!isFetchingRef.current && fetchGuidesRef.current) {
                    setTimeout(() => {
                      fetchGuidesRef.current?.();
                    }, 100);
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to check version', e);
            } finally {
              versionCheckInProgressRef.current = false;
            }
          })();
        }

        return; // Exit early since we used cache
      } catch (e) {
        // If cache is corrupted, continue to fetch fresh data
        console.warn('Failed to parse cached guides data', e);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(versionKey);
      }
    }

    // No cache exists or cache was corrupted, fetch fresh data
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
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

      // Update cache in background (non-blocking)
      try {
        // Fetch and cache all guides (including non-published) for admin view
        const allResponse = await fetch('/api/admin/guides?limit=10000');
        if (allResponse.ok) {
          const allData = await allResponse.json();
          const allGuides = allData.guides || [];
          localStorage.setItem('guides_cache_all', JSON.stringify(allGuides));
        }
        
        // Also update public cache and version
        const publicResponse = await fetch('/api/guides?limit=10000');
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          const currentVersion = publicData.version || 1;
          localStorage.setItem('guides_cache', JSON.stringify(publicData.guides || []));
          localStorage.setItem(versionKey, currentVersion.toString());
        }
      } catch (e) {
        console.warn('Failed to update cache', e);
      }
    } catch (error) {
      console.error('Error fetching guides:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, status, sport, sortBy, sortOrder]);

  // Store fetchGuides in ref for version check callback
  useEffect(() => {
    fetchGuidesRef.current = fetchGuides;
  }, [fetchGuides]);

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

      // Clear cache to force refresh
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const allCacheKey = 'guides_cache_all';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);
      localStorage.removeItem(allCacheKey);

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

      // Clear cache to force refresh
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const allCacheKey = 'guides_cache_all';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);
      localStorage.removeItem(allCacheKey);

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

      // Clear cache to force refresh
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const allCacheKey = 'guides_cache_all';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);
      localStorage.removeItem(allCacheKey);

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

      // Clear cache to force refresh
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const allCacheKey = 'guides_cache_all';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);
      localStorage.removeItem(allCacheKey);

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
    <div className="pt-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Guides</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Manage guides and tutorials
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="grey"
            className='flex items-center gap-1'
            onClick={async () => {
              // Clear localStorage cache
              const cacheKey = 'guides_cache';
              const versionKey = 'guides_version';
              const allCacheKey = 'guides_cache_all';
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(versionKey);
              localStorage.removeItem(allCacheKey);
              
              // Fetch and cache all guides
              try {
                const allResponse = await fetch('/api/admin/guides?limit=10000');
                if (allResponse.ok) {
                  const allData = await allResponse.json();
                  const allGuides = allData.guides || [];
                  localStorage.setItem(allCacheKey, JSON.stringify(allGuides));
                }
              } catch (error) {
                console.warn('Failed to fetch all guides for cache', error);
              }
              
              // Trigger refetch
              fetchGuides();
            }}
            title="Refresh and clear cache"
          >
            Refresh
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
          <Button variant="green" onClick={() => router.push(`/${locale}/admin/guides/new`)}>
            Create Guide
          </Button>
        </div>
      </div>

      {/* Cache Version Control */}
      <Card className="bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Guides Cache Version
              </label>
              <NumberInput
                value={guidesVersion}
                onChange={(e) => setGuidesVersion(parseInt(e.target.value) || 1)}
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
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'archived', label: 'Archived' },
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
                    { value: 'viewsCount-desc', label: 'Most Views' },
                    { value: 'viewsCount-asc', label: 'Least Views' },
                    { value: 'rating-desc', label: 'Highest Rated' },
                    { value: 'rating-asc', label: 'Lowest Rated' },
                    { value: 'createdAt-desc', label: 'Newest First' },
                    { value: 'createdAt-asc', label: 'Oldest First' },
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
                {selectedItems.size} guide(s) selected
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
                  variant="grey" 
                  onClick={() => handleBulkAction('archive')}
                  disabled={!!bulkOperation}
                >
                  {bulkOperation === 'archive' ? 'Archiving...' : 'Archive'}
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

      {/* Guides Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                variant="brand"
                id="select-all"
                checked={selectedItems.size === guides.length && guides.length > 0}
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
            Sports
            </TableHead>
              <TableHead className="hidden md:table-cell">
              Tags
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Rating
            </TableHead>
            <TableHead className="hidden md:table-cell">
              Views
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
                {Array.from({ length: 10 }).map((_, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : guides.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                No guides found
              </TableCell>
            </TableRow>
          ) : (
            guides.map((guide) => (
              <TableRow key={guide.id}>
                <TableCell className="whitespace-nowrap px-4 md:px-6 md:py-3">
                  <Checkbox
                    variant="brand"
                    id={`select-${guide.id}`}
                    checked={selectedItems.has(guide.id)}
                    onChange={() => toggleSelection(guide.id)}
                    label=""
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-2 md:px-6 md:py-3 w-12 md:w-16">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
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
                </TableCell>
                <TableCell>
                  <div>
                    <button
                      onClick={() => router.push(`/${locale}/admin/guides/${guide.id}/edit`)}
                      className="text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                    >
                      {guide.title.en}
                    </button>
                    <div className="text-xs text-text-secondary dark:text-text-secondary-dark">{guide.title.he}</div>
                    {guide.isFeatured && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        Featured
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {guide.relatedSports.slice(0, 2).map((sport) => (
                      <span key={sport} className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                        {sport}
                      </span>
                    ))}
                    {guide.relatedSports.length > 2 && (
                      <span className="text-xs text-text-secondary dark:text-text-secondary-dark">+{guide.relatedSports.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-text-secondary dark:text-text-secondary-dark max-w-xs truncate">
                  {(() => {
                    const tags = getTagsForLocale(guide.tags, locale);
                    return tags.slice(0, 3).join(', ') + (tags.length > 3 ? '...' : '');
                  })()}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {renderStars(guide.rating)}
                    <span className="text-sm text-text-secondary dark:text-text-secondary-dark">
                      {guide.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                      ({guide.ratingCount})
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                  {guide.viewsCount.toLocaleString()}
                </TableCell>
                <TableCell className="hidden md:table-cell whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guide.status)}`}>
                    {guide.status}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  <Popover open={viewPopoverOpen === guide.id} onOpenChange={(open) => setViewPopoverOpen(open ? guide.id : null)}>
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
                          <h3 className="text-lg font-semibold text-text dark:text-text-dark">{guide.title.en}</h3>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">{guide.title.he}</p>
                        </div>

                        {/* Description */}
                        <div>
                          <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-3">{guide.description.en}</p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Views</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{guide.viewsCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Likes</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{guide.likesCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Rating</p>
                            <p className="text-sm font-medium text-text dark:text-text-dark">{guide.rating.toFixed(1)} ({guide.ratingCount})</p>
                          </div>
                        </div>

                        {/* Sports & Tags */}
                        <div className="space-y-2 pt-2 border-t border-border dark:border-border-dark">
                          <div>
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Sports</p>
                            <div className="flex flex-wrap gap-1">
                              {guide.relatedSports.slice(0, 3).map((sport) => (
                                <span key={sport} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                                  {sport}
                                </span>
                              ))}
                              {guide.relatedSports.length > 3 && (
                                <span className="text-xs text-text-secondary dark:text-text-secondary-dark">+{guide.relatedSports.length - 3}</span>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const tags = getTagsForLocale(guide.tags, locale);
                            return tags.length > 0 && (
                              <div>
                                <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Tags</p>
                                <div className="flex flex-wrap gap-1">
                                  {tags.slice(0, 5).map((tag) => (
                                    <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                  {tags.length > 5 && (
                                    <span className="text-xs text-text-secondary dark:text-text-secondary-dark">+{tags.length - 5}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Status Change */}
                        <div className="pt-2 border-t border-border dark:border-border-dark">
                          <label className="block text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewPopoverOpen(guide.id)}>
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/guides/${guide.id}/edit`)}>
                        Edit
                      </DropdownMenuItem>
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
            {pagination.totalCount} guides
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



