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
    closingYear: undefined,
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

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/admin/skateparks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create skatepark');
      }

      const data = await response.json();
      router.push(`/${locale}/admin/skateparks/${data.skatepark._id || data.skatepark.id}`);
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to create skatepark' });
      console.error('Error creating skatepark:', error);
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
