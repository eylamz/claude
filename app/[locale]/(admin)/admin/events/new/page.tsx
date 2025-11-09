'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';
import { ImageUploader } from '@/components/admin';

interface IEventImage {
  url: string;
  alt: { en: string; he: string };
  order: number;
  publicId: string;
}

interface ContentSection {
  id: string;
  type: 'intro' | 'heading' | 'paragraph' | 'bullet-list' | 'numbered-list' | 'image' | 'divider';
  content?: { en: string; he: string };
  heading?: { en: string; he: string };
  items?: { en: string[]; he: string[] };
  image?: string;
  alt?: { en: string; he: string };
}

type ContentSectionType = ContentSection['type'];

interface EventFormData {
  title: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  shortDescription: { en: string; he: string };
  
  // Date and time
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timezone: string;
  
  // Location
  locationType: 'skatepark' | 'custom';
  skateparkId: string;
  locationName: { en: string; he: string };
  locationAddress: { en: string; he: string };
  locationCoordinates: { lat: string; lng: string };
  venueUrl: string;
  
  // Event details
  relatedSports: string[];
  capacity: string;
  isFree: boolean;
  price: string;
  currency: string;
  registrationRequired: boolean;
  registrationUrl: string;
  
  // Dynamic content
  contentSections: ContentSection[];
  
  // Media
  featuredImage: string;
  galleryImages: IEventImage[];
  
  // Settings
  category: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isFeatured: boolean;
  isPublic: boolean;
  tags: string[];
  notes: string;
  
  // Meta
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
}

const CONTENT_SECTION_TYPES: { value: ContentSectionType; label: string }[] = [
  { value: 'intro', label: 'Introduction Text' },
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'bullet-list', label: 'Bullet List' },
  { value: 'numbered-list', label: 'Numbered List' },
  { value: 'image', label: 'Image' },
  { value: 'divider', label: 'Divider' },
];

const CATEGORIES = [
  { value: 'competition', label: 'Competition' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'jam', label: 'Jam' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'demo', label: 'Demo' },
  { value: 'other', label: 'Other' },
];

const SPORTS = [
  'Skateboarding',
  'BMX',
  'Scooter',
  'Longboarding',
  'Roller Skating',
  'Ski',
  'Snowboard',
];

