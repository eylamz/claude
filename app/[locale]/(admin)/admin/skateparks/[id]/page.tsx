'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Skeleton } from '@/components/ui';

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
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: Array<{
    url: string;
    isFeatured: boolean;
    orderNumber: number;
  }>;
  operatingHours: {
    sunday: { openingTime: string; closingTime: string; isOpen: boolean };
    monday: { openingTime: string; closingTime: string; isOpen: boolean };
    tuesday: { openingTime: string; closingTime: string; isOpen: boolean };
    wednesday: { openingTime: string; closingTime: string; isOpen: boolean };
    thursday: { openingTime: string; closingTime: string; isOpen: boolean };
    friday: { openingTime: string; closingTime: string; isOpen: boolean };
    saturday: { openingTime: string; closingTime: string; isOpen: boolean };
    holidays: { openingTime: string; closingTime: string; isOpen: boolean };
  };
  lightingHours?: {
    endTime: string;
    is24Hours: boolean;
  };
  amenities: {
    entryFee: boolean;
    parking: boolean;
    shade: boolean;
    bathroom: boolean;
    helmetRequired: boolean;
    guard: boolean;
    seating: boolean;
    bombShelter: boolean;
    scootersAllowed: boolean;
    bikesAllowed: boolean;
    noWax: boolean;
    nearbyRestaurants: boolean;
  };
  openingYear?: number;
  closingYear?: number;
  notes: {
    en?: string[];
    he?: string[];
  };
  isFeatured: boolean;
  status: 'active' | 'inactive';
  mediaLinks: {
    youtube?: string;
    googleMapsFrame?: string;
  };
  rating: number;
  totalReviews: number;
}

