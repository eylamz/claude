'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, SelectWrapper, SegmentedControls, Toaster } from '@/components/ui';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUploader } from '@/components/admin';
import { useToast } from '@/hooks/use-toast';

interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'list' | 'image' | 'video' | 'link' | 'code' | 'divider';
  order: number;
  text?: string;
  heading?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  listType?: 'bullet' | 'numbered';
  listItems?: Array<{ title: string; content: string }>;
  imageUrl?: string;
  imageCaption?: string;
  imageAlt?: string;
  imageLinkUrl?: string;
  imageLinkExternal?: boolean;
  videoUrl?: string;
  videoTitle?: string;
  linkText?: string;
  linkUrl?: string;
  linkExternal?: boolean;
  code?: string;
  language?: string;
}

type ContentBlockType = ContentBlock['type'];

interface GuideFormData {
  title: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  coverImage: string;
  relatedSports: string[];
  tags: { en: string[]; he: string[] };
  contentBlocks: { en: ContentBlock[]; he: ContentBlock[] };
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
  metaKeywords: { en: string; he: string };
}

const CONTENT_BLOCK_TYPES: { value: ContentBlockType; label: string; icon: string }[] = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'heading', label: 'Heading', icon: '📌' },
  { value: 'list', label: 'List', icon: '📋' },
  { value: 'image', label: 'Image', icon: '🖼️' },
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'code', label: 'Code Block', icon: '💻' },
  { value: 'divider', label: 'Divider', icon: '─' },
];

const SPORTS = [
  'Roller',
  'Skate',
  'Scoot',
  'BMX',
  'Longboard',
];

const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'php',
  'ruby',
  'go',
  'rust',
  'html',
  'css',
  'json',
  'markdown',
  'sql',
  'bash',
  'other',
];

