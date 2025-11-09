'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';
import { ImageUploader } from '@/components/admin';

interface TrainerFormData {
  name: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  shortDescription: { en: string; he: string };
  
  // Media
  profileImage: string;
  galleryImages: { url: string; alt: { en: string; he: string }; order: number; publicId: string }[];
  
  // Location & Details
  area: 'north' | 'center' | 'south' | '';
  relatedSports: string[];
  
  // Contact
  phone: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  contactVisible: boolean;
  
  // Links
  linkedSkateparks: string[];
  
  // Settings
  status: 'active' | 'inactive' | 'pending';
  isFeatured: boolean;
  tags: string[];
  notes: string;
  
  // SEO
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
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

export default function NewTrainerPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [formData, setFormData] = useState<TrainerFormData>({
    name: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    shortDescription: { en: '', he: '' },
    profileImage: '',
    galleryImages: [],
    area: '',
    relatedSports: [],
    phone: '',
    email: '',
    website: '',
    instagram: '',
    facebook: '',
    contactVisible: true,
    linkedSkateparks: [],
    status: 'active',
    isFeatured: false,
    tags: [],
    notes: '',
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
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
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddSport = (sport: string) => {
    if (!formData.relatedSports.includes(sport)) {
      setFormData(prev => ({
        ...prev,
        relatedSports: [...prev.relatedSports, sport],
      }));
    }
  };

  const handleRemoveSport = (sport: string) => {
    setFormData(prev => ({
      ...prev,
      relatedSports: prev.relatedSports.filter(s => s !== sport),
    }));
  };

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag],
      }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleGalleryUpload = (images: { url: string; publicId: string }[]) => {
    const formattedImages = images.map((img, index) => ({
      url: img.url,
      alt: { en: '', he: '' },
      order: index,
      publicId: img.publicId,
    }));
    setFormData(prev => ({ ...prev, galleryImages: formattedImages }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.en) newErrors['name.en'] = 'English name is required';
    if (!formData.name.he) newErrors['name.he'] = 'Hebrew name is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (!formData.area) newErrors['area'] = 'Area is required';
    if (!formData.profileImage) newErrors['profileImage'] = 'Profile image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = useCallback(async () => {
    try {
      console.log('Saving draft...', formData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [formData]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contactDetails: {
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
            instagram: formData.instagram,
            facebook: formData.facebook,
            visible: formData.contactVisible,
          },
        }),
      });

      if (response.ok) {
        router.push(`/${locale}/admin/trainers`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Trainer</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => console.log('Save draft')}>
            Save Draft
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Trainer'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  activeTab === 'en' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('he')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'he' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                }`}
              >
                Hebrew
              </button>
            </div>

            {/* Name */}
            <div>
              <Input
                label="Name"
                value={formData.name[activeTab]}
                onChange={(e) => handleNameChange(activeTab, e.target.value)}
                placeholder={activeTab === 'en' ? 'Trainer Name' : 'שם המדריך'}
                error={errors[`name.${activeTab}`]}
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Input
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="trainer-name"
                error={errors.slug}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, [activeTab]: e.target.value },
                  }))
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeTab === 'en' ? 'Trainer description' : 'תיאור המדריך'}
                required
              />
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description
              </label>
              <textarea
                value={formData.shortDescription[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    shortDescription: { ...prev.shortDescription, [activeTab]: e.target.value },
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeTab === 'en' ? 'Brief description' : 'תיאור קצר'}
                maxLength={500}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Image
              </label>
              <Input
                type="url"
                value={formData.profileImage}
                onChange={(e) => handleInputChange('profileImage', e.target.value)}
                placeholder="https://..."
                error={errors.profileImage}
                required
              />
              {formData.profileImage && (
                <div className="mt-3">
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-32 h-32 object-cover rounded-full"
                  />
                </div>
              )}
            </div>

            {/* Gallery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Images
              </label>
              <ImageUploader
                images={formData.galleryImages.map(img => ({
                  url: img.url,
                  publicId: img.publicId,
                  alt: img.alt.en,
                }))}
                onUpload={handleGalleryUpload}
                maxImages={20}
                folder="trainers"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location & Sports */}
        <Card>
          <CardHeader>
            <CardTitle>Location & Sports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Select
                label="Area"
                value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
                error={errors.area}
                options={[
                  { value: '', label: 'Select Area' },
                  { value: 'north', label: 'North' },
                  { value: 'center', label: 'Center' },
                  { value: 'south', label: 'South' },
                ]}
                required
              />
            </div>

            {/* Related Sports */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Sports
              </label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() =>
                      formData.relatedSports.includes(sport.toLowerCase())
                        ? handleRemoveSport(sport.toLowerCase())
                        : handleAddSport(sport.toLowerCase())
                    }
                    className={`px-3 py-1 rounded ${
                      formData.relatedSports.includes(sport.toLowerCase())
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+972 50 123 4567"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="trainer@example.com"
              />
            </div>
            <Input
              label="Website"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://..."
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Instagram"
                value={formData.instagram}
                onChange={(e) => handleInputChange('instagram', e.target.value)}
                placeholder="@username"
              />
              <Input
                label="Facebook"
                value={formData.facebook}
                onChange={(e) => handleInputChange('facebook', e.target.value)}
                placeholder="username or URL"
              />
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="contactVisible"
                checked={formData.contactVisible}
                onChange={(e) => handleInputChange('contactVisible', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="contactVisible" className="text-sm font-medium text-gray-700">
                Make contact details visible to users
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Linked Skateparks */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Skateparks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Select skateparks this trainer is associated with
            </p>
            <Select
              label="Skateparks"
              value=""
              onChange={(e) => {
                if (e.target.value && !formData.linkedSkateparks.includes(e.target.value)) {
                  handleInputChange('linkedSkateparks', [...formData.linkedSkateparks, e.target.value]);
                }
              }}
              options={[
                { value: '', label: 'Select a skatepark' },
                // In real implementation, fetch from API
              ]}
            />
            {formData.linkedSkateparks.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {formData.linkedSkateparks.map((sp) => (
                    <span
                      key={sp}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                    >
                      {sp}
                      <button
                        type="button"
                        onClick={() =>
                          handleInputChange('linkedSkateparks', formData.linkedSkateparks.filter(s => s !== sp))
                        }
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
              <div className="flex items-center space-x-3 pt-8">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
                  Featured Trainer
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Input
                placeholder="Add a tag and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Private notes (not visible to public)"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}