export default function SkateparkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const id = params.id as string;

  const [skatepark, setSkatepark] = useState<Skatepark | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);

  const fetchSkatepark = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check localStorage for cached data first
      const cacheKey = 'skateparks_cache';
      const cachedData = localStorage.getItem(cacheKey);
      
      let skateparkData: any = null;
      
      // Try to find skatepark in cache
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          // Find the skatepark by id (could be _id or id field)
          skateparkData = parsedData.find((park: any) => 
            park._id === id || park.id === id
          );
          
          if (skateparkData) {
            // Convert cached data format to admin format
            // Cached data has location as { lat, lng }, convert to coordinates array
            if (skateparkData.location) {
              if (skateparkData.location.lat !== undefined && skateparkData.location.lng !== undefined) {
                skateparkData.location = {
                  type: 'Point',
                  coordinates: [skateparkData.location.lng, skateparkData.location.lat] as [number, number],
                };
              } else if (!skateparkData.location.coordinates || !Array.isArray(skateparkData.location.coordinates)) {
                skateparkData.location = {
                  type: 'Point',
                  coordinates: [0, 0] as [number, number],
                };
              }
            } else {
              skateparkData.location = {
                type: 'Point',
                coordinates: [0, 0] as [number, number],
              };
            }
            
            // Ensure all images have orderNumber
            if (skateparkData.images && Array.isArray(skateparkData.images)) {
              skateparkData.images = skateparkData.images.map((img: any, index: number) => ({
                url: img.url || '',
                isFeatured: img.isFeatured || false,
                orderNumber: img.orderNumber ?? img.order ?? index,
              }));
            }
            
            // Convert lightingHours format if needed
            if (!skateparkData.lightingHours) {
              if (skateparkData.is24Hours !== undefined) {
                skateparkData.lightingHours = {
                  is24Hours: skateparkData.is24Hours || false,
                  endTime: skateparkData.lightingUntil || '',
                };
              }
            }
            
            // Set default values for admin-specific fields if missing
            if (!skateparkData.status) {
              skateparkData.status = 'active';
            }
            if (!skateparkData.operatingHours) {
              skateparkData.operatingHours = {
                sunday: { openingTime: '', closingTime: '', isOpen: false },
                monday: { openingTime: '', closingTime: '', isOpen: false },
                tuesday: { openingTime: '', closingTime: '', isOpen: false },
                wednesday: { openingTime: '', closingTime: '', isOpen: false },
                thursday: { openingTime: '', closingTime: '', isOpen: false },
                friday: { openingTime: '', closingTime: '', isOpen: false },
                saturday: { openingTime: '', closingTime: '', isOpen: false },
                holidays: { openingTime: '', closingTime: '', isOpen: false },
              };
            }
            if (!skateparkData.amenities) {
              skateparkData.amenities = {
                entryFee: false,
                parking: false,
                shade: false,
                bathroom: false,
                helmetRequired: false,
                guard: false,
                seating: false,
                bombShelter: false,
                scootersAllowed: false,
                bikesAllowed: false,
                noWax: false,
                nearbyRestaurants: false,
              };
            }
            if (!skateparkData.notes) {
              skateparkData.notes = { en: [], he: [] };
            }
            if (!skateparkData.mediaLinks) {
              skateparkData.mediaLinks = { youtube: '', googleMapsFrame: '' };
            }
            
            setSkatepark(skateparkData);
            setLoading(false);
            return; // Exit early since we used cache
          }
        } catch (e) {
          console.warn('Failed to parse cached data or find skatepark in cache', e);
          // Continue to fetch from API
        }
      }
      
      // If not found in cache, fetch from API
      const response = await fetch(`/api/admin/skateparks/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Skatepark not found');
        } else {
          setError('Failed to fetch skatepark');
        }
        return;
      }
      const data = await response.json();
      // Ensure location and coordinates are initialized
      skateparkData = data.skatepark;
      
      // Convert location format from { lat, lng } to { type: 'Point', coordinates: [lng, lat] }
      if (skateparkData.location) {
        if (skateparkData.location.lat !== undefined && skateparkData.location.lng !== undefined) {
          // API returns { lat, lng }, convert to coordinates array
          skateparkData.location = {
            type: 'Point',
            coordinates: [skateparkData.location.lng, skateparkData.location.lat] as [number, number],
          };
        } else if (!skateparkData.location.coordinates || !Array.isArray(skateparkData.location.coordinates)) {
          skateparkData.location = {
            type: 'Point',
            coordinates: [0, 0] as [number, number],
          };
        }
      } else {
        skateparkData.location = {
          type: 'Point',
          coordinates: [0, 0] as [number, number],
        };
      }
      
      // Ensure all images have orderNumber
      if (skateparkData.images && Array.isArray(skateparkData.images)) {
        skateparkData.images = skateparkData.images.map((img: any, index: number) => ({
          url: img.url || '',
          isFeatured: img.isFeatured || false,
          orderNumber: img.orderNumber ?? img.order ?? index,
        }));
      }
      
      // Convert lightingHours format if needed
      if (!skateparkData.lightingHours && (skateparkData.is24Hours !== undefined || skateparkData.lightingUntil)) {
        skateparkData.lightingHours = {
          is24Hours: skateparkData.is24Hours || false,
          endTime: skateparkData.lightingUntil || '',
        };
      }
      
      setSkatepark(skateparkData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch skatepark');
      console.error('Error fetching skatepark:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSkatepark();
  }, [fetchSkatepark]);

  const handleSave = async () => {
    if (!skatepark) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Ensure all images have orderNumber before saving
      // Ensure location coordinates are properly formatted
      const skateparkToSave = {
        ...skatepark,
        location: skatepark.location && skatepark.location.coordinates
          ? {
              type: 'Point',
              coordinates: [
                typeof skatepark.location.coordinates[0] === 'number' 
                  ? skatepark.location.coordinates[0] 
                  : parseFloat(skatepark.location.coordinates[0]) || 0,
                typeof skatepark.location.coordinates[1] === 'number' 
                  ? skatepark.location.coordinates[1] 
                  : parseFloat(skatepark.location.coordinates[1]) || 0,
              ] as [number, number],
            }
          : skatepark.location,
        images: (skatepark.images || []).map((img, index) => ({
          url: img.url || '',
          isFeatured: img.isFeatured || false,
          orderNumber: img.orderNumber ?? index,
        })),
      };
      
      console.log('Saving skatepark with location:', skateparkToSave.location);
      
      const response = await fetch(`/api/admin/skateparks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skateparkToSave),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update skatepark');
      }

      router.push(`/${locale}/admin/skateparks`);
    } catch (err: any) {
      setError(err.message || 'Failed to save skatepark');
      console.error('Error saving skatepark:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this skatepark?')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/skateparks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete skatepark');
      }

      router.push(`/${locale}/admin/skateparks`);
    } catch (err: any) {
      setError(err.message || 'Failed to delete skatepark');
      console.error('Error deleting skatepark:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 min-h-screen bg-background dark:bg-background-dark">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !skatepark) {
    return (
      <div className="space-y-6 min-h-screen bg-background dark:bg-background-dark">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text dark:text-text-dark">Skatepark Not Found</h1>
          </div>
          <Link href={`/${locale}/admin/skateparks`}>
            <Button variant="secondary">Back to Skateparks</Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!skatepark) return null;

  return (
    <div className="space-y-6 min-h-screen bg-background dark:bg-background-dark">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">
            {skatepark.name.en || skatepark.name.he || 'Edit Skatepark'}
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Edit skatepark details
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href={`/${locale}/admin/skateparks`}>
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            Delete
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name (English)"
              value={skatepark.name.en}
              onChange={(e) =>
                setSkatepark({ ...skatepark, name: { ...skatepark.name, en: e.target.value } })
              }
            />
            <Input
              label="Name (Hebrew)"
              value={skatepark.name.he}
              onChange={(e) =>
                setSkatepark({ ...skatepark, name: { ...skatepark.name, he: e.target.value } })
              }
            />
          </div>
          <Input
            label="Slug"
            value={skatepark.slug}
            onChange={(e) => setSkatepark({ ...skatepark, slug: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={skatepark.status}
              onChange={(e) => setSkatepark({ ...skatepark, status: e.target.value as 'active' | 'inactive' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Select
              label="Area"
              value={skatepark.area}
              onChange={(e) => setSkatepark({ ...skatepark, area: e.target.value as 'north' | 'center' | 'south' })}
              options={[
                { value: 'north', label: 'North' },
                { value: 'center', label: 'Center' },
                { value: 'south', label: 'South' },
              ]}
            />
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isFeatured"
                checked={skatepark.isFeatured}
                onChange={(e) => setSkatepark({ ...skatepark, isFeatured: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-text dark:text-text-dark">
                Featured
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Images</CardTitle>
            <Button
              variant="secondary"
              onClick={() => setShowImageEditor(!showImageEditor)}
            >
              {showImageEditor ? 'Hide Image Editor' : 'Edit Images'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {skatepark.images && skatepark.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {[...skatepark.images]
                .sort((a, b) => a.orderNumber - b.orderNumber)
                .map((image, index) => (
                  <div
                    key={index}
                    className={`relative rounded-lg overflow-hidden border-2 ${
                      image.isFeatured
                        ? 'border-blue-500 dark:border-blue-400'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={`${skatepark.name.en} ${index + 1}`}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-skatepark.jpg';
                      }}
                    />
                    {image.isFeatured && (
                      <div className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Main
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
          {showImageEditor && (
            <div className="space-y-4 mt-4">
              {skatepark.images && skatepark.images.length > 0 ? (
                skatepark.images.map((image, imageIndex) => {
                  return (
                      <div
                        key={imageIndex}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img
                              src={image.url}
                              alt={`${skatepark.name.en} ${imageIndex + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder-skatepark.jpg';
                              }}
                            />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Input
                                  label="Order Number"
                                  type="number"
                                  value={image.orderNumber}
                                  onChange={(e) => {
                                    const newImages = [...skatepark.images];
                                    newImages[imageIndex].orderNumber = parseInt(e.target.value) || 0;
                                    setSkatepark({ ...skatepark, images: newImages });
                                  }}
                                  className="w-24"
                                />
                                <Button
                                  variant={image.isFeatured ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => {
                                    const newImages = [...skatepark.images];
                                    newImages.forEach((img, idx) => {
                                      img.isFeatured = idx === imageIndex;
                                    });
                                    setSkatepark({ ...skatepark, images: newImages });
                                  }}
                                >
                                  {image.isFeatured ? 'Main Image' : 'Set as Main'}
                                </Button>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const newImages = skatepark.images.filter((_, idx) => idx !== imageIndex);
                                  setSkatepark({ ...skatepark, images: newImages });
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                            <Input
                              label="Image URL"
                              value={image.url}
                              onChange={(e) => {
                                const newImages = [...skatepark.images];
                                newImages[imageIndex].url = e.target.value;
                                setSkatepark({ ...skatepark, images: newImages });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark text-center py-4">
                  No images added yet
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  const newImages = [
                    ...skatepark.images,
                    {
                      url: '',
                      isFeatured: skatepark.images.length === 0,
                      orderNumber: skatepark.images.length,
                    },
                  ];
                  setSkatepark({ ...skatepark, images: newImages });
                }}
              >
                + Add New Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Address (English)"
              value={skatepark.address.en}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  address: { ...skatepark.address, en: e.target.value },
                })
              }
            />
            <Input
              label="Address (Hebrew)"
              value={skatepark.address.he}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  address: { ...skatepark.address, he: e.target.value },
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={skatepark.location?.coordinates?.[1] ?? 0}
              onChange={(e) => {
                const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                if (!isNaN(newValue)) {
                  setSkatepark({
                    ...skatepark,
                    location: {
                      type: 'Point',
                      ...skatepark.location,
                      coordinates: [
                        skatepark.location?.coordinates?.[0] ?? 0,
                        newValue,
                      ] as [number, number],
                    },
                  });
                }
              }}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={skatepark.location?.coordinates?.[0] ?? 0}
              onChange={(e) => {
                const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                if (!isNaN(newValue)) {
                  setSkatepark({
                    ...skatepark,
                    location: {
                      type: 'Point',
                      ...skatepark.location,
                      coordinates: [
                        newValue,
                        skatepark.location?.coordinates?.[1] ?? 0,
                      ] as [number, number],
                    },
                  });
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Operating Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {skatepark.lightingHours?.is24Hours && (
            <div className="flex items-center space-x-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <input
                type="checkbox"
                id="is24Hours"
                checked={skatepark.lightingHours.is24Hours}
                onChange={(e) => setSkatepark({ 
                  ...skatepark, 
                  lightingHours: { 
                    ...skatepark.lightingHours, 
                    is24Hours: e.target.checked,
                    endTime: e.target.checked ? '' : skatepark.lightingHours?.endTime || '',
                  } 
                })}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is24Hours" className="text-sm font-medium text-text dark:text-text-dark">
                Open 24 Hours
              </label>
            </div>
          )}
          {!skatepark.lightingHours?.is24Hours && (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="is24Hours"
                  checked={skatepark.lightingHours?.is24Hours || false}
                  onChange={(e) => setSkatepark({ 
                    ...skatepark, 
                    lightingHours: { 
                      endTime: skatepark.lightingHours?.endTime || '',
                      is24Hours: e.target.checked,
                    } 
                  })}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is24Hours" className="text-sm font-medium text-text dark:text-text-dark">
                  Open 24 Hours
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'sunday', label: 'Sunday' },
                  { key: 'monday', label: 'Monday' },
                  { key: 'tuesday', label: 'Tuesday' },
                  { key: 'wednesday', label: 'Wednesday' },
                  { key: 'thursday', label: 'Thursday' },
                  { key: 'friday', label: 'Friday' },
                  { key: 'saturday', label: 'Saturday' },
                  { key: 'holidays', label: 'Holidays' },
                ].map((day) => {
                  const dayHours = skatepark.operatingHours[day.key as keyof typeof skatepark.operatingHours];
                  return (
                    <div key={day.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-text dark:text-text-dark">
                          {day.label}
                        </label>
                        <input
                          type="checkbox"
                          checked={dayHours.isOpen}
                          onChange={(e) => {
                            const newHours = {
                              ...skatepark.operatingHours,
                              [day.key]: {
                                ...dayHours,
                                isOpen: e.target.checked,
                                openingTime: e.target.checked ? dayHours.openingTime : '',
                                closingTime: e.target.checked ? dayHours.closingTime : '',
                              },
                            };
                            setSkatepark({ ...skatepark, operatingHours: newHours });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                      {dayHours.isOpen && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="time"
                            label="Open"
                            value={dayHours.openingTime}
                            onChange={(e) => {
                              const newHours = {
                                ...skatepark.operatingHours,
                                [day.key]: {
                                  ...dayHours,
                                  openingTime: e.target.value,
                                },
                              };
                              setSkatepark({ ...skatepark, operatingHours: newHours });
                            }}
                            className="text-sm"
                          />
                          <Input
                            type="time"
                            label="Close"
                            value={dayHours.closingTime}
                            onChange={(e) => {
                              const newHours = {
                                ...skatepark.operatingHours,
                                [day.key]: {
                                  ...dayHours,
                                  closingTime: e.target.value,
                                },
                              };
                              setSkatepark({ ...skatepark, operatingHours: newHours });
                            }}
                            className="text-sm"
                          />
                        </div>
                      )}
                      {!dayHours.isOpen && (
                        <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Closed</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-2">
                <Input
                  label="Lighting End Time (HH:mm)"
                  type="time"
                  value={skatepark.lightingHours?.endTime || ''}
                  onChange={(e) => setSkatepark({ 
                    ...skatepark, 
                    lightingHours: { 
                      endTime: e.target.value || '',
                      is24Hours: skatepark.lightingHours?.is24Hours || false,
                    } 
                  })}
                  placeholder="22:00"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Amenities */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'entryFee', label: 'Entry Fee' },
              { key: 'parking', label: 'Parking' },
              { key: 'shade', label: 'Shade' },
              { key: 'bathroom', label: 'Bathroom' },
              { key: 'helmetRequired', label: 'Helmet Required' },
              { key: 'guard', label: 'Security Guard' },
              { key: 'seating', label: 'Seating' },
              { key: 'bombShelter', label: 'Bomb Shelter' },
              { key: 'scootersAllowed', label: 'Scooters Allowed' },
              { key: 'bikesAllowed', label: 'Bikes Allowed' },
              { key: 'noWax', label: 'No Wax Policy' },
              { key: 'nearbyRestaurants', label: 'Nearby Restaurants' },
            ].map((amenity) => (
              <div key={amenity.key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={amenity.key}
                  checked={skatepark.amenities[amenity.key as keyof typeof skatepark.amenities] || false}
                  onChange={(e) => {
                    setSkatepark({
                      ...skatepark,
                      amenities: {
                        ...skatepark.amenities,
                        [amenity.key]: e.target.checked,
                      },
                    });
                  }}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor={amenity.key}
                  className="text-sm font-medium text-text dark:text-text-dark cursor-pointer"
                >
                  {amenity.label}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Year"
              type="number"
              value={skatepark.openingYear || ''}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  openingYear: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
            <Input
              label="Closing Year"
              type="number"
              value={skatepark.closingYear || ''}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  closingYear: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="YouTube URL"
              value={skatepark.mediaLinks.youtube || ''}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  mediaLinks: { ...skatepark.mediaLinks, youtube: e.target.value },
                })
              }
            />
            <Input
              label="Google Maps Frame"
              value={skatepark.mediaLinks.googleMapsFrame || ''}
              onChange={(e) =>
                setSkatepark({
                  ...skatepark,
                  mediaLinks: { ...skatepark.mediaLinks, googleMapsFrame: e.target.value },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* English Notes */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
              Notes (English)
            </label>
            {(skatepark.notes.en || []).map((note, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => {
                    const newNotes = [...(skatepark.notes.en || [])];
                    newNotes[index] = e.target.value;
                    setSkatepark({ ...skatepark, notes: { ...skatepark.notes, en: newNotes } });
                  }}
                  placeholder={`Note ${index + 1}`}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newNotes = [...(skatepark.notes.en || [])];
                    newNotes.splice(index, 1);
                    setSkatepark({ ...skatepark, notes: { ...skatepark.notes, en: newNotes } });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const newNotes = [...(skatepark.notes.en || []), ''];
                setSkatepark({ ...skatepark, notes: { ...skatepark.notes, en: newNotes } });
              }}
            >
              + Add English Note
            </Button>
          </div>

          {/* Hebrew Notes */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
              Notes (Hebrew)
            </label>
            {(skatepark.notes.he || []).map((note, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => {
                    const newNotes = [...(skatepark.notes.he || [])];
                    newNotes[index] = e.target.value;
                    setSkatepark({ ...skatepark, notes: { ...skatepark.notes, he: newNotes } });
                  }}
                  placeholder={`הערה ${index + 1}`}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newNotes = [...(skatepark.notes.he || [])];
                    newNotes.splice(index, 1);
                    setSkatepark({ ...skatepark, notes: { ...skatepark.notes, he: newNotes } });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const newNotes = [...(skatepark.notes.he || []), ''];
                setSkatepark({ ...skatepark, notes: { ...skatepark.notes, he: newNotes } });
              }}
            >
              + Add Hebrew Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-secondary dark:text-text-secondary-dark">Rating</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">
                {skatepark.rating.toFixed(1)} / 5.0
              </p>
            </div>
            <div>
              <p className="text-text-secondary dark:text-text-secondary-dark">Total Reviews</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">
                {skatepark.totalReviews}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