export default function NewGuidePage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  
  // Reset selected block when switching languages to ensure clean separation
  const handleTabChange = (tab: 'en' | 'he') => {
    setActiveTab(tab);
    setSelectedBlock(null); // Clear selection when switching languages
  };
  
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const draggedBlockRef = useRef<ContentBlock | null>(null);
  
  // Toast hook
  const { toast } = useToast();
  const [draggedOverId, setDraggedOverId] = useState<string | null>(null);

  const [formData, setFormData] = useState<GuideFormData>({
    title: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    coverImage: '',
    relatedSports: [],
    tags: { en: [], he: [] },
    contentBlocks: { en: [], he: [] },
    status: 'draft',
    isFeatured: false,
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
    metaKeywords: { en: '', he: '' },
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
    const lang = activeTab;
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags[lang].includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: {
          ...prev.tags,
          [lang]: [...prev.tags[lang], trimmedTag],
        },
      }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [lang]: prev.tags[lang].filter(t => t !== tag),
      },
    }));
  };

  const handleAddContentBlock = (type: ContentBlockType) => {
    const lang = activeTab;
    const currentBlocks = formData.contentBlocks[lang];
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      order: currentBlocks.length,
      text: type === 'text' ? '' : undefined,
      heading: type === 'heading' ? '' : undefined,
      headingLevel: type === 'heading' ? 'h2' : undefined,
      listType: type === 'list' ? 'bullet' : undefined,
      listItems: type === 'list' ? [{ title: '', content: '' }] : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      imageCaption: type === 'image' ? '' : undefined,
      imageAlt: type === 'image' ? '' : undefined,
      videoUrl: type === 'video' ? '' : undefined,
      videoTitle: type === 'video' ? '' : undefined,
      linkText: type === 'link' ? '' : undefined,
      linkUrl: type === 'link' ? '' : undefined,
      linkExternal: type === 'link' ? false : undefined,
      code: type === 'code' ? '' : undefined,
      language: type === 'code' ? 'javascript' : undefined,
    };

    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: [...currentBlocks, newBlock],
      },
    }));
    setSelectedBlock(newBlock.id);
  };

  const handleUpdateContentBlock = (id: string, updates: Partial<ContentBlock>) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map(block =>
          block.id === id ? { ...block, ...updates } : block
        ),
      },
    }));
  };

  const handleRemoveContentBlock = (id: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang]
          .filter(block => block.id !== id)
          .map((block, index) => ({ ...block, order: index })),
      },
    }));
  };

  const handleMoveBlockUp = (blockId: string) => {
    const lang = activeTab;
    setFormData(prev => {
      const blocks = [...prev.contentBlocks[lang]];
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      if (currentIndex > 0) {
        [blocks[currentIndex - 1], blocks[currentIndex]] = [blocks[currentIndex], blocks[currentIndex - 1]];
        blocks.forEach((b, i) => b.order = i);
        return { 
          ...prev, 
          contentBlocks: {
            ...prev.contentBlocks,
            [lang]: blocks,
          },
        };
      }
      return prev;
    });
  };

  const handleMoveBlockDown = (blockId: string) => {
    const lang = activeTab;
    setFormData(prev => {
      const blocks = [...prev.contentBlocks[lang]];
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      if (currentIndex < blocks.length - 1) {
        [blocks[currentIndex], blocks[currentIndex + 1]] = [blocks[currentIndex + 1], blocks[currentIndex]];
        blocks.forEach((b, i) => b.order = i);
        return { 
          ...prev, 
          contentBlocks: {
            ...prev.contentBlocks,
            [lang]: blocks,
          },
        };
      }
      return prev;
    });
  };

  const handleAddListItem = (blockId: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map(block => {
          if (block.id === blockId && block.listItems) {
            return {
              ...block,
              listItems: [...(block.listItems || []), { title: '', content: '' }],
            };
          }
          return block;
        }),
      },
    }));
  };

  const handleUpdateListItem = (blockId: string, index: number, field: 'title' | 'content', value: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map(block => {
          if (block.id === blockId && block.listItems) {
            return {
              ...block,
              listItems: block.listItems.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
              ),
            };
          }
          return block;
        }),
      },
    }));
  };

  const handleRemoveListItem = (blockId: string, index: number) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map(block => {
          if (block.id === blockId && block.listItems) {
            return {
              ...block,
              listItems: block.listItems.filter((_, i) => i !== index),
            };
          }
          return block;
        }),
      },
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.en) newErrors['title.en'] = 'English title is required';
    if (!formData.title.he) newErrors['title.he'] = 'Hebrew title is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (!formData.coverImage) newErrors['coverImage'] = 'Cover image is required';
    if (formData.contentBlocks.en.length === 0) {
      newErrors['contentBlocks.en'] = 'At least one English content block is required';
    }
    if (formData.contentBlocks.he.length === 0) {
      newErrors['contentBlocks.he'] = 'At least one Hebrew content block is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = useCallback(async () => {
    // Don't auto-save if form is empty or invalid
    if (!formData.slug || !formData.title.en) return;
    
    try {
      // Clean contentBlocks for draft save too
      const cleanedContentBlocksForDraft = {
        en: (formData.contentBlocks.en || [])
          .filter(block => block && block.type)
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            return { ...blockWithoutId, order: index };
          }),
        he: (formData.contentBlocks.he || [])
          .filter(block => block && block.type)
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            return { ...blockWithoutId, order: index };
          }),
      };

      const response = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contentBlocks: cleanedContentBlocksForDraft,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date());
        // Store the guide ID for future updates
        if (data.guide && data.guide.id) {
          // Could store in state or localStorage for future updates
        }
      } else {
        const errorData = await response.json();
        console.error('Error saving draft:', errorData.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [formData]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);


  const handleSubmit = async (e?: React.FormEvent, saveAsDraft: boolean = false) => {
    if (e) e.preventDefault();
    
    // Only validate if not saving as draft
    if (!saveAsDraft && !validate()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Ensure contentBlocks are properly formatted - remove id field and ensure type exists
      const cleanedContentBlocks = {
        en: (formData.contentBlocks.en || [])
          .filter(block => {
            if (!block) return false;
            if (!block.type) {
              console.warn('Block missing type field:', block);
              return false;
            }
            return true;
          })
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            // Ensure type is present
            if (!blockWithoutId.type) {
              console.error('Block still missing type after filter:', blockWithoutId);
            }
            return {
              ...blockWithoutId,
              type: blockWithoutId.type, // Explicitly ensure type is set
              order: index, // Ensure order is set correctly
            };
          }),
        he: (formData.contentBlocks.he || [])
          .filter(block => {
            if (!block) return false;
            if (!block.type) {
              console.warn('Block missing type field:', block);
              return false;
            }
            return true;
          })
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            // Ensure type is present
            if (!blockWithoutId.type) {
              console.error('Block still missing type after filter:', blockWithoutId);
            }
            return {
              ...blockWithoutId,
              type: blockWithoutId.type, // Explicitly ensure type is set
              order: index, // Ensure order is set correctly
            };
          }),
      };
      
      // Validate all blocks have type before sending
      const invalidBlocks = [
        ...cleanedContentBlocks.en.filter(b => !b.type),
        ...cleanedContentBlocks.he.filter(b => !b.type),
      ];
      if (invalidBlocks.length > 0) {
        console.error('Found blocks without type:', invalidBlocks);
        throw new Error(`Found ${invalidBlocks.length} blocks without type field`);
      }

      const submitData = {
        ...formData,
        contentBlocks: cleanedContentBlocks,
        status: saveAsDraft ? 'draft' : 'published', // When publishing, explicitly set to 'published'
      };

      console.log('Submitting guide with contentBlocks:', {
        en: cleanedContentBlocks.en.length,
        he: cleanedContentBlocks.he.length,
        structure: cleanedContentBlocks,
      });

      const response = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create guide');
      }

      const data = await response.json();
      console.log('Guide created successfully:', data);
      setLastSaved(new Date());
      
      if (saveAsDraft) {
        // Show success toast for draft
        toast({
          title: 'Success',
          description: 'Draft saved successfully!',
          variant: 'success',
        });
      } else {
        // Show success toast before redirecting
        toast({
          title: 'Success',
          description: 'Guide published successfully!',
          variant: 'success',
        });
        // Use setTimeout to ensure React has time to render the toast
        setTimeout(() => {
          router.push(`/${locale}/admin/guides`);
        }, 2500);
      }
    } catch (error: any) {
      console.error('Error submitting:', error);
      const errorMessage = error.message || 'Failed to save guide';
      toast({
        title: 'Error',
        description: errorMessage,
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
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Create New Guide</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="red" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="blue" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button type="button" variant="orange" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(undefined, true);
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button type="button" variant="green" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }} disabled={isSubmitting}>
            {isSubmitting ? 'Publishing...' : 'Publish Guide'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <div className="space-y-6">
          <Card>
            <div className="relative w-full h-64 bg-gray-100 rounded-t-lg overflow-hidden">
              {formData.coverImage && (
                <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
              )}
            </div>
            <CardHeader>
              <CardTitle>{formData.title[activeTab] || 'Untitled Guide'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">{formData.description[activeTab]}</p>
                {formData.contentBlocks[activeTab].map((block, index) => (
                  <RenderContentBlock key={block.id} block={block} lang={activeTab} />
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
              <CardTitle className="text-gray dark:text-gray-dark">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Tabs */}
              <div className="flex space-x-2 border-b">
                <button
                  type="button"
                  onClick={() => handleTabChange('en')}
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
                  onClick={() => handleTabChange('he')}
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
                  placeholder={activeTab === 'en' ? 'Guide Title' : 'כותרת המדריך'}
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
                  placeholder="guide-slug"
                  error={errors.slug}
                  required
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
                  rows={4}
                  placeholder={activeTab === 'en' ? 'Guide description' : 'תיאור המדריך'}
                  required
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                  Cover Image
                </label>
                <Input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => handleInputChange('coverImage', e.target.value)}
                  placeholder="https://..."
                  error={errors.coverImage}
                  required
                />
                {formData.coverImage && (
                  <div className="mt-3">
                    <img
                      src={formData.coverImage}
                      alt="Cover preview"
                      className="max-w-full h-48 object-cover rounded"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Related Sports & Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Related Sports */}
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                  Related Sports
                </label>
                {/* Predefined Sports */}
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
                {/* Selected Sports Display (like tags) */}
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
                {/* Custom Sport Input */}
                <Input
                  placeholder="Add a custom sport and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const customSport = e.currentTarget.value.trim().toLowerCase();
                      if (customSport && !formData.relatedSports.includes(customSport)) {
                        handleAddSport(customSport);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
                    Tags
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {activeTab === 'en' ? 'EN' : 'HE'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags[activeTab].map((tag) => (
                    <Button
                      variant="purple"
                      key={tag}
                      onClick={() => handleRemoveTag(tag)}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                      <p
                        className="ms-2"
                      >
                        ×
                      </p>
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder={activeTab === 'en' ? 'Add a tag and press Enter' : 'הוסף תגית ולחץ Enter'}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Content Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Content Builder</CardTitle>
                  <div className="flex items-center gap-2 bg-gray-bg dark:bg-gray-bg-dark px-3 py-1.5 rounded-lg border border-gray-border dark:border-gray-border-dark">
                    <span className="text-xs font-semibold text-gray dark:text-gray-dark">Editing:</span>
                    <div className="flex items-center gap-2">
                    <Button
                      variant={activeTab === 'en' ? 'blue' : 'gray'}
                      type="button"
                      onClick={() => handleTabChange('en')}
                      className={`!rounded text-xs font-medium`}
                    >
                      English
                    </Button>
                    <Button
                      variant={activeTab === 'he' ? 'blue' : 'gray'}
                      type="button"
                      onClick={() => handleTabChange('he')}
                      className={`!rounded text-xs font-medium`}
                      dir="rtl"
                    >
                      עברית
                    </Button>
                    </div>
                  </div>
                </div>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="gray" className="gap-2">
                      <span className="text-lg">+</span>
                      Add Content Block
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 bg-siderbar-bg dark:bg-siderbar-bg-dark" align="end">
                    <div className="grid grid-cols-2 gap-2">
                      {CONTENT_BLOCK_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const blockType = type.value as ContentBlockType;
                            handleAddContentBlock(blockType);
                            setPopoverOpen(false);
                          }}
                          className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bord text-left"
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Debug info - remove after testing */}
              <div className="text-xs text-gray-400 mb-2 px-2">
                Showing {formData.contentBlocks[activeTab]?.length || 0} {activeTab === 'en' ? 'English' : 'Hebrew'} block(s) | 
                English: {formData.contentBlocks.en?.length || 0} | Hebrew: {formData.contentBlocks.he?.length || 0}
              </div>
              {(!formData.contentBlocks[activeTab] || formData.contentBlocks[activeTab].length === 0) ? (
                <div className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                  No {activeTab === 'en' ? 'English' : 'Hebrew'} content blocks yet. Add one to get started.
                </div>
              ) : (
                formData.contentBlocks[activeTab]
                  .sort((a, b) => a.order - b.order)
                  .map((block, index) => {
                    const blockType = CONTENT_BLOCK_TYPES.find(t => t.value === block.type);
                    return (
                      <div
                        key={`${activeTab}-${block.id}`}
                        className={`bord rounded-lg p-4 transition-all ${
                          selectedBlock === block.id
                            ? 'border-blue-border bg-blue-bg dark:bg-blue-bg-dark'
                            : draggedOverId === block.id
                            ? 'border-blue-border dark:border-blue-border-dark bg-blue-bg dark:bg-blue-bg-dark border-dashed'
                            : 'border-border dark:border-border-dark'
                        } ${draggedBlockRef.current?.id === block.id ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          draggedBlockRef.current = block;
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedOverId(null);
                        }}
                        onDragEnd={() => {
                          draggedBlockRef.current = null;
                          setDraggedOverId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (draggedBlockRef.current && draggedBlockRef.current.id !== block.id) {
                            setDraggedOverId(block.id);
                          }
                        }}
                        onDragLeave={() => {
                          setDraggedOverId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const lang = activeTab;
                          if (draggedBlockRef.current && draggedBlockRef.current.id !== block.id) {
                            const blocks = [...formData.contentBlocks[lang]];
                            const draggedIndex = blocks.findIndex(b => b.id === draggedBlockRef.current!.id);
                            const targetIndex = blocks.findIndex(b => b.id === block.id);
                            const [moved] = blocks.splice(draggedIndex, 1);
                            blocks.splice(targetIndex, 0, moved);
                            blocks.forEach((b, i) => b.order = i);
                            setFormData(prev => ({
                              ...prev,
                              contentBlocks: {
                                ...prev.contentBlocks,
                                [lang]: blocks,
                              },
                            }));
                          }
                          draggedBlockRef.current = null;
                          setDraggedOverId(null);
                        }}
                        onClick={() => setSelectedBlock(block.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlockUp(block.id);
                                }}
                                disabled={index === 0}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <span className="text-xs text-text-secondary dark:text-text-secondary-dark font-medium">{index + 1}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveBlockDown(block.id);
                                }}
                                disabled={index === formData.contentBlocks[activeTab].length - 1}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center gap-2 cursor-move" title="Drag to reorder">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                              <span className="text-sm font-medium text-text dark:text-text-dark">
                                {blockType?.icon} {blockType?.label}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="red"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveContentBlock(block.id);
                            }}
                          >
                            Remove
                          </Button>
                        </div>

                        {selectedBlock === block.id && (
                          <div className="space-y-3 mt-3">
                            {block.type === 'text' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {activeTab === 'en' ? 'English Text' : 'טקסט בעברית'}
                                  </label>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                    {activeTab === 'en' ? 'EN' : 'HE'}
                                  </span>
                                </div>
                                <Textarea
                                  value={block.text || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      text: e.target.value,
                                    })
                                  }
                                  rows={6}
                                  className="font-mono text-sm"
                                  placeholder={activeTab === 'en' ? 'Enter text... Use [link text](url) for links' : 'הכנס טקסט... השתמש ב-[טקסט קישור](url) לקישורים'}
                                  dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                />
                                <div className="text-xs text-text-secondary dark:text-text-secondary-dark bg-gray-50 p-2 rounded border">
                                  <p className="font-semibold mb-1">Link Format:</p>
                                  <p className="font-mono">[link text](https://example.com)</p>
                                  <p className="mt-1 text-gray-400">Example: Check out our [shop](https://example.com/shop) for more products.</p>
                                </div>
                              </div>
                            )}

                            {block.type === 'heading' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    {activeTab === 'en' ? 'English Heading' : 'כותרת בעברית'}
                                  </label>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                    {activeTab === 'en' ? 'EN' : 'HE'}
                                  </span>
                                </div>
                                <Input
                                  value={block.heading || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      heading: e.target.value,
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Enter heading...' : 'הכנס כותרת...'}
                                  dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                />
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    {activeTab === 'en' ? 'Heading Level' : 'רמת כותרת'}
                                  </label>
                                  <SegmentedControls
                                    value={block.headingLevel || 'h2'}
                                    onValueChange={(value) =>
                                      handleUpdateContentBlock(block.id, { headingLevel: value as 'h2' | 'h3' | 'h4' })
                                    }
                                    options={[
                                      { value: 'h2', label: 'H2' },
                                      { value: 'h3', label: 'H3' },
                                      { value: 'h4', label: 'H4' },
                                    ]}
                                    size="sm"
                                    className="max-w-[200px]"
                                  />
                                </div>
                              </div>
                            )}

                            {block.type === 'list' && (() => {
                              const items = block.listItems || [];
                              
                              return (
                                <div>
                                  <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                      {activeTab === 'en' ? 'List Type' : 'סוג רשימה'}
                                    </label>
                                    <SegmentedControls
                                      value={block.listType || 'bullet'}
                                      onValueChange={(value) =>
                                        handleUpdateContentBlock(block.id, { listType: value as 'bullet' | 'numbered' })
                                      }
                                      options={[
                                        { value: 'bullet', label: 'Bullet' },
                                        { value: 'numbered', label: 'Numbered' },
                                      ]}
                                      size="sm"
                                      className="max-w-[200px]"
                                    />
                                  </div>
                                  <div className="mt-2 space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        {activeTab === 'en' ? 'English List Items' : 'פריטי רשימה בעברית'}
                                      </span>
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                        {activeTab === 'en' ? 'EN' : 'HE'}
                                      </span>
                                    </div>
                                    {items.map((item, itemIndex) => (
                                      <div key={itemIndex} className="border border-gray-200 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-text-secondary dark:text-text-secondary-dark">Item {itemIndex + 1}</span>
                                          <Button
                                            type="button"
                                            variant="red"
                                            size="sm"
                                            onClick={() => handleRemoveListItem(block.id, itemIndex)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                        <Input
                                          label="Title (Optional)"
                                          value={item.title || ''}
                                          onChange={(e) =>
                                            handleUpdateListItem(block.id, itemIndex, 'title', e.target.value)
                                          }
                                          placeholder={activeTab === 'en' ? 'Item title...' : 'כותרת פריט...'}
                                          dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                        />
                                        <Textarea
                                          value={item.content || ''}
                                          onChange={(e) =>
                                            handleUpdateListItem(block.id, itemIndex, 'content', e.target.value)
                                          }
                                          rows={3}
                                          placeholder={activeTab === 'en' ? 'Item content...' : 'תוכן פריט...'}
                                          dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                        />
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="purple"
                                      size="sm"
                                      onClick={() => handleAddListItem(block.id)}
                                    >
                                      + Add Item
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}

                            {block.type === 'image' && (
                              <div className="space-y-2">
                                <Input
                                  label="Image URL"
                                  value={block.imageUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { imageUrl: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      {activeTab === 'en' ? 'Alt Text' : 'טקסט חלופי'}
                                    </label>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                      {activeTab === 'en' ? 'EN' : 'HE'}
                                    </span>
                                  </div>
                                  <Input
                                    value={block.imageAlt || ''}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, {
                                        imageAlt: e.target.value,
                                      })
                                    }
                                    placeholder={activeTab === 'en' ? 'Image description' : 'תיאור תמונה'}
                                    dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      {activeTab === 'en' ? 'Caption' : 'כיתוב'}
                                    </label>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                      {activeTab === 'en' ? 'EN' : 'HE'}
                                    </span>
                                  </div>
                                  <Input
                                    value={block.imageCaption || ''}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, {
                                        imageCaption: e.target.value,
                                      })
                                    }
                                    placeholder={activeTab === 'en' ? 'Image caption' : 'כיתוב תמונה'}
                                    dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <div className="border-t border-border dark:border-border-dark pt-2 mt-2">
                                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                                    Make Image Clickable (Optional)
                                  </label>
                                  <Input
                                    label="Link URL"
                                    value={block.imageLinkUrl || ''}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, { imageLinkUrl: e.target.value })
                                    }
                                    placeholder={activeTab === 'en' ? 'https://... (leave empty for no link)' : 'https://... (השאר ריק ללא קישור)'}
                                  />
                                  <div className="mt-2">
                                    <Checkbox
                                      variant="brand"
                                      id={`image-link-external-${block.id}`}
                                      checked={block.imageLinkExternal || false}
                                      onChange={(checked) =>
                                        handleUpdateContentBlock(block.id, { imageLinkExternal: checked })
                                      }
                                      label="Open in new tab"
                                    />
                                  </div>
                                </div>
                                {block.imageUrl && (
                                  <div className="mt-3">
                                    {block.imageLinkUrl ? (
                                      <a
                                        href={block.imageLinkUrl}
                                        target={block.imageLinkExternal ? '_blank' : '_self'}
                                        rel={block.imageLinkExternal ? 'noopener noreferrer' : undefined}
                                        className="block"
                                      >
                                        <img
                                          src={block.imageUrl}
                                          alt={block.imageAlt || ''}
                                          className="max-w-full h-48 object-contain rounded hover:opacity-90 transition-opacity cursor-pointer border-2 border-blue-300"
                                        />
                                      </a>
                                    ) : (
                                      <img
                                        src={block.imageUrl}
                                        alt={block.imageAlt || ''}
                                        className="max-w-full h-48 object-contain rounded"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {block.type === 'video' && (
                              <div className="space-y-2">
                                <Input
                                  label="Video URL (YouTube, Vimeo, etc.)"
                                  value={block.videoUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { videoUrl: e.target.value })
                                  }
                                  placeholder="https://youtube.com/watch?v=..."
                                />
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                      {activeTab === 'en' ? 'Video Title' : 'כותרת וידאו'}
                                    </label>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                      {activeTab === 'en' ? 'EN' : 'HE'}
                                    </span>
                                  </div>
                                  <Input
                                    value={block.videoTitle || ''}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, {
                                        videoTitle: e.target.value,
                                      })
                                    }
                                    placeholder={activeTab === 'en' ? 'Video title' : 'כותרת וידאו'}
                                    dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                  />
                                </div>
                              </div>
                            )}

                            {block.type === 'link' && (
                              <div className="space-y-2">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-gray dark:text-gray-400">
                                      {activeTab === 'en' ? 'Link Text' : 'טקסט קישור'}
                                    </label>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-bg dark:bg-blue-bg-dark text-blue dark:text-blue-dark">
                                      {activeTab === 'en' ? 'EN' : 'HE'}
                                    </span>
                                  </div>
                                  <Input
                                    value={block.linkText || ''}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, {
                                        linkText: e.target.value,
                                      })
                                    }
                                    placeholder={activeTab === 'en' ? 'Link text' : 'טקסט קישור'}
                                    dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <Input
                                  label="Link URL"
                                  value={block.linkUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { linkUrl: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                                <div>
                                  <Checkbox
                                    variant="brand"
                                    id={`link-external-${block.id}`}
                                    checked={block.linkExternal || false}
                                    onChange={(checked) =>
                                      handleUpdateContentBlock(block.id, { linkExternal: checked })
                                    }
                                    label="Open in new tab"
                                  />
                                </div>
                              </div>
                            )}

                            {block.type === 'code' && (
                              <div className="space-y-2">
                                <SelectWrapper
                                  value={block.language}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { language: e.target.value })
                                  }
                                  options={CODE_LANGUAGES.map(lang => ({ value: lang, label: lang }))}
                                />
                                <Textarea
                                  value={block.code || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { code: e.target.value })
                                  }
                                  rows={10}
                                  className="font-mono text-sm"
                                  placeholder={activeTab === 'en' ? 'Enter code...' : 'הכנס קוד...'}
                                />
                              </div>
                            )}

                            {block.type === 'divider' && (
                              <div className="text-text-secondary dark:text-text-secondary-dark text-sm italic">
                                Divider - no configuration needed
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
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
                      { value: 'archived', label: 'Archived' },
                    ]}
                  />
                </div>
                <div className="pt-8">
                  <Checkbox
                    variant="brand"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(checked) => handleInputChange('isFeatured', checked)}
                    label="Featured Guide"
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
                  placeholder={activeTab === 'en' ? 'keyword1, keyword2, keyword3' : 'מילת מפתח 1, מילת מפתח 2'}
                />
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

// Helper component to render content blocks in preview
function RenderContentBlock({ block, lang }: { block: ContentBlock; lang: 'en' | 'he' }) {
  switch (block.type) {
    case 'text':
      const textContent = block.text || '';
      // Parse markdown-style links [text](url)
      const parseTextWithLinks = (text: string) => {
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = linkRegex.exec(text)) !== null) {
          // Add text before the link
          if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }
          // Add the link
          parts.push(
            <a
              key={key++}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {match[1]}
            </a>
          );
          lastIndex = match.index + match[0].length;
        }
        // Add remaining text
        if (lastIndex < text.length) {
          parts.push(text.substring(lastIndex));
        }
        return parts.length > 0 ? parts : [text];
      };
      
      return (
        <p className="text-base leading-relaxed">
          {parseTextWithLinks(textContent)}
        </p>
      );
    
    case 'heading':
      const HeadingTag = block.headingLevel || 'h2';
      return React.createElement(HeadingTag, { className: 'font-bold' }, block.heading || '');
    
    case 'list':
      const listItems = block.listItems || [];
      const ListTag = block.listType === 'numbered' ? 'ol' : 'ul';
      const listClassName = block.listType === 'numbered' ? 'list-decimal pl-5' : 'list-disc pl-5';
      
      return (
        <ListTag className={listClassName}>
          {listItems.filter(Boolean).map((item: any, i: number) => (
            <li key={i} className="mb-2">
              {item.title && <strong className="font-semibold">{item.title}: </strong>}
              <span>{item.content}</span>
            </li>
          ))}
        </ListTag>
      );
    
    case 'image':
      if (!block.imageUrl) return null;
      const imageElement = (
        <img src={block.imageUrl} alt={block.imageAlt || ''} className="w-full rounded" />
      );
      return (
        <div className="my-4">
          {block.imageLinkUrl ? (
            <a
              href={block.imageLinkUrl}
              target={block.imageLinkExternal ? '_blank' : '_self'}
              rel={block.imageLinkExternal ? 'noopener noreferrer' : undefined}
              className="block"
            >
              {imageElement}
            </a>
          ) : (
            imageElement
          )}
          {block.imageCaption && (
            <p className="text-sm text-gray-500 text-center mt-2">{block.imageCaption}</p>
          )}
        </div>
      );
    
    case 'video':
      if (!block.videoUrl) return null;
      return (
        <div className="my-4">
          <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center">
            <p className="text-gray-500">Video: {block.videoUrl}</p>
          </div>
        </div>
      );
    
    case 'link':
      if (!block.linkUrl) return null;
      return (
        <a
          href={block.linkUrl}
          target={block.linkExternal ? '_blank' : undefined}
          rel={block.linkExternal ? 'noopener noreferrer' : undefined}
          className="text-blue-600 hover:underline"
        >
          {block.linkText || block.linkUrl}
        </a>
      );
    
    case 'code':
      if (!block.code) return null;
      return (
        <div className="my-4">
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    
    case 'divider':
      return <hr className="border-gray-300 my-4" />;
    
    default:
      return null;
  }
}

