'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, Toaster } from '@/components/ui';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSkateparkSlugOptions } from '@/hooks/use-skatepark-slug-options';
import { EventContentBuilder, ImageUploader, type EventSectionForm } from '@/components/admin';

interface EventMediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  cloudinaryId?: string;
  altText: { en: string; he: string };
  caption?: { en: string; he: string };
  usedInSections?: string[];
}

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
    url?: string;
    coordinates?: { lat: number; lng: number };
    isSkatepark?: boolean;
    skateparkSlug?: string;
  };
  featuredImage: {
    url: string;
    cloudinaryId: string;
    altText: { en: string; he: string };
  };
  videoUrl: string;
  relatedSports: string[];
  type: string;
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
  registrationClosesAt: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isFeatured: boolean;
  isPublic: boolean;
  registrationRequired: boolean;
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
  metaKeywords: { en: string; he: string };
  tags: string[];
  notes: string;
  sections: { en: EventSectionForm[]; he: EventSectionForm[] };
  media: EventMediaItem[];
}

const SPORTS = [
  'Roller',
  'Skate',
  'Scoot',
  'BMX',
  'Longboard',
];

const EVENT_TYPES = [
  'competition',
  'session',
  'camp',
  'premiere',
  'jam',
];

export default function NewEventPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedMediaId, setExpandedMediaId] = useState<string | null>(null);
  const { toast } = useToast();
  const skateparkSlugOptions = useSkateparkSlugOptions();

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
      url: '',
      coordinates: { lat: undefined as number | undefined, lng: undefined as number | undefined },
      isSkatepark: false,
      skateparkSlug: '',
    },
    featuredImage: {
      url: '',
      cloudinaryId: '',
      altText: { en: '', he: '' },
    },
    videoUrl: '',
    relatedSports: [],
    type: '',
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
    registrationClosesAt: '',
    status: 'draft',
    isFeatured: false,
    isPublic: true,
    registrationRequired: false,
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
    metaKeywords: { en: '', he: '' },
    tags: [],
    notes: '',
    sections: { en: [], he: [] },
    media: [],
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, title: { ...prev.title, [lang]: value } };
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
    if (!formData.type) newErrors['type'] = 'Event type is required';
    if (!formData.organizer.name) newErrors['organizer.name'] = 'Organizer name is required';
    if (!formData.organizer.email) newErrors['organizer.email'] = 'Organizer email is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent, saveAsDraft: boolean = false) => {
    if (e) e.preventDefault();
    
    if (!saveAsDraft && !validate()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const sectionsForApi = {
        en: (formData.sections?.en || []).map(({ id, ...s }) => s),
        he: (formData.sections?.he || []).map(({ id, ...s }) => s),
      };
      const mediaForApi = (formData.media || []).map((m) => ({
        ...m,
        altText: { en: m.altText?.en ?? '', he: m.altText?.he ?? '' },
        caption: { en: m.caption?.en ?? '', he: m.caption?.he ?? '' },
        usedInSections: m.usedInSections || [],
      }));
      const submitData = {
        ...formData,
        sections: sectionsForApi,
        media: mediaForApi,
        relatedSports: Array.isArray(formData.relatedSports) ? formData.relatedSports : [],
        capacity: formData.capacity === '' ? undefined : formData.capacity,
        price: formData.price === '' ? undefined : formData.price,
        status: saveAsDraft ? 'draft' : 'published',
      };

      // DEBUG relatedSports (remove when done)
      console.log('[New Event] Sending relatedSports:', submitData.relatedSports);

      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      await response.json();

      if (saveAsDraft) {
        toast({
          title: 'Success',
          description: 'Draft saved successfully!',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Event published successfully!',
          variant: 'success',
        });
        setTimeout(() => {
          router.push(`/${locale}/admin/events`);
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save event',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Toaster />
      {/* Header */}
      <div className="pt-16 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Create New Event</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="red" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="orange" onClick={(e) => {
            e.preventDefault();
            handleSubmit(undefined, true);
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button type="button" variant="green" onClick={(e) => {
            e.preventDefault();
            handleSubmit();
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Event'}
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
            <div className="space-y-4">
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                Featured Image
              </label>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-2">
                Upload to Cloudinary (EventAssets folder) or paste URL/Cloudinary ID below.
              </p>
              <ImageUploader
                images={formData.featuredImage.url ? [{ url: formData.featuredImage.url, publicId: formData.featuredImage.cloudinaryId || formData.featuredImage.url, alt: formData.featuredImage.altText.en }] : []}
                onUpload={(uploaded) => {
                  if (uploaded.length > 0) {
                    setFormData(prev => ({
                      ...prev,
                      featuredImage: {
                        ...prev.featuredImage,
                        url: uploaded[0].url,
                        cloudinaryId: uploaded[0].publicId,
                      },
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      featuredImage: { ...prev.featuredImage, url: '', cloudinaryId: '' },
                    }));
                  }
                }}
                maxImages={1}
                folder="eventAssets"
              />
              <Input
                type="url"
                label="Image URL (or use upload above)"
                value={formData.featuredImage.url}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    featuredImage: { ...prev.featuredImage, url: e.target.value },
                  }))
                }
                placeholder="https://..."
              />
              <Input
                label="Cloudinary ID"
                value={formData.featuredImage.cloudinaryId}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    featuredImage: { ...prev.featuredImage, cloudinaryId: e.target.value },
                  }))
                }
                placeholder="e.g. events/OferSeshRoseStretch"
              />
              <Input
                label="Alt text (English)"
                value={formData.featuredImage.altText.en}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    featuredImage: {
                      ...prev.featuredImage,
                      altText: { ...prev.featuredImage.altText, en: e.target.value },
                    },
                  }))
                }
                placeholder="e.g. Ofer's Sesh - Memorial Competition"
              />
              <Input
                label="Alt text (Hebrew)"
                value={formData.featuredImage.altText.he}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    featuredImage: {
                      ...prev.featuredImage,
                      altText: { ...prev.featuredImage.altText, he: e.target.value },
                    },
                  }))
                }
                placeholder="e.g. הסשן של עופר - תחרות זיכרון"
              />
              {formData.featuredImage.url && (
                <div className="mt-3">
                  <img
                    src={formData.featuredImage.url}
                    alt={formData.featuredImage.altText.en || formData.featuredImage.altText.he || 'Featured preview'}
                    className="max-w-full h-48 object-cover rounded"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content (sections) */}
        <EventContentBuilder
          sections={formData.sections}
          activeTab={activeTab}
          onSectionsChange={(sections) => setFormData((prev) => ({ ...prev, sections }))}
          onActiveTabChange={(tab) => setActiveTab(tab)}
        />

        {/* Media */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Media</CardTitle>
              <Button
                type="button"
                variant="gray"
                onClick={() => {
                  const newItem: EventMediaItem = {
                    id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    url: '',
                    type: 'image',
                    cloudinaryId: '',
                    altText: { en: '', he: '' },
                    caption: { en: '', he: '' },
                    usedInSections: [],
                  };
                  setFormData((prev) => ({ ...prev, media: [...(prev.media || []), newItem] }));
                  setExpandedMediaId(newItem.id);
                }}
              >
                + Add media
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark mb-2">
                Upload images to Cloudinary (EventAssets folder). Each upload is added as a new media item.
              </p>
              <ImageUploader
                images={[]}
                onUpload={(uploaded) => {
                  const newItems: EventMediaItem[] = uploaded.map((img) => ({
                    id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    url: img.url,
                    type: 'image',
                    cloudinaryId: img.publicId,
                    altText: { en: img.alt || '', he: '' },
                    caption: { en: '', he: '' },
                    usedInSections: [],
                  }));
                  setFormData((prev) => ({ ...prev, media: [...(prev.media || []), ...newItems] }));
                  if (newItems.length > 0) setExpandedMediaId(newItems[0].id);
                }}
                maxImages={20}
                folder="eventAssets"
              />
            </div>
            {(!formData.media || formData.media.length === 0) ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No media items. Upload above or add one manually below.</p>
            ) : (
              formData.media.map((m, index) => (
                <div
                  key={m.id}
                  className={`rounded-lg border p-4 transition-all ${
                    expandedMediaId === m.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left"
                      onClick={() => setExpandedMediaId(expandedMediaId === m.id ? null : m.id)}
                    >
                      <span className="text-sm font-medium">
                        {m.type === 'video' ? '🎥' : '🖼️'} Media {index + 1}
                        {m.url ? ` · ${m.url.slice(0, 40)}...` : ' (no URL)'}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="red"
                      size="sm"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, media: (prev.media || []).filter((x) => x.id !== m.id) }));
                        if (expandedMediaId === m.id) setExpandedMediaId(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                  {expandedMediaId === m.id && (
                    <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Input
                        label="URL"
                        type="url"
                        value={m.url}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) => (x.id === m.id ? { ...x, url: e.target.value } : x)),
                          }))
                        }
                        placeholder="https://..."
                      />
                      <Input
                        label="Cloudinary ID"
                        value={m.cloudinaryId || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) => (x.id === m.id ? { ...x, cloudinaryId: e.target.value } : x)),
                          }))
                        }
                      />
                      <Input
                        label="Alt text (EN)"
                        value={m.altText?.en ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) =>
                              x.id === m.id ? { ...x, altText: { ...x.altText, en: e.target.value } } : x
                            ),
                          }))
                        }
                      />
                      <Input
                        label="Alt text (HE)"
                        value={m.altText?.he ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) =>
                              x.id === m.id ? { ...x, altText: { ...x.altText, he: e.target.value } } : x
                            ),
                          }))
                        }
                        dir="rtl"
                      />
                      <Input
                        label="Caption (EN)"
                        value={m.caption?.en ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) =>
                              x.id === m.id ? { ...x, caption: { ...(x.caption || { en: '', he: '' }), en: e.target.value } } : x
                            ),
                          }))
                        }
                      />
                      <Input
                        label="Caption (HE)"
                        value={m.caption?.he ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            media: (prev.media || []).map((x) =>
                              x.id === m.id ? { ...x, caption: { ...(x.caption || { en: '', he: '' }), he: e.target.value } } : x
                            ),
                          }))
                        }
                        dir="rtl"
                      />
                      {m.url && (
                        <div className="mt-2">
                          <img src={m.url} alt={m.altText?.en || m.altText?.he || ''} className="max-h-32 object-contain rounded" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
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
                value={formData.location.address?.en ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, address: { ...(prev.location.address || { en: '', he: '' }), en: e.target.value } },
                  }))
                }
                rows={2}
              />
            </div>
            <div>
              <Textarea
                label="Address (HE)"
                value={formData.location.address?.he ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, address: { ...(prev.location.address || { en: '', he: '' }), he: e.target.value } },
                  }))
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                step="any"
                label="Latitude"
                value={formData.location.coordinates?.lat ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      coordinates: {
                        ...(prev.location.coordinates || { lat: undefined, lng: undefined }),
                        lat: v === '' ? undefined : Number(v),
                      },
                    },
                  }));
                }}
                placeholder="e.g. 31.7683"
              />
              <Input
                type="number"
                step="any"
                label="Longitude"
                value={formData.location.coordinates?.lng ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      coordinates: {
                        ...(prev.location.coordinates || { lat: undefined, lng: undefined }),
                        lng: v === '' ? undefined : Number(v),
                      },
                    },
                  }));
                }}
                placeholder="e.g. 35.2137"
              />
            </div>
            <div className="pt-2">
              <Checkbox
                variant="brand"
                id="locationIsSkatepark"
                checked={formData.location.isSkatepark ?? false}
                onChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    location: {
                      ...prev.location,
                      isSkatepark: checked,
                      ...(checked ? {} : { skateparkSlug: '', url: prev.location.url?.startsWith('http') ? prev.location.url : '' }),
                    },
                  }))
                }
                label="Location is a skatepark (link to park page instead of Maps)"
              />
            </div>
            {formData.location.isSkatepark ? (
              <div>
                <datalist id="skateparks-slug-datalist-new">
                  {skateparkSlugOptions.map((slug) => (
                    <option key={slug} value={slug} />
                  ))}
                </datalist>
                <Input
                  list="skateparks-slug-datalist-new"
                  label="Skatepark slug"
                  value={formData.location.skateparkSlug ?? ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      location: { ...prev.location, skateparkSlug: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') },
                    }))
                  }
                  placeholder="e.g. beer-sheva"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Event location link will be /[locale]/skateparks/[slug]. Public page will show &quot;Show skatepark details&quot; instead of &quot;Open in Maps&quot;. Suggestions from skateparks_cache (localStorage).
                </p>
              </div>
            ) : (
              <div>
                <Input
                  type="url"
                  label="Location URL (e.g. Google Maps)"
                  value={formData.location.url ?? ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      location: { ...prev.location, url: e.target.value },
                    }))
                  }
                  placeholder="https://maps.google.com/?q=31.7683,35.2137"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                Event type
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {EVENT_TYPES.map((eventType) => (
                  <Button
                    variant={formData.type === eventType ? 'blue' : 'gray'}
                    key={eventType}
                    type="button"
                    onClick={() => handleInputChange('type', eventType)}
                    className={`px-3 py-1 rounded`}
                  >
                    {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                  </Button>
                ))}
              </div>
              {errors.type && (
                <p className="text-sm text-red-500 mt-1">{errors.type}</p>
              )}
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
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use the site&apos;s signup form (public page will link to /events/[slug]/signup).
              </p>
            </div>

            <div>
              <Input
                type="datetime-local"
                label="Registration closes at (Optional)"
                value={formData.registrationClosesAt}
                onChange={(e) => handleInputChange('registrationClosesAt', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                After this date and time, registration is closed even if the event has not started yet. Leave empty for no limit.
              </p>
            </div>

            <div className="pt-2">
              <Checkbox
                variant="brand"
                id="registrationRequired"
                checked={formData.registrationRequired}
                onChange={(checked) => handleInputChange('registrationRequired', checked)}
                label="Registration Required"
              />
              <p className="text-xs text-muted-foreground mt-1">
                When checked, the public event page shows a &quot;Register Now&quot; button linking to the signup form (or the URL above if set).
              </p>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray dark:text-gray-dark">Settings & SEO</CardTitle>
              <div className="flex items-center gap-2 bg-gray-bg dark:bg-gray-bg-dark px-3 py-1.5 rounded-lg border border-gray-border dark:border-gray-border-dark">
                <span className="text-xs font-semibold text-gray dark:text-gray-dark">Editing:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeTab === 'en' ? 'blue' : 'gray'}
                    type="button"
                    onClick={() => setActiveTab('en')}
                    className="!rounded text-xs font-medium"
                  >
                    English
                  </Button>
                  <Button
                    variant={activeTab === 'he' ? 'blue' : 'gray'}
                    type="button"
                    onClick={() => setActiveTab('he')}
                    className="!rounded text-xs font-medium"
                    dir="rtl"
                  >
                    עברית
                  </Button>
                </div>
              </div>
            </div>
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
              <Input
                label="Meta Keywords"
                value={formData.metaKeywords[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaKeywords: { ...prev.metaKeywords, [activeTab]: e.target.value },
                  }))
                }
                placeholder={activeTab === 'en' ? 'SEO keywords (comma-separated)' : 'מילות מפתח SEO'}
              />
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