const CURRENCIES = [
  { value: 'ILS', label: 'ILS (₪)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
];

export default function NewEventPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const draggedSectionRef = useRef<ContentSection | null>(null);

  const [formData, setFormData] = useState<EventFormData>({
    title: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    shortDescription: { en: '', he: '' },
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    isAllDay: false,
    timezone: 'Asia/Jerusalem',
    locationType: 'custom',
    skateparkId: '',
    locationName: { en: '', he: '' },
    locationAddress: { en: '', he: '' },
    locationCoordinates: { lat: '', lng: '' },
    venueUrl: '',
    relatedSports: [],
    capacity: '',
    isFree: true,
    price: '',
    currency: 'ILS',
    registrationRequired: false,
    registrationUrl: '',
    contentSections: [],
    featuredImage: '',
    galleryImages: [],
    category: '',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    status: 'draft',
    isFeatured: false,
    isPublic: true,
    tags: [],
    notes: '',
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
  });

  // Generate slug from title
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, title: { ...prev.title, [lang]: value } };
      // Auto-generate slug from English title
      if (lang === 'en' && (!prev.slug || prev.slug === generateSlug(prev.title.en))) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleLocationTypeChange = (type: 'skatepark' | 'custom') => {
    setFormData(prev => ({
      ...prev,
      locationType: type,
      skateparkId: type === 'skatepark' ? prev.skateparkId : '',
    }));
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

  const handleAddContentSection = (type: ContentSectionType) => {
    const newSection: ContentSection = {
      id: `section-${Date.now()}-${Math.random()}`,
      type,
      content: type === 'intro' || type === 'paragraph' ? { en: '', he: '' } : undefined,
      heading: type === 'heading' ? { en: '', he: '' } : undefined,
      items: type === 'bullet-list' || type === 'numbered-list' ? { en: [''], he: [''] } : undefined,
      image: type === 'image' ? '' : undefined,
      alt: type === 'image' ? { en: '', he: '' } : undefined,
    };

    setFormData(prev => ({
      ...prev,
      contentSections: [...prev.contentSections, newSection],
    }));
    setSelectedSection(newSection.id);
  };

  const handleUpdateContentSection = (id: string, updates: Partial<ContentSection>) => {
    setFormData(prev => ({
      ...prev,
      contentSections: prev.contentSections.map(section =>
        section.id === id ? { ...section, ...updates } : section
      ),
    }));
  };

  const handleRemoveContentSection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contentSections: prev.contentSections.filter(section => section.id !== id),
    }));
  };

  const handleAddListItem = (sectionId: string, _listType: 'bullet' | 'numbered') => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentSections: prev.contentSections.map(section =>
        section.id === sectionId && section.items
          ? {
              ...section,
              items: {
                ...section.items,
                [lang]: [...(section.items[lang] || []), ''],
              },
            }
          : section
      ),
    }));
  };

  const handleUpdateListItem = (
    sectionId: string,
    index: number,
    value: string,
    _listType: 'bullet' | 'numbered'
  ) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentSections: prev.contentSections.map(section =>
        section.id === sectionId && section.items
          ? {
              ...section,
              items: {
                ...section.items,
                [lang]: section.items[lang].map((item, i) => (i === index ? value : item)),
              },
            }
          : section
      ),
    }));
  };

  const handleRemoveListItem = (sectionId: string, index: number, _listType: 'bullet' | 'numbered') => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentSections: prev.contentSections.map(section =>
        section.id === sectionId && section.items
          ? {
              ...section,
              items: {
                ...section.items,
                [lang]: section.items[lang].filter((_, i) => i !== index),
              },
            }
          : section
      ),
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
    const formattedImages: IEventImage[] = images.map((img, index) => ({
      url: img.url,
      alt: { en: '', he: '' },
      order: index,
      publicId: img.publicId,
    }));
    setFormData(prev => ({ ...prev, galleryImages: formattedImages }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.en) newErrors['title.en'] = 'English title is required';
    if (!formData.title.he) newErrors['title.he'] = 'Hebrew title is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (!formData.startDate) newErrors['startDate'] = 'Start date is required';
    if (!formData.endDate) newErrors['endDate'] = 'End date is required';
    if (!formData.category) newErrors['category'] = 'Category is required';
    if (!formData.locationName.en) newErrors['locationName.en'] = 'English location name is required';
    if (!formData.locationName.he) newErrors['locationName.he'] = 'Hebrew location name is required';
    if (!formData.locationAddress.en) newErrors['locationAddress.en'] = 'English address is required';
    if (!formData.locationAddress.he) newErrors['locationAddress.he'] = 'Hebrew address is required';

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/${locale}/admin/events`);
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit()}>
            Save Draft
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Event'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{formData.title[activeTab] || 'Untitled Event'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Date:</strong> {formData.startDate} {!formData.isAllDay && formData.startTime}
                  {formData.endDate !== formData.startDate && ` - ${formData.endDate}`}
                </div>
                <div>
                  <strong>Location:</strong> {formData.locationName[activeTab]}
                </div>
                <div>
                  <strong>Description:</strong>
                  <p>{formData.description[activeTab]}</p>
                </div>
                {formData.contentSections.map((section) => (
                  <div key={section.id} className="border-l-4 border-blue-500 pl-4">
                    <RenderContentSection section={section} lang={activeTab} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Edit Mode */
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
                    activeTab === 'en'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('he')}
                  className={`px-4 py-2 font-medium ${
                    activeTab === 'he'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500'
                  }`}
                >
                  Hebrew
                </button>
              </div>

              {/* Title */}
              <div>
                <Input
                  label="Title"
                  value={formData.title[activeTab]}
                  onChange={(e) => handleTitleChange(activeTab, e.target.value)}
                  placeholder={activeTab === 'en' ? 'Event Title' : 'כותרת האירוע'}
                  error={errors[`title.${activeTab}`]}
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <Input
                  label="Slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="event-name"
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
                  placeholder={activeTab === 'en' ? 'Event description' : 'תיאור האירוע'}
                  required
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Description (for cards)
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
                <p className="mt-1 text-xs text-gray-500">
                  {formData.shortDescription[activeTab].length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Date and Time */}
          <Card>
            <CardHeader>
              <CardTitle>Date and Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    error={errors.startDate}
                    required
                  />
                </div>
                <div>
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    error={errors.endDate}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onChange={(e) => handleInputChange('isAllDay', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
                  All Day Event
                </label>
              </div>
              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Start Time"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="End Time"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Type
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleLocationTypeChange('custom')}
                    className={`px-4 py-2 rounded ${
                      formData.locationType === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Custom Location
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLocationTypeChange('skatepark')}
                    className={`px-4 py-2 rounded ${
                      formData.locationType === 'skatepark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Link to Skatepark
                  </button>
                </div>
              </div>

              {formData.locationType === 'custom' ? (
                <>
                  <div>
                    <Input
                      label="Location Name"
                      value={formData.locationName[activeTab]}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          locationName: { ...prev.locationName, [activeTab]: e.target.value },
                        }))
                      }
                      placeholder={activeTab === 'en' ? 'Venue name' : 'שם המקום'}
                      error={errors[`locationName.${activeTab}`]}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Address"
                      value={formData.locationAddress[activeTab]}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          locationAddress: { ...prev.locationAddress, [activeTab]: e.target.value },
                        }))
                      }
                      placeholder={activeTab === 'en' ? 'Street address' : 'כתובת'}
                      error={errors[`locationAddress.${activeTab}`]}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitude"
                      type="number"
                      step="0.000001"
                      value={formData.locationCoordinates.lat}
                      onChange={(e) =>
                        handleInputChange('locationCoordinates', {
                          ...formData.locationCoordinates,
                          lat: e.target.value,
                        })
                      }
                      placeholder="32.0853"
                    />
                    <Input
                      label="Longitude"
                      type="number"
                      step="0.000001"
                      value={formData.locationCoordinates.lng}
                      onChange={(e) =>
                        handleInputChange('locationCoordinates', {
                          ...formData.locationCoordinates,
                          lng: e.target.value,
                        })
                      }
                      placeholder="34.7818"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Select
                    label="Select Skatepark"
                    value={formData.skateparkId}
                    onChange={(e) => handleInputChange('skateparkId', e.target.value)}
                    options={[
                      { value: '', label: 'Select a skatepark' },
                      // In real implementation, fetch from API
                    ]}
                  />
                </div>
              )}

              <div>
                <Input
                  label="Venue URL (Optional)"
                  type="url"
                  value={formData.venueUrl}
                  onChange={(e) => handleInputChange('venueUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  error={errors.category}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...CATEGORIES,
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

              {/* Capacity */}
              <div>
                <Input
                  label="Max Capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Pricing */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(e) => handleInputChange('isFree', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isFree" className="text-sm font-medium text-gray-700">
                  Free Entry
                </label>
              </div>

              {!formData.isFree && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                  />
                  <Select
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    options={CURRENCIES}
                  />
                </div>
              )}

              {/* Registration */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="registrationRequired"
                  checked={formData.registrationRequired}
                  onChange={(e) => handleInputChange('registrationRequired', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="registrationRequired" className="text-sm font-medium text-gray-700">
                  Registration Required
                </label>
              </div>

              {formData.registrationRequired && (
                <div>
                  <Input
                    label="Registration URL"
                    type="url"
                    value={formData.registrationUrl}
                    onChange={(e) => handleInputChange('registrationUrl', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Organizer Info */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Organizer Name"
                  value={formData.organizerName}
                  onChange={(e) => handleInputChange('organizerName', e.target.value)}
                  placeholder="John Doe"
                />
                <Input
                  label="Organizer Email"
                  type="email"
                  value={formData.organizerEmail}
                  onChange={(e) => handleInputChange('organizerEmail', e.target.value)}
                  placeholder="john@example.com"
                />
                <Input
                  label="Organizer Phone"
                  type="tel"
                  value={formData.organizerPhone}
                  onChange={(e) => handleInputChange('organizerPhone', e.target.value)}
                  placeholder="+972 50 123 4567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Content Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Builder</CardTitle>
                <Dropdown
                  trigger={
                    <Button variant="secondary" size="sm">+ Add Section</Button>
                  }
                  options={CONTENT_SECTION_TYPES.map(type => ({
                    label: type.label,
                    value: type.value,
                    onClick: () => handleAddContentSection(type.value),
                  }))}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.contentSections.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No content sections yet. Click "+ Add Section" to get started.
                </div>
              ) : (
                formData.contentSections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`border-2 rounded-lg p-4 ${
                      selectedSection === section.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300'
                    }`}
                    draggable
                    onDragStart={() => {
                      draggedSectionRef.current = section;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedSectionRef.current && draggedSectionRef.current.id !== section.id) {
                        const sections = [...formData.contentSections];
                        const draggedIndex = sections.findIndex(s => s.id === draggedSectionRef.current!.id);
                        const targetIndex = sections.findIndex(s => s.id === section.id);
                        sections.splice(draggedIndex, 1);
                        sections.splice(targetIndex, 0, draggedSectionRef.current);
                        handleInputChange('contentSections', sections);
                      }
                      draggedSectionRef.current = null;
                    }}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{index + 1}.</span>
                        <span className="text-sm font-medium text-gray-700">
                          {CONTENT_SECTION_TYPES.find(t => t.value === section.type)?.label}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveContentSection(section.id);
                        }}
                      >
                        Remove
                      </Button>
                    </div>

                    {/* Section Editor */}
                    {selectedSection === section.id && (
                      <div className="space-y-3 mt-3">
                        {section.type === 'intro' || section.type === 'paragraph' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Content ({activeTab.toUpperCase()})
                            </label>
                            <textarea
                              value={section.content?.[activeTab] || ''}
                              onChange={(e) =>
                                handleUpdateContentSection(section.id, {
                                  content: { ...section.content, [activeTab]: e.target.value },
                                })
                              }
                              rows={section.type === 'intro' ? 2 : 4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={activeTab === 'en' ? 'Enter content...' : 'הכנס תוכן...'}
                            />
                          </div>
                        ) : section.type === 'heading' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Heading ({activeTab.toUpperCase()})
                            </label>
                            <Input
                              value={section.heading?.[activeTab] || ''}
                              onChange={(e) =>
                                handleUpdateContentSection(section.id, {
                                  heading: { ...section.heading, [activeTab]: e.target.value },
                                })
                              }
                              placeholder={activeTab === 'en' ? 'Enter heading...' : 'הכנס כותרת...'}
                            />
                          </div>
                        ) : section.type === 'bullet-list' || section.type === 'numbered-list' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              List Items ({activeTab.toUpperCase()})
                            </label>
                            <div className="space-y-2">
                              {(section.items?.[activeTab] || []).map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-center space-x-2">
                                  <Input
                                    value={item}
                                    onChange={(e) =>
                                      handleUpdateListItem(section.id, itemIndex, e.target.value, 'bullet')
                                    }
                                    placeholder={activeTab === 'en' ? 'Item text...' : 'טקסט פריט...'}
                                  />
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveListItem(section.id, itemIndex, 'bullet')
                                    }
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAddListItem(section.id, 'bullet')}
                              >
                                + Add Item
                              </Button>
                            </div>
                          </div>
                        ) : section.type === 'image' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Image URL
                            </label>
                            <Input
                              value={section.image || ''}
                              onChange={(e) =>
                                handleUpdateContentSection(section.id, { image: e.target.value })
                              }
                              placeholder="https://..."
                            />
                            <div className="mt-2">
                              <Input
                                label="Alt Text"
                                value={section.alt?.[activeTab] || ''}
                                onChange={(e) =>
                                  handleUpdateContentSection(section.id, {
                                    alt: { ...section.alt, [activeTab]: e.target.value },
                                  })
                                }
                                placeholder={activeTab === 'en' ? 'Image description' : 'תיאור תמונה'}
                              />
                            </div>
                            {section.image && (
                              <div className="mt-3">
                                <img
                                  src={section.image}
                                  alt={section.alt?.[activeTab] || ''}
                                  className="max-w-full h-48 object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                        ) : section.type === 'divider' ? (
                          <div className="text-gray-500 text-sm italic">
                            Divider - no configuration needed
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Image
                </label>
                <Input
                  type="url"
                  value={formData.featuredImage}
                  onChange={(e) => handleInputChange('featuredImage', e.target.value)}
                  placeholder="https://..."
                />
                {formData.featuredImage && (
                  <div className="mt-3">
                    <img
                      src={formData.featuredImage}
                      alt="Featured"
                      className="max-w-full h-64 object-cover rounded"
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
                  folder="events"
                />
              </div>
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
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'completed', label: 'Completed' },
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
                    Featured Event
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                  Public Event
                </label>
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
      )}
    </div>
  );
}

// Helper component to render content sections in preview
function RenderContentSection({ section, lang }: { section: ContentSection; lang: 'en' | 'he' }) {
  switch (section.type) {
    case 'intro':
    case 'paragraph':
      return <p className="text-lg">{section.content?.[lang] || ''}</p>;
    case 'heading':
      return <h2 className="text-2xl font-bold">{section.heading?.[lang] || ''}</h2>;
    case 'bullet-list':
      return (
        <ul className="list-disc pl-5">
          {(section.items?.[lang] || []).filter(Boolean).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'numbered-list':
      return (
        <ol className="list-decimal pl-5">
          {(section.items?.[lang] || []).filter(Boolean).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case 'image':
      return section.image ? <img src={section.image} alt={section.alt?.[lang] || ''} className="rounded" /> : null;
    case 'divider':
      return <hr className="border-gray-300" />;
    default:
      return null;
  }
}

