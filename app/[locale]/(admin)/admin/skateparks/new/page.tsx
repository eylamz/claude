'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploader } from '@/components/admin/image-uploader';
import { Toaster } from '@/components/ui/toaster';

interface SkateparkFormData {
  slug: string;
  name: { en: string; he: string };
  address: { en: string; he: string };
  area: 'north' | 'center' | 'south' | '';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  images: Array<{ url: string; isFeatured: boolean; orderNumber: number; publicId?: string }>;
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
  skillLevel: { beginners: boolean; advanced: boolean; pro: boolean };
  status: 'active' | 'inactive';
  mediaLinks: {
    youtube?: string;
    googleMapsFrame?: string;
  };
  seoMetadata?: {
    keywords?: {
      en?: string | string[];
      he?: string | string[];
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

export default function NewSkateparkPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(true);
  const [keywordInputEn, setKeywordInputEn] = useState('');
  const [keywordInputHe, setKeywordInputHe] = useState('');

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
    skillLevel: { beginners: false, advanced: false, pro: false },
    status: 'active',
    mediaLinks: {
      youtube: '',
      googleMapsFrame: '',
    },
    seoMetadata: {
      keywords: { en: [], he: [] },
      description: { en: '', he: '' },
      ogImage: '',
    },
    qualityRating: {
      elementDiversity: undefined,
      cleanliness: undefined,
      maintenance: undefined,
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Helper function to split keywords by comma or "× "
  const splitKeywords = (input: string): string[] => {
    if (!input || !input.trim()) return [];
    return input
      .split(/,|×\s+/)
      .map(k => k.trim())
      .filter(k => k);
  };

  // Helper function to get keywords as array
  const getKeywordsArray = (keywords: string | string[] | undefined): string[] => {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords;
    if (typeof keywords === 'string' && keywords.trim()) {
      return splitKeywords(keywords);
    }
    return [];
  };

  // Helper function to add keywords
  const addKeywords = (lang: 'en' | 'he', inputValue: string) => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    const newKeywords = splitKeywords(trimmedValue);
    if (newKeywords.length === 0) return;

    const currentKeywords = getKeywordsArray(formData.seoMetadata?.keywords?.[lang]);
    const updatedKeywords = [...currentKeywords, ...newKeywords].filter(
      (keyword, index, self) => self.indexOf(keyword) === index // Remove duplicates
    );

    setFormData({
      ...formData,
      seoMetadata: {
        ...formData.seoMetadata,
        keywords: {
          ...formData.seoMetadata?.keywords,
          [lang]: updatedKeywords,
        },
      },
    });

    // Clear input
    if (lang === 'en') {
      setKeywordInputEn('');
    } else {
      setKeywordInputHe('');
    }
  };

  // Helper function to remove a keyword
  const removeKeyword = (lang: 'en' | 'he', index: number) => {
    const currentKeywords = getKeywordsArray(formData.seoMetadata?.keywords?.[lang]);
    const updatedKeywords = currentKeywords.filter((_, i) => i !== index);

    setFormData({
      ...formData,
      seoMetadata: {
        ...formData.seoMetadata,
        keywords: {
          ...formData.seoMetadata?.keywords,
          [lang]: updatedKeywords.length > 0 ? updatedKeywords : undefined,
        },
      },
    });
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

      // Convert keywords array to string for API
      const seoMetadataToSend = formData.seoMetadata ? {
        ...formData.seoMetadata,
        keywords: {
          en: Array.isArray(formData.seoMetadata.keywords?.en)
            ? (formData.seoMetadata.keywords.en.length > 0 ? formData.seoMetadata.keywords.en.join(', ') : '')
            : (formData.seoMetadata.keywords?.en || ''),
          he: Array.isArray(formData.seoMetadata.keywords?.he)
            ? (formData.seoMetadata.keywords.he.length > 0 ? formData.seoMetadata.keywords.he.join(', ') : '')
            : (formData.seoMetadata.keywords?.he || ''),
        },
      } : undefined;

      const dataToSend = {
        ...formData,
        operatingHours: cleanedOperatingHours,
        seoMetadata: seoMetadataToSend,
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
    <div className="pt-16 space-y-6 min-h-screen bg-background dark:bg-background-dark max-w-4xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">New Skatepark</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            Create a new skatepark entry
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
      {errors.general && (
        <Card>
          <CardContent className="p-4">
            <p className="text-red-600 dark:text-red-400">{errors.general}</p>
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
              value={formData.name.en}
              onChange={(e) => handleNameChange('en', e.target.value)}
              error={errors['name.en']}
            />
            <Input
              label="Name (Hebrew)"
              value={formData.name.he}
              onChange={(e) => handleNameChange('he', e.target.value)}
              error={errors['name.he']}
            />
          </div>
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            placeholder="skatepark-slug"
            error={errors.slug}
          />
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark -mt-2">
            URL-friendly identifier (auto-generated from English name)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <SelectWrapper
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              {formData.status === 'inactive' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>⚠️ Warning:</strong> Inactive parks are hidden from all public pages and search results. Users will not be able to view or access this skatepark.
                  </p>
                </div>
              )}
            </div>
            <SelectWrapper
              label="Area"
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
            <div className="pt-6">
              <Checkbox
                variant="brand"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(checked) => handleInputChange('isFeatured', checked)}
                label="Featured"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
            <p className="text-sm font-medium text-text dark:text-text-dark col-span-full">Skill level</p>
            <Checkbox
              variant="brand"
              id="beginners"
              checked={formData.skillLevel.beginners}
              onChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  skillLevel: { ...prev.skillLevel, beginners: checked },
                }))
              }
              label="Beginners"
            />
            <Checkbox
              variant="brand"
              id="advanced"
              checked={formData.skillLevel.advanced}
              onChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  skillLevel: { ...prev.skillLevel, advanced: checked },
                }))
              }
              label="Advanced"
            />
            <Checkbox
              variant="brand"
              id="pro"
              checked={formData.skillLevel.pro}
              onChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  skillLevel: { ...prev.skillLevel, pro: checked },
                }))
              }
              label="Pro"
            />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Images</CardTitle>
            <Button
              variant="ghost"
              onClick={() => setShowImageEditor(!showImageEditor)}
            >
              {showImageEditor ? 'Hide Image Editor' : 'Edit Images'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.images && formData.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {[...formData.images]
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
                      alt={`Image ${index + 1}`}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_SKATEPARK_IMAGE;
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
                  images={formData.images.map(img => ({
                    url: img.url,
                    publicId: img.publicId || '',
                    alt: `${formData.name.en || 'Skatepark'} image`,
                  }))}
                  onUpload={(uploadedImages) => {
                    const newImages = uploadedImages.map((img, index) => {
                      const existingIndex = formData.images.findIndex(existing => existing.publicId === img.publicId);
                      if (existingIndex >= 0) {
                        return {
                          ...formData.images[existingIndex],
                          url: img.url,
                          publicId: img.publicId,
                        };
                      }
                      return {
                        url: img.url,
                        publicId: img.publicId,
                        isFeatured: formData.images.length === 0 && index === 0,
                        orderNumber: formData.images.length + index,
                      };
                    });
                    setFormData({ ...formData, images: newImages });
                  }}
                  maxImages={20}
                  folder="skateparks"
                />
              </div>

              {/* Manual Image Editor */}
              {formData.images && formData.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-text dark:text-text-dark">Edit Image Details</h3>
                  {formData.images.map((image, imageIndex) => (
                    <div
                      key={imageIndex}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <img
                            src={image.url}
                            alt={`Image ${imageIndex + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PLACEHOLDER_SKATEPARK_IMAGE;
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
                          {image.publicId && (
                            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                              Cloudinary ID: {image.publicId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
          <div className="mb-4">
            <Checkbox
              variant="brand"
              id="is24Hours"
              checked={formData.lightingHours?.is24Hours || false}
              onChange={(checked) =>
                handleNestedInputChange('lightingHours', 'is24Hours', checked)
              }
              label="Open 24 Hours"
            />
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
                className="max-w-[200px]"
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
                  const dayHours = formData.operatingHours[day.key as keyof typeof formData.operatingHours];
                  return (
                    <div key={day.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-end">
                        <Checkbox
                          variant="brand"
                          id={`${day.key}-isOpen`}
                          checked={dayHours.isOpen}
                          onChange={(checked) => {
                            const newHours = {
                              ...formData.operatingHours,
                              [day.key]: {
                                ...dayHours,
                                isOpen: checked,
                                openingTime: checked ? (dayHours.openingTime || '') : '',
                                closingTime: checked ? (dayHours.closingTime || '') : '',
                              },
                            };
                            handleInputChange('operatingHours', newHours);
                          }}
                          label={day.label}
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
              <Checkbox
                variant="brand"
                key={amenity.key}
                id={amenity.key}
                checked={formData.amenities[amenity.key as keyof typeof formData.amenities] || false}
                onChange={(checked) => {
                  handleNestedInputChange('amenities', amenity.key, checked);
                }}
                label={amenity.label}
              />
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
              <SelectWrapper
                label="Opening Month (Optional)"
                value={formData.openingMonth?.toString() || ''}
                onChange={(e) =>
                  handleInputChange('openingMonth', e.target.value && e.target.value !== '' ? parseInt(e.target.value) : undefined)
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
              <SelectWrapper
                label="Closing Month (Optional)"
                value={formData.closingMonth?.toString() || ''}
                onChange={(e) =>
                  handleInputChange('closingMonth', e.target.value && e.target.value !== '' ? parseInt(e.target.value) : undefined)
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

      {/* SEO Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text dark:text-text-dark">English</h3>
              <div className="space-y-2">
                <Input
                  label="Keywords (English)"
                  value={keywordInputEn}
                  onChange={(e) => setKeywordInputEn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeywords('en', keywordInputEn);
                    }
                  }}
                  placeholder="Type keyword and press Enter (use comma to add multiple)"
                />
                {getKeywordsArray(formData.seoMetadata?.keywords?.en).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getKeywordsArray(formData.seoMetadata?.keywords?.en).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 uppercase px-2 py-1 rounded-lg text-[12px] md:text-xs font-semibold bg-[#e7defc] dark:bg-[#472881] text-[#915bf5] dark:text-[#c5b6fd] border-[#b99ef867] dark:border-[#5f4cc54d] transition-colors"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword('en', index)}
                          className="hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none"
                          aria-label={`Remove ${keyword}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="Description (English)"
                value={formData.seoMetadata?.description?.en || ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    seoMetadata: {
                      ...prev.seoMetadata,
                      description: {
                        ...prev.seoMetadata?.description,
                        en: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="A brief description for search engines"
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text dark:text-text-dark">Hebrew</h3>
              <div className="space-y-2">
                <Input
                  label="Keywords (Hebrew)"
                  value={keywordInputHe}
                  onChange={(e) => setKeywordInputHe(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeywords('he', keywordInputHe);
                    }
                  }}
                  placeholder="הקלד מילת מפתח ולחץ Enter (השתמש בפסיק להוספת מספר)"
                />
                {getKeywordsArray(formData.seoMetadata?.keywords?.he).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getKeywordsArray(formData.seoMetadata?.keywords?.he).map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword('he', index)}
                          className="hover:text-blue-600 dark:hover:text-blue-300 focus:outline-none"
                          aria-label={`Remove ${keyword}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Input
                label="Description (Hebrew)"
                value={formData.seoMetadata?.description?.he || ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    seoMetadata: {
                      ...prev.seoMetadata,
                      description: {
                        ...prev.seoMetadata?.description,
                        he: e.target.value,
                      },
                    },
                  }))
                }
                placeholder="תיאור קצר למנועי חיפוש"
              />
            </div>
          </div>
          <Input
            label="OG Image URL"
            value={formData.seoMetadata?.ogImage || ''}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                seoMetadata: {
                  ...prev.seoMetadata,
                  ogImage: e.target.value,
                },
              }))
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Element Diversity (1-5)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.qualityRating?.elementDiversity || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                      setFormData(prev => ({
                        ...prev,
                        qualityRating: {
                          ...prev.qualityRating,
                          elementDiversity: value,
                        },
                      }));
                    }
                  }}
                  placeholder="1.0-5.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cleanliness (1-5)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.qualityRating?.cleanliness || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                      setFormData(prev => ({
                        ...prev,
                        qualityRating: {
                          ...prev.qualityRating,
                          cleanliness: value,
                        },
                      }));
                    }
                  }}
                  placeholder="1.0-5.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maintenance (1-5)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.qualityRating?.maintenance || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    if (value === undefined || (!isNaN(value) && value >= 1 && value <= 5)) {
                      setFormData(prev => ({
                        ...prev,
                        qualityRating: {
                          ...prev.qualityRating,
                          maintenance: value,
                        },
                      }));
                    }
                  }}
                  placeholder="1.0-5.0"
                />
              </div>
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
          <div className="w-full flex flex-col md:flex-row gap-2">
            <div className="space-y-3 w-full">
              <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
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
                    variant="error"
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
          </div>

          {/* Hebrew Notes */}
          <div className="space-y-3 w-full">
            <label className="block text-sm font-medium text-text dark:text-text-dark mb-2">
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
                  variant="error"
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
