'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Dropdown } from '@/components/ui';
import { ImageUploader } from '@/components/admin';

interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'list' | 'image' | 'video' | 'link' | 'code' | 'divider';
  order: number;
  text?: { en: string; he: string };
  heading?: { en: string; he: string };
  headingLevel?: 'h2' | 'h3' | 'h4';
  listType?: 'bullet' | 'numbered';
  listItems?: { en: string[]; he: string[] };
  imageUrl?: string;
  imageCaption?: { en: string; he: string };
  imageAlt?: { en: string; he: string };
  videoUrl?: string;
  videoTitle?: { en: string; he: string };
  linkText?: { en: string; he: string };
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
  tags: string[];
  contentBlocks: ContentBlock[];
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
  'Skateboarding',
  'BMX',
  'Scooter',
  'Longboarding',
  'Roller Skating',
  'Ski',
  'Snowboard',
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
  const [previewMode, setPreviewMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const draggedBlockRef = useRef<ContentBlock | null>(null);

  const [formData, setFormData] = useState<GuideFormData>({
    title: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    coverImage: '',
    relatedSports: [],
    tags: [],
    contentBlocks: [],
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

  const handleAddContentBlock = (type: ContentBlockType) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      order: formData.contentBlocks.length,
      text: type === 'text' ? { en: '', he: '' } : undefined,
      heading: type === 'heading' ? { en: '', he: '' } : undefined,
      headingLevel: type === 'heading' ? 'h2' : undefined,
      listType: type === 'list' ? 'bullet' : undefined,
      listItems: type === 'list' ? { en: [''], he: [''] } : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      imageCaption: type === 'image' ? { en: '', he: '' } : undefined,
      imageAlt: type === 'image' ? { en: '', he: '' } : undefined,
      videoUrl: type === 'video' ? '' : undefined,
      videoTitle: type === 'video' ? { en: '', he: '' } : undefined,
      linkText: type === 'link' ? { en: '', he: '' } : undefined,
      linkUrl: type === 'link' ? '' : undefined,
      linkExternal: type === 'link' ? false : undefined,
      code: type === 'code' ? '' : undefined,
      language: type === 'code' ? 'javascript' : undefined,
    };

    setFormData(prev => ({
      ...prev,
      contentBlocks: [...prev.contentBlocks, newBlock],
    }));
    setSelectedBlock(newBlock.id);
  };

  const handleUpdateContentBlock = (id: string, updates: Partial<ContentBlock>) => {
    setFormData(prev => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    }));
  };

  const handleRemoveContentBlock = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contentBlocks: prev.contentBlocks
        .filter(block => block.id !== id)
        .map((block, index) => ({ ...block, order: index })),
    }));
  };

  const handleAddListItem = (blockId: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map(block =>
        block.id === blockId && block.listItems
          ? {
              ...block,
              listItems: {
                ...block.listItems,
                [lang]: [...(block.listItems[lang] || []), ''],
              },
            }
          : block
      ),
    }));
  };

  const handleUpdateListItem = (blockId: string, index: number, value: string) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map(block =>
        block.id === blockId && block.listItems
          ? {
              ...block,
              listItems: {
                ...block.listItems,
                [lang]: block.listItems[lang].map((item, i) => (i === index ? value : item)),
              },
            }
          : block
      ),
    }));
  };

  const handleRemoveListItem = (blockId: string, index: number) => {
    const lang = activeTab;
    setFormData(prev => ({
      ...prev,
      contentBlocks: prev.contentBlocks.map(block =>
        block.id === blockId && block.listItems
          ? {
              ...block,
              listItems: {
                ...block.listItems,
                [lang]: block.listItems[lang].filter((_, i) => i !== index),
              },
            }
          : block
      ),
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
    if (formData.contentBlocks.length === 0) {
      newErrors['contentBlocks'] = 'At least one content block is required';
    }

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
      const response = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/${locale}/admin/guides`);
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Guide</h1>
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
                {formData.contentBlocks.map((block, index) => (
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={activeTab === 'en' ? 'Guide description' : 'תיאור המדריך'}
                  required
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
            </CardContent>
          </Card>

          {/* Dynamic Content Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Builder</CardTitle>
                <Dropdown
                  trigger={
                    <Button variant="secondary" size="sm">+ Add Content Block</Button>
                  }
                  options={CONTENT_BLOCK_TYPES.map(type => ({
                    label: `${type.icon} ${type.label}`,
                    value: type.value,
                    onClick: () => {
                      const blockType = type.value as ContentBlockType;
                      handleAddContentBlock(blockType);
                    },
                  }))}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.contentBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No content blocks yet. Add one to get started.
                </div>
              ) : (
                formData.contentBlocks
                  .sort((a, b) => a.order - b.order)
                  .map((block, index) => {
                    const blockType = CONTENT_BLOCK_TYPES.find(t => t.value === block.type);
                    return (
                      <div
                        key={block.id}
                        className={`border-2 rounded-lg p-4 ${
                          selectedBlock === block.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                        draggable
                        onDragStart={() => {
                          draggedBlockRef.current = block;
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedBlockRef.current && draggedBlockRef.current.id !== block.id) {
                            const blocks = [...formData.contentBlocks];
                            const draggedIndex = blocks.findIndex(b => b.id === draggedBlockRef.current!.id);
                            const targetIndex = blocks.findIndex(b => b.id === block.id);
                            const [moved] = blocks.splice(draggedIndex, 1);
                            blocks.splice(targetIndex, 0, moved);
                            blocks.forEach((b, i) => b.order = i);
                            handleInputChange('contentBlocks', blocks);
                          }
                          draggedBlockRef.current = null;
                        }}
                        onClick={() => setSelectedBlock(block.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">{index + 1}.</span>
                            <span className="text-sm font-medium text-gray-700">
                              {blockType?.icon} {blockType?.label}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="danger"
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
                              <textarea
                                value={block.text?.[activeTab] || ''}
                                onChange={(e) =>
                                  handleUpdateContentBlock(block.id, {
                                    text: { ...block.text, [activeTab]: e.target.value },
                                  })
                                }
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                placeholder={activeTab === 'en' ? 'Enter text...' : 'הכנס טקסט...'}
                              />
                            )}

                            {block.type === 'heading' && (
                              <div className="space-y-2">
                                <Input
                                  value={block.heading?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      heading: { ...block.heading, [activeTab]: e.target.value },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Enter heading...' : 'הכנס כותרת...'}
                                />
                  <Select
                    value={block.headingLevel}
                    onChange={(e) =>
                      handleUpdateContentBlock(block.id, { headingLevel: e.target.value as 'h2' | 'h3' | 'h4' })
                    }
                    options={[
                      { value: 'h2', label: 'H2' },
                      { value: 'h3', label: 'H3' },
                      { value: 'h4', label: 'H4' },
                    ]}
                  />
                              </div>
                            )}

                            {block.type === 'list' && (
                              <div>
                                  <Select
                                    value={block.listType}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, { listType: e.target.value as 'bullet' | 'numbered' })
                                    }
                                    options={[
                                      { value: 'bullet', label: 'Bullet List' },
                                      { value: 'numbered', label: 'Numbered List' },
                                    ]}
                                  />
                                <div className="mt-2 space-y-2">
                                  {(block.listItems?.[activeTab] || []).map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-center space-x-2">
                                      <Input
                                        value={item}
                                        onChange={(e) =>
                                          handleUpdateListItem(block.id, itemIndex, e.target.value)
                                        }
                                        placeholder={activeTab === 'en' ? 'Item text...' : 'טקסט פריט...'}
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleRemoveListItem(block.id, itemIndex)}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleAddListItem(block.id)}
                                  >
                                    + Add Item
                                  </Button>
                                </div>
                              </div>
                            )}

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
                                <Input
                                  label="Alt Text"
                                  value={block.imageAlt?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      imageAlt: { ...block.imageAlt, [activeTab]: e.target.value },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Image description' : 'תיאור תמונה'}
                                />
                                <Input
                                  label="Caption"
                                  value={block.imageCaption?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      imageCaption: { ...block.imageCaption, [activeTab]: e.target.value },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Image caption' : 'כיתוב תמונה'}
                                />
                                {block.imageUrl && (
                                  <div className="mt-3">
                                    <img
                                      src={block.imageUrl}
                                      alt={block.imageAlt?.[activeTab] || ''}
                                      className="max-w-full h-48 object-contain rounded"
                                    />
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
                                <Input
                                  label="Video Title"
                                  value={block.videoTitle?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      videoTitle: { ...block.videoTitle, [activeTab]: e.target.value },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Video title' : 'כותרת וידאו'}
                                />
                              </div>
                            )}

                            {block.type === 'link' && (
                              <div className="space-y-2">
                                <Input
                                  label="Link Text"
                                  value={block.linkText?.[activeTab] || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, {
                                      linkText: { ...block.linkText, [activeTab]: e.target.value },
                                    })
                                  }
                                  placeholder={activeTab === 'en' ? 'Link text' : 'טקסט קישור'}
                                />
                                <Input
                                  label="Link URL"
                                  value={block.linkUrl || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { linkUrl: e.target.value })
                                  }
                                  placeholder="https://..."
                                />
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    id={`link-external-${block.id}`}
                                    checked={block.linkExternal || false}
                                    onChange={(e) =>
                                      handleUpdateContentBlock(block.id, { linkExternal: e.target.checked })
                                    }
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <label htmlFor={`link-external-${block.id}`} className="text-sm text-gray-700">
                                    Open in new tab
                                  </label>
                                </div>
                              </div>
                            )}

                            {block.type === 'code' && (
                              <div className="space-y-2">
                                <Select
                                  value={block.language}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { language: e.target.value })
                                  }
                                  options={CODE_LANGUAGES.map(lang => ({ value: lang, label: lang }))}
                                />
                                <textarea
                                  value={block.code || ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { code: e.target.value })
                                  }
                                  rows={10}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                  placeholder={activeTab === 'en' ? 'Enter code...' : 'הכנס קוד...'}
                                />
                              </div>
                            )}

                            {block.type === 'divider' && (
                              <div className="text-gray-500 text-sm italic">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'published', label: 'Published' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                  />
                </div>
                <div className="flex items-center space-x-3 pt-8">
                  <input
                    type="checkbox"
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
                    Featured Guide
                  </label>
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
                <p className="text-xs text-gray-500">{formData.metaTitle[activeTab].length}/70 characters</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
                <textarea
                  value={formData.metaDescription[activeTab]}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      metaDescription: { ...prev.metaDescription, [activeTab]: e.target.value },
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={activeTab === 'en' ? 'SEO description' : 'תיאור SEO'}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500">{formData.metaDescription[activeTab].length}/160 characters</p>
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
      return <p className="text-base leading-relaxed">{block.text?.[lang] || ''}</p>;
    
    case 'heading':
      const HeadingTag = block.headingLevel || 'h2';
      return React.createElement(HeadingTag, { className: 'font-bold' }, block.heading?.[lang] || '');
    
    case 'list':
      const listItems = block.listItems?.[lang] || [];
      const ListTag = block.listType === 'numbered' ? 'ol' : 'ul';
      const listClassName = block.listType === 'numbered' ? 'list-decimal pl-5' : 'list-disc pl-5';
      return (
        <ListTag className={listClassName}>
          {listItems.filter(Boolean).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      );
    
    case 'image':
      if (!block.imageUrl) return null;
      return (
        <div className="my-4">
          <img src={block.imageUrl} alt={block.imageAlt?.[lang] || ''} className="w-full rounded" />
          {block.imageCaption?.[lang] && (
            <p className="text-sm text-gray-500 text-center mt-2">{block.imageCaption[lang]}</p>
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
          {block.linkText?.[lang] || block.linkUrl}
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

