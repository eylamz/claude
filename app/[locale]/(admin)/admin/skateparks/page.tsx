'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button, Card, CardContent, SelectWrapper, Skeleton, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui';
import { SearchInput } from '@/components/common/SearchInput';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { NumberInput } from '@/components/ui/number-input';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Icon } from '@/components/icons';

// Custom Tooltip for amenities chart
const AmenitiesTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const parks = data.parks || [];
  const value = data.value || 0;
  const name = data.name || '';

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
      <div className="font-semibold text-gray-900 dark:text-white mb-2">{name}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {value} {value === 1 ? t('admin.statistics.amenities.park') : t('admin.statistics.amenities.parksPlural')}
      </div>
      {parks.length > 0 && (
        <div className="mt-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">{t('admin.statistics.amenities.parks')}:</div>
          <ul className="list-disc list-inside text-xs space-y-1 text-gray-600 dark:text-gray-400">
            {parks.slice(0, 20).map((park: string, idx: number) => (
              <li key={idx} className="truncate">{park}</li>
            ))}
            {parks.length > 20 && (
              <li className="text-gray-500 dark:text-gray-500 italic">
                {t('admin.statistics.amenities.andMore', { count: parks.length - 20 })}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip for opening years chart
const OpeningYearsTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const parks = data.parks || [];
  const count = data.count || 0;
  const year = data.year || '';

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
      <div className="font-semibold text-gray-900 dark:text-white mb-2">{t('admin.statistics.openingYears.year', { year })}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {count} {count === 1 ? t('admin.statistics.openingYears.park') : t('admin.statistics.openingYears.parks')}
      </div>
      {parks.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto">
          <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('admin.statistics.amenities.parks')}:</div>
          <ul className="list-disc list-inside text-xs space-y-0.5 text-gray-600 dark:text-gray-400">
            {parks.map((park: string, idx: number) => (
              <li key={idx}>{park}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip for areas chart
const AreasTooltip = ({ active, payload, t }: any) => {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const value = data.value || 0;
  const name = data.name || '';

  return (
    <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
      <div className="font-semibold text-gray-900 dark:text-white mb-1">{name}</div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {t('admin.statistics.areas.count', { count: value })}
      </div>
    </div>
  );
};

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
  openingMonth?: number;
  image?: string; // Main image URL from API
  images?: Array<{
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
  const t = useTranslations('skateparks');
  const [skateparks, setSkateparks] = useState<Skatepark[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Set<string>>(new Set()); // Track which parks are being deleted
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
  
  // Statistics modal
  const [showStatistics, setShowStatistics] = useState(false);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsData, setStatisticsData] = useState<{
    amenities: Record<string, { count: number; parks: string[] }>;
    openingYears: Array<{ year: number; count: number; parks: string[] }>;
    areas: { north: number; center: number; south: number };
    totalParks: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'amenities' | 'openingYears' | 'areas'>('amenities');
  
  // Cache version control
  const [skateparksVersion, setSkateparksVersion] = useState<number>(1);
  const [savingVersion, setSavingVersion] = useState(false);
  
  // Refresh and toast state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
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
          setSkateparksVersion(data.settings?.skateparksVersion || 1);
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
        body: JSON.stringify({ skateparksVersion }),
      });
      if (!response.ok) throw new Error('Failed to save version');
      alert('Version saved successfully!');
    } catch (error) {
      console.error('Error saving version:', error);
      alert('Failed to save version');
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
  }, [area, status, amenities, sortBy, sortOrder]);

  // Check version and update cache if needed (debounced)
  // Using ref to avoid circular dependency
  const fetchSkateparksRef = useRef<(() => Promise<void>) | null>(null);

  const fetchSkateparks = useCallback(async () => {
    // Prevent duplicate concurrent calls
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    const cacheKey = 'skateparks_cache';
    const versionKey = 'skateparks_version';
    const cachedData = localStorage.getItem(cacheKey);
    const cachedVersion = localStorage.getItem(versionKey);

    // If cache exists, use it and apply filters/pagination on client side
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        let filteredParks = [...parsedData];

        // Apply filters
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          filteredParks = filteredParks.filter((park: any) => {
            const nameEn = park.name?.en || '';
            const nameHe = park.name?.he || '';
            return nameEn.toLowerCase().includes(searchLower) || 
                   nameHe.toLowerCase().includes(searchLower);
          });
        }

        if (area) {
          filteredParks = filteredParks.filter((park: any) => park.area === area);
        }

        if (status) {
          filteredParks = filteredParks.filter((park: any) => park.status === status);
        }

        if (amenities) {
          filteredParks = filteredParks.filter((park: any) => 
            park.amenities?.[amenities] === true
          );
        }

        // Apply sorting
        filteredParks.sort((a: any, b: any) => {
          let aValue: any;
          let bValue: any;

          switch (sortBy) {
            case 'name':
              aValue = a.name?.en || '';
              bValue = b.name?.en || '';
              return sortOrder === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            case 'area':
              aValue = a.area || '';
              bValue = b.area || '';
              return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            case 'status':
              aValue = a.status || '';
              bValue = b.status || '';
              return sortOrder === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
            case 'createdAt':
            default:
              aValue = new Date(a.createdAt || 0).getTime();
              bValue = new Date(b.createdAt || 0).getTime();
              return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          }
        });

        // Apply pagination
        const totalCount = filteredParks.length;
        const totalPages = Math.ceil(totalCount / pagination.limit);
        const startIndex = (pagination.currentPage - 1) * pagination.limit;
        const paginatedParks = filteredParks.slice(startIndex, startIndex + pagination.limit);

        setSkateparks(paginatedParks);
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
              const versionResponse = await fetch('/api/skateparks?versionOnly=true');
              if (versionResponse.ok) {
                const versionData = await versionResponse.json();
                const currentVersion = versionData.version || 1;
                const storedVersion = cachedVersion ? parseInt(cachedVersion) : 0;

                // If versions don't match, update cache
                if (storedVersion !== currentVersion) {
                  const publicResponse = await fetch('/api/skateparks');
                  if (publicResponse.ok) {
                    const publicData = await publicResponse.json();
                    const newVersion = publicData.version || 1;
                    
                    localStorage.setItem(cacheKey, JSON.stringify(publicData.skateparks || []));
                    localStorage.setItem(versionKey, newVersion.toString());
                    
                    // Also fetch and cache inactive parks
                    try {
                      const inactiveResponse = await fetch('/api/admin/skateparks?all=true&limit=10000&status=inactive');
                      if (inactiveResponse.ok) {
                        const inactiveData = await inactiveResponse.json();
                        const inactiveParks = inactiveData.skateparks || [];
                        localStorage.setItem('skateparks_cache_inactive', JSON.stringify(inactiveParks));
                      }
                    } catch (e) {
                      console.warn('Failed to fetch inactive parks during version check', e);
                    }
                    
                    // Only trigger refetch if we're not already fetching
                    if (!isFetchingRef.current && fetchSkateparksRef.current) {
                      setTimeout(() => {
                        fetchSkateparksRef.current?.();
                      }, 100);
                    }
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
        console.warn('Failed to parse cached skateparks data', e);
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

      // Update cache in background (non-blocking)
      try {
        const publicResponse = await fetch('/api/skateparks');
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          const currentVersion = publicData.version || 1;
          
          localStorage.setItem(cacheKey, JSON.stringify(publicData.skateparks || []));
          localStorage.setItem(versionKey, currentVersion.toString());
        }
        
        // Also fetch and cache inactive parks
        const inactiveResponse = await fetch('/api/admin/skateparks?all=true&limit=10000&status=inactive');
        if (inactiveResponse.ok) {
          const inactiveData = await inactiveResponse.json();
          const inactiveParks = inactiveData.skateparks || [];
          localStorage.setItem('skateparks_cache_inactive', JSON.stringify(inactiveParks));
        }
      } catch (e) {
        console.warn('Failed to update cache', e);
      }
    } catch (error) {
      console.error('Error fetching skateparks:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [pagination.currentPage, pagination.limit, debouncedSearch, area, status, amenities, sortBy, sortOrder]);

  // Store fetchSkateparks in ref for version check callback
  useEffect(() => {
    fetchSkateparksRef.current = fetchSkateparks;
  }, [fetchSkateparks]);

  useEffect(() => {
    fetchSkateparks();
  }, [fetchSkateparks]);

  // Calculate statistics from parks data
  const calculateStatistics = useCallback((allParks: any[]) => {
    // Calculate amenities statistics with park names
    const amenitiesStats: Record<string, { count: number; parks: string[] }> = {
      paidEntry: { count: 0, parks: [] },
      bikesAllowed: { count: 0, parks: [] },
      parking: { count: 0, parks: [] },
      shade: { count: 0, parks: [] },
      bathroom: { count: 0, parks: [] },
      helmetRequired: { count: 0, parks: [] },
      guard: { count: 0, parks: [] },
      seating: { count: 0, parks: [] },
      bombShelter: { count: 0, parks: [] },
      scootersAllowed: { count: 0, parks: [] },
      noWax: { count: 0, parks: [] },
      nearbyRestaurants: { count: 0, parks: [] },
    };

    // Calculate opening years distribution with park names
    const openingYearsMap: Record<number, { count: number; parks: string[] }> = {};

    // Calculate area distribution
    const areaStats = {
      north: 0,
      center: 0,
      south: 0,
    };

    allParks.forEach((skatepark: any) => {
      // Amenities with park names
      if (skatepark.amenities) {
        const parkName = skatepark.name?.en || skatepark.name?.he || 'Unknown';
        
        if (skatepark.amenities.entryFee === true) {
          amenitiesStats.paidEntry.count++;
          amenitiesStats.paidEntry.parks.push(parkName);
        }
        if (skatepark.amenities.bikesAllowed === true) {
          amenitiesStats.bikesAllowed.count++;
          amenitiesStats.bikesAllowed.parks.push(parkName);
        }
        if (skatepark.amenities.parking === true) {
          amenitiesStats.parking.count++;
          amenitiesStats.parking.parks.push(parkName);
        }
        if (skatepark.amenities.shade === true) {
          amenitiesStats.shade.count++;
          amenitiesStats.shade.parks.push(parkName);
        }
        if (skatepark.amenities.bathroom === true) {
          amenitiesStats.bathroom.count++;
          amenitiesStats.bathroom.parks.push(parkName);
        }
        if (skatepark.amenities.helmetRequired === true) {
          amenitiesStats.helmetRequired.count++;
          amenitiesStats.helmetRequired.parks.push(parkName);
        }
        if (skatepark.amenities.guard === true) {
          amenitiesStats.guard.count++;
          amenitiesStats.guard.parks.push(parkName);
        }
        if (skatepark.amenities.seating === true) {
          amenitiesStats.seating.count++;
          amenitiesStats.seating.parks.push(parkName);
        }
        if (skatepark.amenities.bombShelter === true) {
          amenitiesStats.bombShelter.count++;
          amenitiesStats.bombShelter.parks.push(parkName);
        }
        if (skatepark.amenities.scootersAllowed === true) {
          amenitiesStats.scootersAllowed.count++;
          amenitiesStats.scootersAllowed.parks.push(parkName);
        }
        if (skatepark.amenities.noWax === true) {
          amenitiesStats.noWax.count++;
          amenitiesStats.noWax.parks.push(parkName);
        }
        if (skatepark.amenities.nearbyRestaurants === true) {
          amenitiesStats.nearbyRestaurants.count++;
          amenitiesStats.nearbyRestaurants.parks.push(parkName);
        }
      }

      // Opening years with park names
      if (skatepark.openingYear) {
        const year = skatepark.openingYear;
        if (!openingYearsMap[year]) {
          openingYearsMap[year] = { count: 0, parks: [] };
        }
        openingYearsMap[year].count++;
        const parkName = skatepark.name?.en || skatepark.name?.he || 'Unknown';
        openingYearsMap[year].parks.push(parkName);
      }

      // Area distribution
      if (skatepark.area) {
        if (skatepark.area === 'north') {
          areaStats.north++;
        } else if (skatepark.area === 'center') {
          areaStats.center++;
        } else if (skatepark.area === 'south') {
          areaStats.south++;
        }
      }
    });

    // Generate all years from 2005 to current year
    const currentYear = new Date().getFullYear();
    const openingYears = [];
    for (let year = 2005; year <= currentYear; year++) {
      const yearData = openingYearsMap[year];
      openingYears.push({
        year,
        count: yearData ? yearData.count : 0,
        parks: yearData ? yearData.parks : [],
      });
    }

    return {
      amenities: amenitiesStats,
      openingYears,
      areas: areaStats,
      totalParks: allParks.length,
    };
  }, []);

  const fetchStatistics = useCallback(async () => {
    try {
      setStatisticsLoading(true);
      const cacheKey = 'skateparks_cache';
      let parksToUse: any[] = [];

      // First, try to use the already loaded skateparks data from the main list
      // Get all parks from cache (which should already be loaded)
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          parksToUse = parsedData || [];
        } catch (e) {
          console.warn('Failed to parse cached data for statistics', e);
        }
      }

      // If we have parks data, use it immediately without any API calls
      if (parksToUse.length > 0) {
        const stats = calculateStatistics(parksToUse);
        setStatisticsData(stats);
        setStatisticsLoading(false);
        return; // Exit early - no API calls needed
      }

      // Only fetch from API if we have no data at all (shouldn't happen in normal flow)
      // This is a fallback only
      const response = await fetch('/api/admin/skateparks?all=true&limit=10000');
      if (!response.ok) throw new Error('Failed to fetch parks');
      const data = await response.json();
      parksToUse = data.skateparks || [];

      // Calculate statistics from the parks data
      const stats = calculateStatistics(parksToUse);
      setStatisticsData(stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  }, [calculateStatistics]);

  useEffect(() => {
    if (showStatistics && !statisticsData) {
      fetchStatistics();
    }
  }, [showStatistics, statisticsData, fetchStatistics]);

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

  const handleDelete = async (id: string, parkName: string) => {
    if (!confirm(t('admin.table.deleteConfirm', { name: parkName }))) {
      return;
    }

    setDeleting(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/admin/skateparks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete skatepark');
      }

      // Clear cache to force refresh
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);

      // Refresh the list
      await fetchSkateparks();
    } catch (error: any) {
      console.error('Error deleting skatepark:', error);
      alert(error.message || 'Failed to delete skatepark');
    } finally {
      setDeleting(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const count = selectedItems.size;
    const confirmMessage = t('admin.deleteSelectedConfirm', { count }) || `Are you sure you want to delete ${count} selected skatepark(s)?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    const idsToDelete = Array.from(selectedItems);
    setDeleting(new Set(idsToDelete));

    try {
      // Delete all parks in parallel
      const deletePromises = idsToDelete.map(id => 
        fetch(`/api/admin/skateparks/${id}`, {
          method: 'DELETE',
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to delete skatepark ${id}`);
          }
          return id;
        })
      );

      await Promise.all(deletePromises);

      // Clear cache to force refresh
      const cacheKey = 'skateparks_cache';
      const versionKey = 'skateparks_version';
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(versionKey);

      // Clear selection
      setSelectedItems(new Set());

      // Refresh the list
      await fetchSkateparks();
    } catch (error: any) {
      console.error('Error deleting skateparks:', error);
      alert(error.message || 'Failed to delete some skateparks');
    } finally {
      setDeleting(new Set());
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


  const formatAddress = (address: { en: string; he: string }) => {
    return address.en || address.he || '';
  };

  const formatOpeningYear = (year?: number, month?: number): string => {
    if (!year) return '—';
    if (!month) return year.toString();
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return `${year} (${monthNames[month - 1]})`;
  };

  return (
    <div className="pt-16 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border-2 min-w-[300px] animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600'
              : 'bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <p
            className={`text-sm font-medium ${
              toast.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}
          >
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('admin.subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            onClick={async () => {
              setIsRefreshing(true);
              // Clear localStorage cache
              const cacheKey = 'skateparks_cache';
              const versionKey = 'skateparks_version';
              const inactiveCacheKey = 'skateparks_cache_inactive';
              localStorage.removeItem(cacheKey);
              localStorage.removeItem(versionKey);
              localStorage.removeItem(inactiveCacheKey);
              
              // Fetch and cache inactive parks
              try {
                const inactiveResponse = await fetch('/api/admin/skateparks?all=true&limit=10000&status=inactive');
                if (inactiveResponse.ok) {
                  const inactiveData = await inactiveResponse.json();
                  const inactiveParks = inactiveData.skateparks || [];
                  localStorage.setItem(inactiveCacheKey, JSON.stringify(inactiveParks));
                }
              } catch (error) {
                console.warn('Failed to fetch inactive parks for cache', error);
              }
              
              // Trigger refetch
              await fetchSkateparks();
              
              setIsRefreshing(false);
              setToast({ message: 'Data has been refreshed successfully!', type: 'success' });
              setTimeout(() => setToast(null), 3000);
            }}
            title="Refresh and clear cache"
            disabled={isRefreshing}
          >
            <svg 
              className={`w-4 h-4 mr-2 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('admin.refresh') || 'Refresh'}
          </Button>
          <Button
            variant="purple"
            onClick={() => {
              setShowStatistics(true);
            }}
          >
            {t('admin.viewStatistics')}
          </Button>
          <Button variant="brand" onClick={() => router.push(`/${locale}/admin/skateparks/new`)}>
            {t('admin.addSkatepark')}
          </Button>
        </div>
      </div>

      {/* Cache Version Control */}
      <Card className="bg-card dark:bg-card-dark">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skateparks Cache Version
              </label>
              <NumberInput
                value={skateparksVersion}
                onChange={(e) => setSkateparksVersion(parseInt(e.target.value) || 1)}
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
                placeholder={t('admin.searchPlaceholder')}
                className="!max-w-full"
              />
            </div>
            <div className="flex gap-2">
            <div className="">
              <SelectWrapper
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: '', label: t('admin.allStatuses') },
                  { value: 'active', label: t('admin.status.active') },
                  { value: 'inactive', label: t('admin.status.inactive') },
                ]}
              />
            </div>
            <div className="">
              <SelectWrapper
                value={area}
                onChange={(e) => setArea(e.target.value)}
                options={[
                  { value: '', label: t('admin.allAreas') },
                  { value: 'north', label: t('search.area.north') },
                  { value: 'center', label: t('search.area.center') },
                  { value: 'south', label: t('search.area.south') },
                ]}
              />
            </div>

            <div className="">
              <SelectWrapper
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
                options={[
                  { value: '', label: t('admin.allAmenities') },
                  { value: 'parking', label: t('amenities.parking') },
                  { value: 'bathroom', label: t('amenities.bathroom') },
                  { value: 'shade', label: t('amenities.shade') },
                  { value: 'guard', label: t('amenities.guard') },
                  { value: 'seating', label: t('amenities.seating') },
                  { value: 'bombShelter', label: t('amenities.bombShelter') },
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
          <CardContent className="p-4 ">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('admin.selected', { count: selectedItems.size })}
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="secondary" onClick={() => handleBulkStatusUpdate('active')}>
                  {t('admin.setActive')}
                </Button>
                <Button variant="secondary" onClick={() => handleBulkStatusUpdate('inactive')}>
                  {t('admin.setInactive')}
                </Button>
                <Button variant="secondary" onClick={() => console.log('Export to CSV')}>
                  {t('admin.exportToCSV')}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleBulkDelete}
                  disabled={deleting.size > 0}
                >
                  {deleting.size > 0 
                    ? `Deleting ${deleting.size}...` 
                    : t('admin.deleteSelected')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skateparks Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Checkbox
                variant="brand"
                id="select-all"
                checked={selectedItems.size === skateparks.length && skateparks.length > 0}
                onChange={() => toggleSelectAll()}
                label=""
              />
            </TableHead>
            <TableHead>
              {t('admin.table.image')}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t('admin.table.name')}
            </TableHead>
            <TableHead>
              {t('admin.table.slug')}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t('admin.table.address')}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t('admin.table.openingYear')}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t('admin.table.featured')}
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t('admin.table.status')}
            </TableHead>
            <TableHead>
              {t('admin.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TableCell key={j} className="whitespace-nowrap">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : skateparks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                {t('admin.table.noSkateparksFound')}
              </TableCell>
            </TableRow>
          ) : (
            skateparks.map((skatepark) => {
              const skateparkId = skatepark._id || skatepark.id || '';
              const isDeleting = deleting.has(skateparkId);
              return (
                <TableRow 
                  key={skateparkId} 
                  className={isDeleting ? 'opacity-50' : ''}
                >
                  <TableCell className="whitespace-nowrap px-4 md:px-6 md:py-3">
                    {!isDeleting ? (
                      <Checkbox
                        variant="brand"
                        id={`select-${skateparkId}`}
                        checked={selectedItems.has(skateparkId)}
                        onChange={() => toggleSelection(skateparkId)}
                        label=""
                      />
                    ) : (
                      <Checkbox
                        variant="brand"
                        id={`select-${skateparkId}-disabled`}
                        checked={selectedItems.has(skateparkId)}
                        onChange={() => {}}
                        label=""
                      />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-2 md:px-6 md:py-3 w-12 md:w-16">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                      {(() => {
                        const imageUrl = skatepark.image || skatepark.images?.[0]?.url;
                        if (imageUrl) {
                          return (
                            <img
                              src={imageUrl}
                              alt={skatepark.name.en}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Prevent infinite loop by hiding the image on error
                                const img = e.target as HTMLImageElement;
                                if (!img.dataset.errorHandled) {
                                  img.dataset.errorHandled = 'true';
                                  img.style.display = 'none';
                                }
                              }}
                            />
                          );
                        }
                        return (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>
                      <button
                        onClick={() => router.push(`/${locale}/admin/skateparks/${skateparkId}`)}
                        className="text-sm font-medium text-brand-main dark:text-brand-dark hover:underline"
                      >
                        {skatepark.name.en}
                      </button>
                      <div className="text-xs text-text-secondary dark:text-text-secondary-dark">{skatepark.name.he}</div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                    {skatepark.slug}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-text-secondary dark:text-text-secondary-dark max-w-xs truncate">
                    {formatAddress(skatepark.address)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap text-sm text-text-secondary dark:text-text-secondary-dark">
                    {formatOpeningYear(skatepark.openingYear, skatepark.openingMonth)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">
                    {skatepark.isFeatured ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        {t('admin.table.featured')}
                      </span>
                    ) : (
                      <span className="text-text-secondary dark:text-text-secondary-dark">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(skatepark.status)}`}>
                      {t(`admin.status.${skatepark.status}`)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => window.open(`/${locale}/skateparks/${skatepark.slug}`, '_blank')}>
                          {t('admin.table.view') || 'View'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/${locale}/admin/skateparks/${skateparkId}`)}>
                          {t('admin.table.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(skateparkId, skatepark.name.en)}
                          disabled={deleting.has(skateparkId)}
                        >
                          {deleting.has(skateparkId) ? 'Deleting...' : t('admin.table.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('admin.table.showing', {
              from: (pagination.currentPage - 1) * pagination.limit + 1,
              to: Math.min(pagination.currentPage * pagination.limit, pagination.totalCount),
              total: pagination.totalCount
            })}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
              disabled={pagination.currentPage === 1}
            >
              {t('admin.table.previous')}
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
              {t('admin.table.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatistics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
          <div className="bg-background dark:bg-background-dark rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border dark:border-border-dark">
              <h2 className="text-2xl font-bold text-text dark:text-text-dark">{t('admin.statistics.title')}</h2>
              <button
                onClick={() => setShowStatistics(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('amenities')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'amenities'
                  ? 'text-header-text dark:text-header-text-dark border-b-2 border-header-text dark:border-header-text-dark'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark'
                }`}
              >
                {t('admin.statistics.tabs.amenities')}
              </button>
              <button
                onClick={() => setActiveTab('openingYears')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'openingYears'
                    ? 'text-header-text dark:text-header-text-dark border-b-2 border-header-text dark:border-header-text-dark'
                    : 'text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark'
                }`}
              >
                {t('admin.statistics.tabs.openingYears')}
              </button>
              <button
                onClick={() => setActiveTab('areas')}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === 'areas'
                  ? 'text-header-text dark:text-header-text-dark border-b-2 border-header-text dark:border-header-text-dark'
                  : 'text-text-secondary dark:text-text-secondary-dark hover:text-text dark:hover:text-text-dark'
                }`}
              >
                {t('admin.statistics.tabs.areas')}
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {statisticsLoading ? (
                <div className="flex items-center justify-center h-96">
                  <Skeleton className="h-64 w-full" />
                </div>
              ) : statisticsData ? (
                <>
                  {/* Amenities Chart */}
                  {activeTab === 'amenities' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-text dark:text-text-dark">
                        {t('admin.statistics.amenities.title')}
                      </h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={[
                          { key: 'paidEntry', name: t('admin.statistics.amenities.paidEntry'), icon: 'shekel', value: statisticsData.amenities.paidEntry?.count || 0, parks: statisticsData.amenities.paidEntry?.parks || [] },
                          { key: 'bikesAllowed', name: t('admin.statistics.amenities.bikesAllowed'), icon: 'bmx-icon', value: statisticsData.amenities.bikesAllowed?.count || 0, parks: statisticsData.amenities.bikesAllowed?.parks || [] },
                          { key: 'parking', name: t('admin.statistics.amenities.parking'), icon: 'parking', value: statisticsData.amenities.parking?.count || 0, parks: statisticsData.amenities.parking?.parks || [] },
                          { key: 'shade', name: t('admin.statistics.amenities.shade'), icon: 'umbrella', value: statisticsData.amenities.shade?.count || 0, parks: statisticsData.amenities.shade?.parks || [] },
                          { key: 'bathroom', name: t('admin.statistics.amenities.bathroom'), icon: 'toilet', value: statisticsData.amenities.bathroom?.count || 0, parks: statisticsData.amenities.bathroom?.parks || [] },
                          { key: 'helmetRequired', name: t('admin.statistics.amenities.helmetRequired'), icon: 'helmet', value: statisticsData.amenities.helmetRequired?.count || 0, parks: statisticsData.amenities.helmetRequired?.parks || [] },
                          { key: 'guard', name: t('admin.statistics.amenities.guard'), icon: 'securityGuard', value: statisticsData.amenities.guard?.count || 0, parks: statisticsData.amenities.guard?.parks || [] },
                          { key: 'seating', name: t('admin.statistics.amenities.seating'), icon: 'couch', value: statisticsData.amenities.seating?.count || 0, parks: statisticsData.amenities.seating?.parks || [] },
                          { key: 'bombShelter', name: t('admin.statistics.amenities.bombShelter'), icon: 'safe-house', value: statisticsData.amenities.bombShelter?.count || 0, parks: statisticsData.amenities.bombShelter?.parks || [] },
                          { key: 'scootersAllowed', name: t('admin.statistics.amenities.scootersAllowed'), icon: 'scooter', value: statisticsData.amenities.scootersAllowed?.count || 0, parks: statisticsData.amenities.scootersAllowed?.parks || [] },
                          { key: 'noWax', name: t('admin.statistics.amenities.noWax'), icon: 'Wax', value: statisticsData.amenities.noWax?.count || 0, parks: statisticsData.amenities.noWax?.parks || [] },
                          { key: 'nearbyRestaurants', name: t('admin.statistics.amenities.nearbyRestaurants'), icon: 'nearbyResturants', value: statisticsData.amenities.nearbyRestaurants?.count || 0, parks: statisticsData.amenities.nearbyRestaurants?.parks || [] },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#006f4e" className="dark:stroke-gray-700" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45}
                            textAnchor={locale === 'he' ? 'start' : 'end'}
                            height={120}
                            tick={{ fontSize: 12, fill: 'currentColor' }}
                            className="text-header-text dark:text-header-text-dark"
                            tickFormatter={(value, index) => {
                              const data = [
                                { key: 'paidEntry', name: t('admin.statistics.amenities.paidEntry'), icon: 'shekel' },
                                { key: 'bikesAllowed', name: t('admin.statistics.amenities.bikesAllowed'), icon: 'bmx-icon' },
                                { key: 'parking', name: t('admin.statistics.amenities.parking'), icon: 'parking' },
                                { key: 'shade', name: t('admin.statistics.amenities.shade'), icon: 'umbrella' },
                                { key: 'bathroom', name: t('admin.statistics.amenities.bathroom'), icon: 'toilet' },
                                { key: 'helmetRequired', name: t('admin.statistics.amenities.helmetRequired'), icon: 'helmet' },
                                { key: 'guard', name: t('admin.statistics.amenities.guard'), icon: 'securityGuard' },
                                { key: 'seating', name: t('admin.statistics.amenities.seating'), icon: 'couch' },
                                { key: 'bombShelter', name: t('admin.statistics.amenities.bombShelter'), icon: 'safe-house' },
                                { key: 'scootersAllowed', name: t('admin.statistics.amenities.scootersAllowed'), icon: 'scooter' },
                                { key: 'noWax', name: t('admin.statistics.amenities.noWax'), icon: 'Wax' },
                                { key: 'nearbyRestaurants', name: t('admin.statistics.amenities.nearbyRestaurants'), icon: 'nearbyResturants' },
                              ];
                              return data[index]?.name || value;
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: 'currentColor' }}
                            className="text-text-secondary dark:text-text-secondary-dark"
                          />
                          <Tooltip content={<AmenitiesTooltip t={t} />} />
                          <Bar dataKey="value" fill="#006f4e" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
                        {[
                          { key: 'paidEntry', name: t('admin.statistics.amenities.paidEntry'), icon: 'shekel' as const, value: statisticsData.amenities.paidEntry?.count || 0 },
                          { key: 'bikesAllowed', name: t('admin.statistics.amenities.bikesAllowed'), icon: 'bmx-icon' as const, value: statisticsData.amenities.bikesAllowed?.count || 0 },
                          { key: 'parking', name: t('admin.statistics.amenities.parking'), icon: 'parking' as const, value: statisticsData.amenities.parking?.count || 0 },
                          { key: 'shade', name: t('admin.statistics.amenities.shade'), icon: 'umbrella' as const, value: statisticsData.amenities.shade?.count || 0 },
                          { key: 'bathroom', name: t('admin.statistics.amenities.bathroom'), icon: 'toilet' as const, value: statisticsData.amenities.bathroom?.count || 0 },
                          { key: 'helmetRequired', name: t('admin.statistics.amenities.helmetRequired'), icon: 'helmet' as const, value: statisticsData.amenities.helmetRequired?.count || 0 },
                          { key: 'guard', name: t('admin.statistics.amenities.guard'), icon: 'securityGuard' as const, value: statisticsData.amenities.guard?.count || 0 },
                          { key: 'seating', name: t('admin.statistics.amenities.seating'), icon: 'couch' as const, value: statisticsData.amenities.seating?.count || 0 },
                          { key: 'bombShelter', name: t('admin.statistics.amenities.bombShelter'), icon: 'safe-house' as const, value: statisticsData.amenities.bombShelter?.count || 0 },
                          { key: 'scootersAllowed', name: t('admin.statistics.amenities.scootersAllowed'), icon: 'scooter' as const, value: statisticsData.amenities.scootersAllowed?.count || 0 },
                          { key: 'noWax', name: t('admin.statistics.amenities.noWax'), icon: 'Wax' as const, value: statisticsData.amenities.noWax?.count || 0 },
                          { key: 'nearbyRestaurants', name: t('admin.statistics.amenities.nearbyRestaurants'), icon: 'nearbyResturants' as const, value: statisticsData.amenities.nearbyRestaurants?.count || 0 },
                        ].map((amenity) => (
                          <div key={amenity.key} className="flex flex-col items-center p-3 bg-white/50 dark:bg-black/0 rounded-lg">
                            <Icon name={amenity.icon} className="w-6 h-6 text-[#006f4e]/80 dark:text-header-text-dark mb-2" />
                            <div className="text-lg font-bold text-[#006f4e]/60 dark:text-text-dark">{amenity.value}</div>
                            <div className="text-xs text-text-secondary dark:text-text-secondary-dark text-center mt-1">{amenity.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Opening Years Chart */}
                  {activeTab === 'openingYears' && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-text dark:text-text-dark">
                        {t('admin.statistics.openingYears.title')}
                      </h3>
                      {statisticsData.openingYears.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={statisticsData.openingYears}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
                            <XAxis 
                              dataKey="year" 
                              tick={{ fontSize: 12, fill: 'currentColor' }}
                              className="text-text-secondary dark:text-text-dark"
                              tickFormatter={(value) => {
                                const date = new Date(value, 0, 1);
                                return `${date.getFullYear()}`;
                              }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: 'currentColor' }}
                              className="text-text-secondary dark:text-text-secondary-dark"
                            />
                            <Tooltip content={<OpeningYearsTooltip t={t} />} />
                            <Line 
                              type="monotone" 
                              dataKey="count" 
                              stroke="#10B981" 
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-96 text-text-secondary dark:text-text-secondary-dark">
                          {t('admin.statistics.openingYears.noData')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Areas Chart */}
                  {activeTab === 'areas' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-text dark:text-text-dark">
                          {t('admin.statistics.areas.title')}
                        </h3>
                        <div className="text-sm text-text-secondary dark:text-text-secondary-dark">
                          {t('admin.statistics.areas.totalParks')}: <span className="font-bold text-text dark:text-text-dark">{statisticsData.totalParks}</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: t('admin.statistics.areas.north'), value: statisticsData.areas.north },
                              { name: t('admin.statistics.areas.center'), value: statisticsData.areas.center },
                              { name: t('admin.statistics.areas.south'), value: statisticsData.areas.south },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'North', value: statisticsData.areas.north },
                              { name: 'Center', value: statisticsData.areas.center },
                              { name: 'South', value: statisticsData.areas.south },
                            ].map((_, index) => {
                              const colors = ['#4CAF50', '#9C27B0', '#FF9800'];
                              return <Cell key={`cell-${index}`} fill={colors[index]} />;
                            })}
                          </Pie>
                          <Tooltip content={<AreasTooltip t={t} />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-[#9c27b0]/5 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-[#9c27b0] dark:text-blue-400">
                            {statisticsData.areas.north}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.statistics.areas.north')}</div>
                        </div>
                        <div className="text-center p-4 bg-[#4caf50]/5 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-[#4caf50] dark:text-green-400">
                            {statisticsData.areas.center}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.statistics.areas.center')}</div>
                        </div>
                        <div className="text-center p-4 bg-[#ff9800]/5 dark:bg-amber-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-[#ff9800] dark:text-amber-400">
                            {statisticsData.areas.south}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{t('admin.statistics.areas.south')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
                  Failed to load statistics
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


