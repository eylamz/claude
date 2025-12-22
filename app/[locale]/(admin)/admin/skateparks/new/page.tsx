'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';

interface SkateparkFormData {
  slug: string;
  name: { en: string; he: string };
  address: { en: string; he: string };
  area: 'north' | 'center' | 'south' | '';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: Array<{ url: string; isFeatured: boolean; orderNumber: number }>;
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
  openingMonth?: number;
  closingYear?: number;
  closingMonth?: number;
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
}

export default function NewSkateparkPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<SkateparkFormData>({
    slug: '',
    name: { en: '', he: '' },
    address: { en: '', he: '' },
    area: '',
    location: {
      type: 'Point',
      coordinates: [0, 0],
    },
    images: [],
    operatingHours: {
      sunday: { openingTime: '', closingTime: '', isOpen: false },
      monday: { openingTime: '', closingTime: '', isOpen: false },
      tuesday: { openingTime: '', closingTime: '', isOpen: false },
      wednesday: { openingTime: '', closingTime: '', isOpen: false },
      thursday: { openingTime: '', closingTime: '', isOpen: false },
      friday: { openingTime: '', closingTime: '', isOpen: false },
      saturday: { openingTime: '', closingTime: '', isOpen: false },
      holidays: { openingTime: '', closingTime: '', isOpen: false },
    },
    lightingHours: {
      endTime: '',
      is24Hours: false,
    },
    amenities: {
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
    },
    openingYear: undefined,
    openingMonth: undefined,
    closingYear: undefined,
    closingMonth: undefined,
    notes: {
      en: [],
      he: [],
    },
    isFeatured: false,
    status: 'active',
    mediaLinks: {
      youtube: '',
      googleMapsFrame: '',
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, name: { ...prev.name, [lang]: value } };
      if (lang === 'en' && (!prev.slug || prev.slug === generateSlug(prev.name.en))) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
    setErrors(prev => ({ ...prev, [`name.${lang}`]: '' }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof SkateparkFormData] as any),
        [field]: value,
      },
    }));
    setErrors(prev => ({ ...prev, [`${parent}.${field}`]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    }
    if (!formData.name.en.trim()) {
      newErrors['name.en'] = 'English name is required';
    }
    if (!formData.name.he.trim()) {
      newErrors['name.he'] = 'Hebrew name is required';
    }
    if (!formData.address.en.trim()) {
      newErrors['address.en'] = 'English address is required';
    }
    if (!formData.address.he.trim()) {
      newErrors['address.he'] = 'Hebrew address is required';
    }
    if (!formData.area) {
      newErrors.area = 'Area is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Form submitted', formData);
    
    if (!validate()) {
      console.log('Validation failed', errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Clean up operating hours - only include times when isOpen is true
      const cleanedOperatingHours: any = {};
      Object.keys(formData.operatingHours).forEach((day) => {
        const dayHours = formData.operatingHours[day as keyof typeof formData.operatingHours];
        if (dayHours.isOpen) {
          cleanedOperatingHours[day] = {
            isOpen: true,
            openingTime: dayHours.openingTime || '',
            closingTime: dayHours.closingTime || '',
          };
        } else {
          cleanedOperatingHours[day] = {
            isOpen: false,
            openingTime: '',
            closingTime: '',
          };
        }
      });

      const dataToSend = {
        ...formData,
        operatingHours: cleanedOperatingHours,
      };

      console.log('Sending request with data:', dataToSend);
      const response = await fetch('/api/admin/skateparks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'Failed to create skatepark');
      }

      const data = await response.json();
      console.log('Success:', data);
      router.push(`/${locale}/admin/skateparks`);
    } catch (error: any) {
      console.error('Error creating skatepark:', error);
      setErrors({ general: error.message || 'Failed to create skatepark' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Skatepark</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{errors.general}</p>
          </div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs */}
            <div className="flex space-x-2 border-b">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'en'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('he')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'he'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Hebrew
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name ({activeTab === 'en' ? 'English' : 'Hebrew'})
              </label>
              <Input
                value={formData.name[activeTab]}
                onChange={(e) => handleNameChange(activeTab, e.target.value)}
                placeholder={activeTab === 'en' ? 'Enter skatepark name' : 'הזן שם פארק'}
                error={errors[`name.${activeTab}`]}
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address ({activeTab === 'en' ? 'English' : 'Hebrew'})
              </label>
              <Input
                value={formData.address[activeTab]}
                onChange={(e) =>
                  handleNestedInputChange('address', activeTab, e.target.value)
                }
                placeholder={activeTab === 'en' ? 'Enter address' : 'הזן כתובת'}
                error={errors[`address.${activeTab}`]}
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug
              </label>
              <Input
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="skatepark-slug"
                error={errors.slug}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                URL-friendly identifier (auto-generated from English name)
              </p>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Area
              </label>
              <Select
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                error={errors.area}
                options={[
                  { value: '', label: 'Select area' },
                  { value: 'north', label: 'North' },
                  { value: 'center', label: 'Center' },
                  { value: 'south', label: 'South' },
                ]}
              />
            </div>

            {/* Location Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.location.coordinates[0]}
                  onChange={(e) =>
                    handleNestedInputChange('location', 'coordinates', [
                      parseFloat(e.target.value) || 0,
                      formData.location.coordinates[1],
                    ])
                  }
                  placeholder="34.7618"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="any"
                  value={formData.location.coordinates[1]}
                  onChange={(e) =>
                    handleNestedInputChange('location', 'coordinates', [
                      formData.location.coordinates[0],
                      parseFloat(e.target.value) || 0,
                    ])
                  }
                  placeholder="32.0853"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>

            {/* Featured */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isFeatured" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Featured Skatepark
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.images && formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                {formData.images
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
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={`Image ${index + 1}`}
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-skatepark.jpg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 dark:text-gray-500 text-sm">No image</span>
                        </div>
                      )}
                      {image.isFeatured && (
                        <div className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Main
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <div className="space-y-4">
              {formData.images && formData.images.length > 0 ? (
                formData.images.map((image, imageIndex) => (
                  <div
                    key={imageIndex}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        {image.url ? (
                          <img
                            src={image.url}
                            alt={`Image ${imageIndex + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-skatepark.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-gray-400 dark:text-gray-500 text-xs">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Input
                              label="Order Number"
                              type="number"
                              value={image.orderNumber}
                              onChange={(e) => {
                                const newImages = [...formData.images];
                                newImages[imageIndex].orderNumber = parseInt(e.target.value) || 0;
                                setFormData({ ...formData, images: newImages });
                              }}
                              className="w-24"
                            />
                            <Button
                              type="button"
                              variant={image.isFeatured ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                const newImages = [...formData.images];
                                newImages.forEach((img, idx) => {
                                  img.isFeatured = idx === imageIndex;
                                });
                                setFormData({ ...formData, images: newImages });
                              }}
                            >
                              {image.isFeatured ? 'Main Image' : 'Set as Main'}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newImages = formData.images.filter((_, idx) => idx !== imageIndex);
                              setFormData({ ...formData, images: newImages });
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                        <Input
                          label="Image URL"
                          value={image.url}
                          onChange={(e) => {
                            const newImages = [...formData.images];
                            newImages[imageIndex].url = e.target.value;
                            setFormData({ ...formData, images: newImages });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark text-center py-4">
                  No images added yet
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const newImages = [
                    ...formData.images,
                    {
                      url: '',
                      isFeatured: formData.images.length === 0,
                      orderNumber: formData.images.length,
                    },
                  ];
                  setFormData({ ...formData, images: newImages });
                }}
              >
                + Add New Image
              </Button>
            </div>
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
                value={formData.address.en}
                onChange={(e) =>
                  handleNestedInputChange('address', 'en', e.target.value)
                }
                error={errors['address.en']}
              />
              <Input
                label="Address (Hebrew)"
                value={formData.address.he}
                onChange={(e) =>
                  handleNestedInputChange('address', 'he', e.target.value)
                }
                error={errors['address.he']}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Latitude"
                type="number"
                step="any"
                value={formData.location.coordinates[1]}
                onChange={(e) =>
                  handleNestedInputChange('location', 'coordinates', [
                    formData.location.coordinates[0],
                    parseFloat(e.target.value) || 0,
                  ])
                }
              />
              <Input
                label="Longitude"
                type="number"
                step="any"
                value={formData.location.coordinates[0]}
                onChange={(e) =>
                  handleNestedInputChange('location', 'coordinates', [
                    parseFloat(e.target.value) || 0,
                    formData.location.coordinates[1],
                  ])
                }
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
                checked={formData.lightingHours?.is24Hours || false}
                onChange={(e) =>
                  handleNestedInputChange('lightingHours', 'is24Hours', e.target.checked)
                }
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is24Hours" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Open 24 Hours
              </label>
            </div>
            {formData.lightingHours?.is24Hours ? (
              <div className="pt-2">
                <Input
                  label="Lighting End Time (HH:mm)"
                  type="time"
                  value={formData.lightingHours?.endTime || ''}
                  onChange={(e) =>
                    handleNestedInputChange('lightingHours', 'endTime', e.target.value || '')
                  }
                  placeholder="22:00"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
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
                    const dayHours = formData.operatingHours[day.key as keyof typeof formData.operatingHours];
                    return (
                      <div key={day.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {day.label}
                          </label>
                          <input
                            type="checkbox"
                            checked={dayHours.isOpen}
                            onChange={(e) => {
                              const newHours = {
                                ...formData.operatingHours,
                                [day.key]: {
                                  ...dayHours,
                                  isOpen: e.target.checked,
                                  openingTime: e.target.checked ? (dayHours.openingTime || '') : '',
                                  closingTime: e.target.checked ? (dayHours.closingTime || '') : '',
                                },
                              };
                              handleInputChange('operatingHours', newHours);
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
                                  ...formData.operatingHours,
                                  [day.key]: {
                                    ...dayHours,
                                    openingTime: e.target.value,
                                  },
                                };
                                handleInputChange('operatingHours', newHours);
                              }}
                              className="text-sm"
                            />
                            <Input
                              type="time"
                              label="Close"
                              value={dayHours.closingTime}
                              onChange={(e) => {
                                const newHours = {
                                  ...formData.operatingHours,
                                  [day.key]: {
                                    ...dayHours,
                                    closingTime: e.target.value,
                                  },
                                };
                                handleInputChange('operatingHours', newHours);
                              }}
                              className="text-sm"
                            />
                          </div>
                        )}
                        {!dayHours.isOpen && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Closed</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2">
                  <Input
                    label="Lighting End Time (HH:mm)"
                    type="time"
                    value={formData.lightingHours?.endTime || ''}
                    onChange={(e) =>
                      handleNestedInputChange('lightingHours', 'endTime', e.target.value || '')
                    }
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
                    checked={formData.amenities[amenity.key as keyof typeof formData.amenities] || false}
                    onChange={(e) => {
                      handleNestedInputChange('amenities', amenity.key, e.target.checked);
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor={amenity.key}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
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
                  value={formData.openingYear || ''}
                  onChange={(e) =>
                    handleInputChange('openingYear', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
                <Select
                  label="Opening Month (Optional)"
                  value={formData.openingMonth?.toString() || ''}
                  onChange={(e) =>
                    handleInputChange('openingMonth', e.target.value ? parseInt(e.target.value) : undefined)
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
                  value={formData.closingYear || ''}
                  onChange={(e) =>
                    handleInputChange('closingYear', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                />
                <Select
                  label="Closing Month (Optional)"
                  value={formData.closingMonth?.toString() || ''}
                  onChange={(e) =>
                    handleInputChange('closingMonth', e.target.value ? parseInt(e.target.value) : undefined)
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
                value={formData.mediaLinks.youtube || ''}
                onChange={(e) =>
                  handleNestedInputChange('mediaLinks', 'youtube', e.target.value)
                }
              />
              <Input
                label="Google Maps Frame"
                value={formData.mediaLinks.googleMapsFrame || ''}
                onChange={(e) =>
                  handleNestedInputChange('mediaLinks', 'googleMapsFrame', e.target.value)
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (English)
              </label>
              {(formData.notes.en || []).map((note, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => {
                      const newNotes = [...(formData.notes.en || [])];
                      newNotes[index] = e.target.value;
                      setFormData({ ...formData, notes: { ...formData.notes, en: newNotes } });
                    }}
                    placeholder={`Note ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newNotes = [...(formData.notes.en || [])];
                      newNotes.splice(index, 1);
                      setFormData({ ...formData, notes: { ...formData.notes, en: newNotes } });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const newNotes = [...(formData.notes.en || []), ''];
                  setFormData({ ...formData, notes: { ...formData.notes, en: newNotes } });
                }}
              >
                + Add English Note
              </Button>
            </div>

            {/* Hebrew Notes */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Hebrew)
              </label>
              {(formData.notes.he || []).map((note, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => {
                      const newNotes = [...(formData.notes.he || [])];
                      newNotes[index] = e.target.value;
                      setFormData({ ...formData, notes: { ...formData.notes, he: newNotes } });
                    }}
                    placeholder={`הערה ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newNotes = [...(formData.notes.he || [])];
                      newNotes.splice(index, 1);
                      setFormData({ ...formData, notes: { ...formData.notes, he: newNotes } });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const newNotes = [...(formData.notes.he || []), ''];
                  setFormData({ ...formData, notes: { ...formData.notes, he: newNotes } });
                }}
              >
                + Add Hebrew Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Skatepark'}
          </Button>
        </div>
      </form>
    </div>
  );
}
