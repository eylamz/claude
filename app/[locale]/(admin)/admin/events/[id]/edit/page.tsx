'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, Toaster, Skeleton } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface EventFormData {
  title: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  shortDescription: { en: string; he: string };
  startDate: string;
  endDate: string;
  timezone: string;
  isAllDay: boolean;
  location: {
    name: { en: string; he: string };
    address: { en: string; he: string };
  };
  featuredImage: string;
  videoUrl: string;
  relatedSports: string[];
  category: string;
  organizer: {
    name: string;
    email: string;
    phone: string;
  };
  capacity: number | '';
  isFree: boolean;
  price: number | '';
  currency: string;
  registrationUrl: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isFeatured: boolean;
  isPublic: boolean;
  registrationRequired: boolean;
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
  tags: string[];
  notes: string;
}

const SPORTS = [
  'Roller',
  'Skate',
  'Scoot',
  'BMX',
  'Longboard',
];

const CATEGORIES = [
  'Competition',
  'Workshop',
  'Jam',
  'Tournament',
  'Meetup',
  'Demo',
  'Other',
];

export default function EditEventPage() {
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastSavedDataRef = useRef<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<EventFormData>({
    title: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    shortDescription: { en: '', he: '' },
    startDate: '',
    endDate: '',
    timezone: 'Asia/Jerusalem',
    isAllDay: false,
    location: {
      name: { en: '', he: '' },
      address: { en: '', he: '' },
    },
    featuredImage: '',
    videoUrl: '',
    relatedSports: [],
    category: '',
    organizer: {
      name: '',
      email: '',
      phone: '',
    },
    capacity: '',
    isFree: true,
    price: '',
    currency: 'ILS',
    registrationUrl: '',
    status: 'draft',
    isFeatured: false,
    isPublic: true,
    registrationRequired: false,
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
    tags: [],
    notes: '',
  });

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/admin/events/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Event not found');
          }
          throw new Error('Failed to fetch event');
        }

        const data = await response.json();
        const event = data.event;

        // Format dates for datetime-local input
        const formatDateForInput = (date: string | Date) => {
          if (!date) return '';
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setFormData({
          title: event.title || { en: '', he: '' },
          slug: event.slug || '',
          description: event.description || { en: '', he: '' },
          shortDescription: event.shortDescription || { en: '', he: '' },
          startDate: formatDateForInput(event.startDate),
          endDate: formatDateForInput(event.endDate),
          timezone: event.timezone || 'Asia/Jerusalem',
          isAllDay: event.isAllDay || false,
          location: event.location || {
            name: { en: '', he: '' },
            address: { en: '', he: '' },
          },
          featuredImage: event.featuredImage || '',
          videoUrl: event.videoUrl || '',
          relatedSports: event.relatedSports || [],
          category: event.category || '',
          organizer: event.organizer || {
            name: '',
            email: '',
            phone: '',
          },
          capacity: event.capacity || '',
          isFree: event.isFree !== undefined ? event.isFree : true,
          price: event.price || '',
          currency: event.currency || 'ILS',
          registrationUrl: event.registrationUrl || '',
          status: event.status || 'draft',
          isFeatured: event.isFeatured || false,
          isPublic: event.isPublic !== undefined ? event.isPublic : true,
          registrationRequired: event.registrationRequired || false,
          metaTitle: event.metaTitle || { en: '', he: '' },
          metaDescription: event.metaDescription || { en: '', he: '' },
          tags: event.tags || [],
          notes: event.notes || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load event');
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  // Track page visibility to avoid auto-saving when tab is in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Track initial form data after load
  useEffect(() => {
    if (formData.slug && !lastSavedDataRef.current) {
      lastSavedDataRef.current = JSON.stringify(formData);
    }
  }, [formData.slug]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!id || !formData.slug || isSubmitting || !isPageVisible) {
      return;
    }
    
    const currentDataString = JSON.stringify(formData);
    if (lastSavedDataRef.current === currentDataString) {
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        capacity: formData.capacity === '' ? undefined : formData.capacity,
        price: formData.price === '' ? undefined : formData.price,
      };

      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setLastSaved(new Date());
        lastSavedDataRef.current = currentDataString;
        console.log('Auto-saved event');
      }
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  }, [formData, id, isSubmitting, isPageVisible]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoSave]);

  const handleTitleChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => ({ ...prev, title: { ...prev.title, [lang]: value } }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleAddSport = (sport: string) => {
    if (!formData.relatedSports.includes(sport.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        relatedSports: [...prev.relatedSports, sport.toLowerCase()],
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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.en) newErrors['title.en'] = 'English title is required';
    if (!formData.title.he) newErrors['title.he'] = 'Hebrew title is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (!formData.startDate) newErrors['startDate'] = 'Start date is required';
    if (!formData.endDate) newErrors['endDate'] = 'End date is required';
    if (!formData.location.name.en) newErrors['location.name.en'] = 'Location name (EN) is required';
    if (!formData.location.name.he) newErrors['location.name.he'] = 'Location name (HE) is required';
    if (!formData.category) newErrors['category'] = 'Category is required';
    if (!formData.organizer.name) newErrors['organizer.name'] = 'Organizer name is required';
    if (!formData.organizer.email) newErrors['organizer.email'] = 'Organizer email is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const submitData = {
        ...formData,
        capacity: formData.capacity === '' ? undefined : formData.capacity,
        price: formData.price === '' ? undefined : formData.price,
        status: formData.status || 'draft',
      };

      const response = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save event');
      }

      const data = await response.json();
      console.log('Event saved successfully:', data);
      setLastSaved(new Date());
      const submitDataString = JSON.stringify(submitData);
      lastSavedDataRef.current = submitDataString;
      
      const statusMessage = formData.status === 'published' ? 'published' : 'saved';
      toast({
        title: 'Success',
        description: `Event ${statusMessage} successfully!`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error submitting:', error);
      const errorMessage = error.message || 'Failed to save event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !formData.slug) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text dark:text-text-dark">Edit Event</h1>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
          <Button variant="gray" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="pt-16 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Edit Event</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
            {error && <span className="text-red-500 ml-2">{error}</span>}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="red" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="green" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Event'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray dark:text-gray-dark">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs */}
            <div className="flex space-x-2 border-b">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'en'
                    ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                    : 'text-text-secondary dark:text-text-secondary-dark'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('he')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'he'
                    ? 'border-b-2 border-blue-border dark:border-blue-border-dark text-blue dark:text-blue-dark'
                    : 'text-text-secondary dark:text-text-secondary-dark'
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
                placeholder="event-slug"
                error={errors.slug}
                required
              />
            </div>

            {/* Short Description */}
            <div>
              <Textarea
                label="Short Description"
                value={formData.shortDescription[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    shortDescription: { ...prev.shortDescription, [activeTab]: e.target.value },
                  }))
                }
                rows={2}
                placeholder={activeTab === 'en' ? 'Brief description' : 'תיאור קצר'}
              />
            </div>

            {/* Description */}
            <div>
              <Textarea
                label="Description"
                value={formData.description[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, [activeTab]: e.target.value },
                  }))
                }
                rows={6}
                placeholder={activeTab === 'en' ? 'Event description' : 'תיאור האירוע'}
                error={errors[`description.${activeTab}`]}
                required
              />
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                Featured Image URL
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
                    alt="Featured preview"
                    className="max-w-full h-48 object-cover rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle>Date & Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="datetime-local"
                  label="Start Date & Time"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  error={errors.startDate}
                  required
                />
              </div>
              <div>
                <Input
                  type="datetime-local"
                  label="End Date & Time"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  error={errors.endDate}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SelectWrapper
                  label="Timezone"
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  options={[
                    { value: 'Asia/Jerusalem', label: 'Asia/Jerusalem' },
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'America/New_York' },
                    { value: 'Europe/London', label: 'Europe/London' },
                  ]}
                />
              </div>
              <div className="pt-8">
                <Checkbox
                  variant="brand"
                  id="isAllDay"
                  checked={formData.isAllDay}
                  onChange={(checked) => handleInputChange('isAllDay', checked)}
                  label="All Day Event"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Location Name (EN)"
                value={formData.location.name.en}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, name: { ...prev.location.name, en: e.target.value } },
                  }))
                }
                error={errors['location.name.en']}
                required
              />
            </div>
            <div>
              <Input
                label="Location Name (HE)"
                value={formData.location.name.he}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, name: { ...prev.location.name, he: e.target.value } },
                  }))
                }
                error={errors['location.name.he']}
                required
              />
            </div>
            <div>
              <Textarea
                label="Address (EN)"
                value={formData.location.address.en}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, address: { ...prev.location.address, en: e.target.value } },
                  }))
                }
                rows={2}
              />
            </div>
            <div>
              <Textarea
                label="Address (HE)"
                value={formData.location.address.he}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, address: { ...prev.location.address, he: e.target.value } },
                  }))
                }
                rows={2}
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
              <SelectWrapper
                label="Category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  ...CATEGORIES.map(c => ({ value: c, label: c }))
                ]}
                error={errors.category}
                required
              />
            </div>

            {/* Related Sports */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                Related Sports
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SPORTS.map((sport) => (
                  <Button
                    variant={formData.relatedSports.includes(sport.toLowerCase()) ? 'blue' : 'gray'}
                    key={sport}
                    type="button"
                    onClick={() =>
                      formData.relatedSports.includes(sport.toLowerCase())
                        ? handleRemoveSport(sport.toLowerCase())
                        : handleAddSport(sport.toLowerCase())
                    }
                    className={`px-3 py-1 rounded`}
                  >
                    {sport}
                  </Button>
                ))}
              </div>
              {formData.relatedSports.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.relatedSports.map((sport) => (
                    <Button
                      variant="blue"
                      key={sport}
                      onClick={() => handleRemoveSport(sport)}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                    >
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      <p className="ms-2">×</p>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Organizer */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Organizer</h3>
              <Input
                label="Organizer Name"
                value={formData.organizer.name}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    organizer: { ...prev.organizer, name: e.target.value },
                  }))
                }
                error={errors['organizer.name']}
                required
              />
              <Input
                type="email"
                label="Organizer Email"
                value={formData.organizer.email}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    organizer: { ...prev.organizer, email: e.target.value },
                  }))
                }
                error={errors['organizer.email']}
                required
              />
              <Input
                type="tel"
                label="Organizer Phone"
                value={formData.organizer.phone}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    organizer: { ...prev.organizer, phone: e.target.value },
                  }))
                }
              />
            </div>

            {/* Capacity & Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="number"
                  label="Capacity (Optional)"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value === '' ? '' : parseInt(e.target.value))}
                  min={1}
                />
              </div>
              <div className="pt-8">
                <Checkbox
                  variant="brand"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(checked) => handleInputChange('isFree', checked)}
                  label="Free Event"
                />
              </div>
            </div>

            {!formData.isFree && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    type="number"
                    label="Price"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div>
                  <SelectWrapper
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    options={[
                      { value: 'ILS', label: 'ILS (₪)' },
                      { value: 'USD', label: 'USD ($)' },
                      { value: 'EUR', label: 'EUR (€)' },
                    ]}
                  />
                </div>
              </div>
            )}

            <div>
              <Input
                type="url"
                label="Registration URL (Optional)"
                value={formData.registrationUrl}
                onChange={(e) => handleInputChange('registrationUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="pt-2">
              <Checkbox
                variant="brand"
                id="registrationRequired"
                checked={formData.registrationRequired}
                onChange={(checked) => handleInputChange('registrationRequired', checked)}
                label="Registration Required"
              />
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="url"
                label="Video URL (Optional)"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <Button
                  variant="purple"
                  key={tag}
                  onClick={() => handleRemoveTag(tag)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                >
                  {tag}
                  <p className="ms-2">×</p>
                </Button>
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
          </CardContent>
        </Card>

        {/* Settings & SEO */}
        <Card>
          <CardHeader>
            <CardTitle>Settings & SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Status</label>
                <SelectWrapper
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'published', label: 'Published' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                />
              </div>
              <div className="pt-8 space-y-2">
                <Checkbox
                  variant="brand"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(checked) => handleInputChange('isFeatured', checked)}
                  label="Featured Event"
                />
                <Checkbox
                  variant="brand"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(checked) => handleInputChange('isPublic', checked)}
                  label="Public Event"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Input
                label="Meta Title"
                value={formData.metaTitle[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaTitle: { ...prev.metaTitle, [activeTab]: e.target.value },
                  }))
                }
                placeholder={activeTab === 'en' ? 'SEO title' : 'כותרת SEO'}
                maxLength={70}
              />
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{formData.metaTitle[activeTab].length}/70 characters</p>
            </div>

            <div className="space-y-2">
              <Textarea
                label="Meta Description"
                value={formData.metaDescription[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaDescription: { ...prev.metaDescription, [activeTab]: e.target.value },
                  }))
                }
                rows={3}
                placeholder={activeTab === 'en' ? 'SEO description' : 'תיאור SEO'}
                maxLength={160}
              />
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">{formData.metaDescription[activeTab].length}/160 characters</p>
            </div>

            <div>
              <Textarea
                label="Notes (Internal)"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                placeholder="Internal notes (not visible to public)"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
