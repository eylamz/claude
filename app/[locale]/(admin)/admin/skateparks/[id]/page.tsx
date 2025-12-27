'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Skeleton } from '@/components/ui';
import { ImageUploader } from '@/components/admin/image-uploader';

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
    publicId?: string;
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
  openingYear?: number | null;
  openingMonth?: number | null;
  closingYear?: number | null;
  closingMonth?: number | null;
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
  seoMetadata?: {
    keywords?: {
      en?: string;
      he?: string;
    };
    description?: {
      en?: string;
      he?: string;
    };
    ogImage?: string;
  };
  qualityRating?: {
    elementDiversity?: number;
    cleanliness?: number;
    maintenance?: number;
  };
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
            if (!skateparkData.seoMetadata) {
              skateparkData.seoMetadata = {
                keywords: { en: '', he: '' },
                description: { en: '', he: '' },
                ogImage: '',
              };
            }
            if (!skateparkData.qualityRating) {
              skateparkData.qualityRating = {
                elementDiversity: undefined,
                cleanliness: undefined,
                maintenance: undefined,
              };
            }
            
            // Ensure openingMonth and closingMonth are explicitly set (even if null)
            if (!('openingMonth' in skateparkData)) {
              skateparkData.openingMonth = null;
            }
            if (!('closingMonth' in skateparkData)) {
              skateparkData.closingMonth = null;
            }
            
            // Ensure rating and totalReviews have default values
            if (skateparkData.rating === undefined || skateparkData.rating === null) {
              skateparkData.rating = 0;
            }
            if (skateparkData.totalReviews === undefined || skateparkData.totalReviews === null) {
              skateparkData.totalReviews = 0;
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
      
      // Ensure openingMonth and closingMonth are explicitly set (even if null)
      if (!('openingMonth' in skateparkData) || skateparkData.openingMonth === undefined) {
        skateparkData.openingMonth = null;
      }
      if (!('closingMonth' in skateparkData) || skateparkData.closingMonth === undefined) {
        skateparkData.closingMonth = null;
      }
      
      // Initialize SEO metadata and quality rating if missing
      if (!skateparkData.seoMetadata) {
        skateparkData.seoMetadata = {
          keywords: { en: '', he: '' },
          description: { en: '', he: '' },
          ogImage: '',
        };
      }
      if (!skateparkData.qualityRating) {
        skateparkData.qualityRating = {
          elementDiversity: undefined,
          cleanliness: undefined,
          maintenance: undefined,
        };
      }
      
      // Ensure rating and totalReviews have default values
      if (skateparkData.rating === undefined || skateparkData.rating === null) {
        skateparkData.rating = 0;
      }
      if (skateparkData.totalReviews === undefined || skateparkData.totalReviews === null) {
        skateparkData.totalReviews = 0;
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
      // Clean up operating hours - only include times when isOpen is true
      const cleanedOperatingHours: any = {};
      if (skatepark.operatingHours) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'holidays'];
        days.forEach((day) => {
          const dayHours = skatepark.operatingHours[day as keyof typeof skatepark.operatingHours];
          if (dayHours && dayHours.isOpen === true && dayHours.openingTime && dayHours.closingTime) {
            cleanedOperatingHours[day] = {
              isOpen: true,
              openingTime: dayHours.openingTime,
              closingTime: dayHours.closingTime,
            };
          } else if (dayHours) {
            // When closed, only include isOpen - don't include time fields
            cleanedOperatingHours[day] = {
              isOpen: false,
            };
          }
        });
      }

      // Only send fields that can be updated (exclude _id, createdAt, updatedAt, rating, totalReviews, etc.)
      const skateparkToSave = {
        slug: skatepark.slug,
        name: skatepark.name,
        address: skatepark.address,
        area: skatepark.area,
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
          publicId: img.publicId,
        })),
        operatingHours: cleanedOperatingHours,
        lightingHours: skatepark.lightingHours,
        amenities: skatepark.amenities,
        openingYear: skatepark.openingYear ?? null,
        openingMonth: skatepark.openingMonth ?? null,
        closingYear: skatepark.closingYear ?? null,
        closingMonth: skatepark.closingMonth ?? null,
        notes: skatepark.notes,
        isFeatured: skatepark.isFeatured,
        status: skatepark.status,
        mediaLinks: skatepark.mediaLinks,
        is24Hours: skatepark.lightingHours?.is24Hours || false,
        seoMetadata: skatepark.seoMetadata,
        qualityRating: skatepark.qualityRating,
      };
      
      // Ensure months are always explicitly set to null (not undefined) before stringifying
      // This ensures they're always included in the JSON payload
      if (skateparkToSave.openingMonth === undefined) {
        skateparkToSave.openingMonth = null;
      }
      if (skateparkToSave.closingMonth === undefined) {
        skateparkToSave.closingMonth = null;
      }
      
      console.log('Saving skatepark - openingYear:', skateparkToSave.openingYear, 'openingMonth:', skateparkToSave.openingMonth);
      console.log('Saving skatepark - closingYear:', skateparkToSave.closingYear, 'closingMonth:', skateparkToSave.closingMonth);
      console.log('Full skateparkToSave object:', JSON.stringify(skateparkToSave, null, 2));
      
      const response = await fetch(`/api/admin/skateparks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skateparkToSave, (_key, value) => {
          // Replace undefined with null to ensure they're included in JSON
          return value === undefined ? null : value;
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Save failed:', data);
        throw new Error(data.error || 'Failed to update skatepark');
      }

      const result = await response.json();
      console.log('Save successful:', result);
      
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
    <div className="pt-16 space-y-6 min-h-screen bg-background dark:bg-background-dark">
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
              {/* Image Uploader */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-text dark:text-text-dark mb-4">Upload Images to Cloudinary</h3>
                <ImageUploader
                  images={skatepark.images.map(img => ({
                    url: img.url,
                    publicId: img.publicId || '',
                    alt: `${skatepark.name.en} image`,
                  }))}
                  onUpload={(uploadedImages) => {
                    // Convert ImageUploader format to skatepark images format
                    const newImages = uploadedImages.map((img, index) => {
                      // Find existing image with same publicId or create new
                      const existingIndex = skatepark.images.findIndex(existing => existing.publicId === img.publicId);
                      if (existingIndex >= 0) {
                        // Update existing image
                        return {
                          ...skatepark.images[existingIndex],
                          url: img.url,
                          publicId: img.publicId,
                        };
                      }
                      // New image
                      return {
                        url: img.url,
                        publicId: img.publicId,
                        isFeatured: skatepark.images.length === 0 && index === 0,
                        orderNumber: skatepark.images.length + index,
                      };
                    });
                    setSkatepark({ ...skatepark, images: newImages });
                  }}
                  maxImages={20}
                  folder="skateparks"
                />
              </div>

              {/* Manual Image Editor */}
              {skatepark.images && skatepark.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-text dark:text-text-dark">Edit Image Details</h3>
                  {skatepark.images.map((image, imageIndex) => {
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
                            {image.publicId && (
                              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                Cloudinary ID: {image.publicId}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                      type: 'Point' as const,
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
                      type: 'Point' as const,
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
          {skatepark.lightingHours?.is24Hours ? (
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
              <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-2">
                When 24 hours is enabled, enter the time when lighting ends.
              </p>
            </div>
          ) : (
            <>
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
            <div className="space-y-2">
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
              <Select
                label="Opening Month (Optional)"
                value={skatepark.openingMonth?.toString() || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    openingMonth: e.target.value && e.target.value !== '' ? parseInt(e.target.value) : null,
                  })
                }
                options={[
                  { value: '', label: 'No month specified' },
                  { value: '1', label: 'January' },
                  { value: '2', label: 'February' },
                  { value: '3', label: 'March' },
                  { value: '4', label: 'April' },
                  { value: '5', label: 'May' },
                  { value: '6', label: 'June' },
                  { value: '7', label: 'July' },
                  { value: '8', label: 'August' },
                  { value: '9', label: 'September' },
                  { value: '10', label: 'October' },
                  { value: '11', label: 'November' },
                  { value: '12', label: 'December' },
                ]}
              />
            </div>
            <div className="space-y-2">
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
              <Select
                label="Closing Month (Optional)"
                value={skatepark.closingMonth?.toString() || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    closingMonth: e.target.value && e.target.value !== '' ? parseInt(e.target.value) : null,
                  })
                }
                options={[
                  { value: '', label: 'No month specified' },
                  { value: '1', label: 'January' },
                  { value: '2', label: 'February' },
                  { value: '3', label: 'March' },
                  { value: '4', label: 'April' },
                  { value: '5', label: 'May' },
                  { value: '6', label: 'June' },
                  { value: '7', label: 'July' },
                  { value: '8', label: 'August' },
                  { value: '9', label: 'September' },
                  { value: '10', label: 'October' },
                  { value: '11', label: 'November' },
                  { value: '12', label: 'December' },
                ]}
              />
            </div>
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

      {/* SEO Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text dark:text-text-dark">English</h3>
              <Input
                label="Keywords (English)"
                value={skatepark.seoMetadata?.keywords?.en || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    seoMetadata: {
                      ...skatepark.seoMetadata,
                      keywords: {
                        ...skatepark.seoMetadata?.keywords,
                        en: e.target.value,
                      },
                    },
                  })
                }
                placeholder="skatepark, skateboarding, ramps, rails"
              />
              <Input
                label="Description (English)"
                value={skatepark.seoMetadata?.description?.en || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    seoMetadata: {
                      ...skatepark.seoMetadata,
                      description: {
                        ...skatepark.seoMetadata?.description,
                        en: e.target.value,
                      },
                    },
                  })
                }
                placeholder="A brief description for search engines"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text dark:text-text-dark">Hebrew</h3>
              <Input
                label="Keywords (Hebrew)"
                value={skatepark.seoMetadata?.keywords?.he || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    seoMetadata: {
                      ...skatepark.seoMetadata,
                      keywords: {
                        ...skatepark.seoMetadata?.keywords,
                        he: e.target.value,
                      },
                    },
                  })
                }
                placeholder="סקייטפארק, סקייטבורדינג"
              />
              <Input
                label="Description (Hebrew)"
                value={skatepark.seoMetadata?.description?.he || ''}
                onChange={(e) =>
                  setSkatepark({
                    ...skatepark,
                    seoMetadata: {
                      ...skatepark.seoMetadata,
                      description: {
                        ...skatepark.seoMetadata?.description,
                        he: e.target.value,
                      },
                    },
                  })
                }
                placeholder="תיאור קצר למנועי חיפוש"
              />
            </div>
          </div>
          <Input
            label="OG Image URL"
            value={skatepark.seoMetadata?.ogImage || ''}
            onChange={(e) =>
              setSkatepark({
                ...skatepark,
                seoMetadata: {
                  ...skatepark.seoMetadata,
                  ogImage: e.target.value,
                },
              })
            }
            placeholder="https://example.com/image.jpg or /images/og-image.jpg"
          />
        </CardContent>
      </Card>

      {/* Quality Rating */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Rating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                Element Diversity (1-5)
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={skatepark.qualityRating?.elementDiversity || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                    setSkatepark({
                      ...skatepark,
                      qualityRating: {
                        ...skatepark.qualityRating,
                        elementDiversity: value,
                      },
                    });
                  }
                }}
                placeholder="1.0-5.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                Cleanliness (1-5)
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={skatepark.qualityRating?.cleanliness || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                    setSkatepark({
                      ...skatepark,
                      qualityRating: {
                        ...skatepark.qualityRating,
                        cleanliness: value,
                      },
                    });
                  }
                }}
                placeholder="1.0-5.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
                Maintenance (1-5)
              </label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={skatepark.qualityRating?.maintenance || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                    setSkatepark({
                      ...skatepark,
                      qualityRating: {
                        ...skatepark.qualityRating,
                        maintenance: value,
                      },
                    });
                  }
                }}
                placeholder="1.0-5.0"
              />
            </div>
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
                {(skatepark.rating ?? 0).toFixed(1)} / 5.0
              </p>
            </div>
            <div>
              <p className="text-text-secondary dark:text-text-secondary-dark">Total Reviews</p>
              <p className="text-2xl font-bold text-text dark:text-text-dark">
                {skatepark.totalReviews ?? 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
