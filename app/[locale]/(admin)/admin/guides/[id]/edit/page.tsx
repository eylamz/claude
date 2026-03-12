'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  SelectWrapper,
  Skeleton,
  SegmentedControls,
  Toaster,
} from '@/components/ui';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Icon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from '@/components/admin/image-uploader';

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
  metaImage: string;
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

const SPORTS = ['Roller', 'Skate', 'Scoot', 'BMX', 'Longboard', 'Ice Hocky', 'Roller Hocky'];

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

/** Cloudinary folder for guide assets (Home > guideAssets) */
const GUIDE_CLOUDINARY_FOLDER = 'guideAssets';

export default function EditGuidePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [guideId, setGuideId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [isPageVisible, setIsPageVisible] = useState(true);
  const lastSavedDataRef = useRef<string | null>(null);
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
    metaImage: '',
  });

  // Fetch guide data
  useEffect(() => {
    const fetchGuide = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/admin/guides/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Guide not found');
          }
          throw new Error('Failed to fetch guide');
        }

        const data = await response.json();
        const guide = data.guide;

        // Store the canonical guide ID separately so API mutations always use it,
        // regardless of whether the URL segment is an ID or a slug.
        if (guide?.id) {
          setGuideId(String(guide.id));
        }

        // Migrate content blocks from old format to new format (separated by language)
        let contentBlocks: { en: ContentBlock[]; he: ContentBlock[] };

        if (guide.contentBlocks && Array.isArray(guide.contentBlocks)) {
          // Old format: single array with bilingual fields
          const enBlocks: ContentBlock[] = [];
          const heBlocks: ContentBlock[] = [];

          guide.contentBlocks.forEach((block: any, index: number) => {
            // Create separate blocks for each language - completely independent
            // English block
            const enBlockId = block.id
              ? `${block.id}-en`
              : `block-${Date.now()}-${index}-en-${Math.random()}`;
            const enBlock: ContentBlock = {
              id: enBlockId,
              type: block.type,
              order: block.order !== undefined ? block.order : enBlocks.length,
              headingLevel: block.headingLevel,
              listType: block.listType,
              imageUrl: block.imageUrl,
              imageLinkUrl: block.imageLinkUrl,
              imageLinkExternal: block.imageLinkExternal,
              videoUrl: block.videoUrl,
              linkUrl: block.linkUrl,
              linkExternal: block.linkExternal,
              code: block.code,
              language: block.language,
              text: block.text?.en,
              heading: block.heading?.en,
              listItems: block.listItems?.en
                ? Array.isArray(block.listItems.en) &&
                  block.listItems.en.length > 0 &&
                  typeof block.listItems.en[0] === 'object'
                  ? block.listItems.en
                  : block.listItems.en.map((item: string) => ({ title: '', content: item }))
                : undefined,
              imageCaption: block.imageCaption?.en,
              imageAlt: block.imageAlt?.en,
              videoTitle: block.videoTitle?.en,
              linkText: block.linkText?.en,
            };
            enBlocks.push(enBlock);

            // Hebrew block - completely separate with different ID
            const heBlockId = block.id
              ? `${block.id}-he`
              : `block-${Date.now()}-${index}-he-${Math.random()}`;
            const heBlock: ContentBlock = {
              id: heBlockId,
              type: block.type,
              order: block.order !== undefined ? block.order : heBlocks.length,
              headingLevel: block.headingLevel,
              listType: block.listType,
              imageUrl: block.imageUrl, // Can be same URL or different
              imageLinkUrl: block.imageLinkUrl,
              imageLinkExternal: block.imageLinkExternal,
              videoUrl: block.videoUrl,
              linkUrl: block.linkUrl,
              linkExternal: block.linkExternal,
              code: block.code,
              language: block.language,
              text: block.text?.he,
              heading: block.heading?.he,
              listItems: block.listItems?.he
                ? Array.isArray(block.listItems.he) &&
                  block.listItems.he.length > 0 &&
                  typeof block.listItems.he[0] === 'object'
                  ? block.listItems.he
                  : block.listItems.he.map((item: string) => ({ title: '', content: item }))
                : undefined,
              imageCaption: block.imageCaption?.he,
              imageAlt: block.imageAlt?.he,
              videoTitle: block.videoTitle?.he,
              linkText: block.linkText?.he,
            };
            heBlocks.push(heBlock);
          });

          // Reorder blocks
          enBlocks.forEach((b, i) => (b.order = i));
          heBlocks.forEach((b, i) => (b.order = i));

          contentBlocks = { en: enBlocks, he: heBlocks };
        } else if (
          guide.contentBlocks &&
          typeof guide.contentBlocks === 'object' &&
          'en' in guide.contentBlocks
        ) {
          // New format: already separated
          contentBlocks = {
            en: (guide.contentBlocks.en || []).map((block: any, index: number) => ({
              ...block,
              id: block.id || `block-${Date.now()}-${index}-${Math.random()}`,
            })),
            he: (guide.contentBlocks.he || []).map((block: any, index: number) => ({
              ...block,
              id: block.id || `block-${Date.now()}-${index}-${Math.random()}`,
            })),
          };
        } else {
          contentBlocks = { en: [], he: [] };
        }

        // Migrate tags from old format (array) to new format (localized object)
        let tags: { en: string[]; he: string[] };
        if (Array.isArray(guide.tags)) {
          // Old format: single array - assign to both languages
          tags = { en: [...guide.tags], he: [...guide.tags] };
        } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
          // New format: already localized
          tags = { en: guide.tags.en || [], he: guide.tags.he || [] };
        } else {
          tags = { en: [], he: [] };
        }

        setFormData({
          title: guide.title || { en: '', he: '' },
          slug: guide.slug || '',
          description: guide.description || { en: '', he: '' },
          coverImage: guide.coverImage || '',
          relatedSports: guide.relatedSports || [],
          tags: tags,
          contentBlocks: {
            en: contentBlocks.en.map((block, idx) => ({ ...block, order: idx })),
            he: contentBlocks.he.map((block, idx) => ({ ...block, order: idx })),
          },
          status: guide.status || 'draft',
          isFeatured: guide.isFeatured || false,
          metaTitle: guide.metaTitle || { en: '', he: '' },
          metaDescription: guide.metaDescription || { en: '', he: '' },
          metaKeywords: guide.metaKeywords || { en: '', he: '' },
          metaImage: guide.metaImage || '',
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load guide');
        console.error('Error fetching guide:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGuide();
    }
  }, [id]);

  // Generate slug from title
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (lang: 'en' | 'he', value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, title: { ...prev.title, [lang]: value } };
      if (lang === 'en' && (!prev.slug || prev.slug === generateSlug(prev.title.en))) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleAddSport = (sport: string) => {
    if (!formData.relatedSports.includes(sport)) {
      setFormData((prev) => ({
        ...prev,
        relatedSports: [...prev.relatedSports, sport],
      }));
    }
  };

  const handleRemoveSport = (sport: string) => {
    setFormData((prev) => ({
      ...prev,
      relatedSports: prev.relatedSports.filter((s) => s !== sport),
    }));
  };

  const handleAddTag = (tag: string) => {
    const lang = activeTab;
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags[lang].includes(trimmedTag)) {
      setFormData((prev) => ({
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
    setFormData((prev) => ({
      ...prev,
      tags: {
        ...prev.tags,
        [lang]: prev.tags[lang].filter((t) => t !== tag),
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

    setFormData((prev) => ({
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
    setFormData((prev) => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map((block) =>
          block.id === id ? { ...block, ...updates } : block
        ),
      },
    }));
  };

  const handleRemoveContentBlock = (id: string) => {
    const lang = activeTab;
    setFormData((prev) => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang]
          .filter((block) => block.id !== id)
          .map((block, index) => ({ ...block, order: index })),
      },
    }));
  };

  const handleMoveBlockUp = (blockId: string) => {
    const lang = activeTab;
    setFormData((prev) => {
      const blocks = [...prev.contentBlocks[lang]];
      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      if (currentIndex > 0) {
        [blocks[currentIndex - 1], blocks[currentIndex]] = [
          blocks[currentIndex],
          blocks[currentIndex - 1],
        ];
        blocks.forEach((b, i) => (b.order = i));
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
    setFormData((prev) => {
      const blocks = [...prev.contentBlocks[lang]];
      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      if (currentIndex < blocks.length - 1) {
        [blocks[currentIndex], blocks[currentIndex + 1]] = [
          blocks[currentIndex + 1],
          blocks[currentIndex],
        ];
        blocks.forEach((b, i) => (b.order = i));
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
    setFormData((prev) => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map((block) => {
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

  const handleUpdateListItem = (
    blockId: string,
    index: number,
    field: 'title' | 'content',
    value: string
  ) => {
    const lang = activeTab;
    setFormData((prev) => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map((block) => {
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
    setFormData((prev) => ({
      ...prev,
      contentBlocks: {
        ...prev.contentBlocks,
        [lang]: prev.contentBlocks[lang].map((block) => {
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

  // Auto-save functionality (only saves if there are changes and page is visible)
  const autoSave = useCallback(async () => {
    // Don't auto-save if:
    // - No ID or slug
    // - Currently submitting
    // - Page is not visible (tab in background)
    if (!id || !formData.slug || isSubmitting || !isPageVisible) {
      return;
    }

    // Check if there are actual changes by comparing current formData with last saved
    const currentDataString = JSON.stringify(formData);
    if (lastSavedDataRef.current === currentDataString) {
      // No changes, skip auto-save
      return;
    }

    try {
      // Clean contentBlocks for auto-save
      const cleanedContentBlocks = {
        en: (formData.contentBlocks.en || [])
          .filter((block) => block && block.type)
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            return { ...blockWithoutId, order: index };
          }),
        he: (formData.contentBlocks.he || [])
          .filter((block) => block && block.type)
          .map((block, index) => {
            const { id, ...blockWithoutId } = block;
            return { ...blockWithoutId, order: index };
          }),
      };

      const response = await fetch(`/api/admin/guides/${guideId || id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          contentBlocks: cleanedContentBlocks,
          status: formData.status || 'draft',
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        lastSavedDataRef.current = currentDataString; // Update last saved data
        console.log('Auto-saved guide');
      }
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  }, [formData, id, isSubmitting, isPageVisible]);

  useEffect(() => {
    const interval = setInterval(autoSave, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [autoSave]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      // Ensure contentBlocks are properly formatted - remove id field and ensure type exists
      const cleanedContentBlocks = {
        en: (formData.contentBlocks.en || [])
          .filter((block) => {
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
          .filter((block) => {
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
        ...cleanedContentBlocks.en.filter((b) => !b.type),
        ...cleanedContentBlocks.he.filter((b) => !b.type),
      ];
      if (invalidBlocks.length > 0) {
        console.error('Found blocks without type:', invalidBlocks);
        throw new Error(`Found ${invalidBlocks.length} blocks without type field`);
      }

      const submitData = {
        ...formData,
        contentBlocks: cleanedContentBlocks,
        status: formData.status || 'draft', // Use current status from form
      };

      console.log('Submitting guide update:', {
        contentBlocks: {
          en: cleanedContentBlocks.en.length,
          he: cleanedContentBlocks.he.length,
        },
        tags: {
          type: typeof submitData.tags,
          isObject: typeof submitData.tags === 'object' && !Array.isArray(submitData.tags),
          hasEn: submitData.tags && 'en' in submitData.tags,
          hasHe: submitData.tags && 'he' in submitData.tags,
          enCount: submitData.tags?.en?.length || 0,
          heCount: submitData.tags?.he?.length || 0,
        },
        status: submitData.status,
      });

      const response = await fetch(`/api/admin/guides/${guideId || id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save guide');
      }

      const data = await response.json();
      console.log('Guide saved successfully:', data);
      setLastSaved(new Date());
      // Update last saved data reference to prevent unnecessary auto-saves
      const submitDataString = JSON.stringify(submitData);
      lastSavedDataRef.current = submitDataString;

      // Show success toast
      const statusMessage = formData.status === 'published' ? 'published' : 'saved';
      toast({
        title: 'Success',
        description: `Guide ${statusMessage} successfully!`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error submitting:', error);
      const errorMessage = error.message || 'Failed to save guide';
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
            <h1 className="text-3xl font-bold text-text dark:text-text-dark">Edit Guide</h1>
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
          <h1 className="text-3xl font-bold text-text dark:text-text-dark">Edit Guide</h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
            {error && <span className="text-red-500 ml-2">{error}</span>}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button type="button" variant="red" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" variant="blue" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            type="button"
            variant="green"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Guide'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode - Matching Public Guide Page Layout */
        <div className="min-h-screen bg-white dark:bg-gray-950">
          {/* Sticky Back Navigation */}
          <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
              <Button
                variant="blue"
                onClick={() => setPreviewMode(false)}
                className="inline-flex items-center gap-1 font-medium text-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Edit
              </Button>
            </div>
          </div>

          <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Article Header */}
            <header className="mb-8">
              {/* Title - Large and bold */}
              <h1 className={`text-3xl sm:text-4xl md:text-5xl ${activeTab === 'he' ? 'font-bold' : 'font-extrabold'} text-gray-900 dark:text-white leading-tight mb-4`}>
                {formData.title[activeTab] || 'Untitled Guide'}
              </h1>

              {/* Description/Subtitle */}
              <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                {formData.description[activeTab] || ''}
              </p>
            </header>

            {/* Cover Image - Full width with rounded corners */}
            {formData.coverImage && (
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-10">
                <Image
                  src={formData.coverImage}
                  alt={formData.title[activeTab] || 'Cover'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                />
              </div>
            )}

            {/* Article Content */}
            <article className="mb-12">
              <div className="space-y-6">
                {formData.contentBlocks[activeTab]
                  .sort((a, b) => a.order - b.order)
                  .map((block) => (
                    <RenderContentBlock key={block.id} block={block} lang={activeTab} />
                  ))}
              </div>
            </article>

            {/* Tags Section */}
            {formData.tags[activeTab].length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    name="tagBold"
                    className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark"
                  />
                  <span className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark dark:text-gray-400 uppercase tracking-wide">
                    Tags
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags[activeTab].map((tag) => (
                    <span
                      key={tag}
                      className="uppercase px-2 py-1 rounded-lg text-[12px] md:text-xs font-semibold bg-[#e7defc] dark:bg-[#472881] text-[#915bf5] dark:text-[#c5b6fd] border-[#b99ef867] dark:border-[#5f4cc54d] transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Related Sports */}
            {formData.relatedSports.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark dark:text-gray-400 uppercase tracking-wide mb-3">
                  Related Sports
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formData.relatedSports.map((sport) => (
                    <span
                      key={sport}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-brand-main/10 text-brand-main dark:bg-brand-main/20 dark:text-brand-dark"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Edit - Bottom CTA */}
            <div className="text-center pt-8">
              <Button
                variant="blue"
                onClick={() => setPreviewMode(false)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-main hover:bg-brand-main/90 text-white font-semibold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {activeTab === 'he' ? 'חזרה לעריכה' : 'Back to Edit'}
              </Button>
            </div>
          </main>
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
                    setFormData((prev) => ({
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
                <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-text dark:text-text-dark mb-2">
                    Upload to Cloudinary (Home &gt; guideAssets)
                  </h4>
                  <ImageUploader
                    images={formData.coverImage ? [{ url: formData.coverImage, publicId: '' }] : []}
                    onUpload={(uploadedImages) => {
                      if (uploadedImages.length > 0) {
                        handleInputChange('coverImage', uploadedImages[0].url);
                      }
                    }}
                    maxImages={1}
                    folder={GUIDE_CLOUDINARY_FOLDER}
                  />
                </div>
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
                      variant={
                        formData.relatedSports.includes(sport.toLowerCase()) ? 'blue' : 'gray'
                      }
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
                      <p className="ms-2">×</p>
                    </Button>
                  ))}
                </div>
                <Input
                  placeholder={
                    activeTab === 'en' ? 'Add a tag and press Enter' : 'הוסף תגית ולחץ Enter'
                  }
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
                    <span className="text-xs font-semibold text-gray dark:text-gray-dark">
                      Editing:
                    </span>
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
                  <PopoverContent
                    className="w-64 p-2 bg-siderbar-bg dark:bg-siderbar-bg-dark "
                    align="end"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {CONTENT_BLOCK_TYPES.map((type) => (
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
                          <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
                            {type.label}
                          </span>
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
                Showing {formData.contentBlocks[activeTab]?.length || 0}{' '}
                {activeTab === 'en' ? 'English' : 'Hebrew'} block(s) | English:{' '}
                {formData.contentBlocks.en?.length || 0} | Hebrew:{' '}
                {formData.contentBlocks.he?.length || 0}
              </div>
              {!formData.contentBlocks[activeTab] ||
              formData.contentBlocks[activeTab].length === 0 ? (
                <div className="text-center py-12 text-text-secondary dark:text-text-secondary-dark">
                  No {activeTab === 'en' ? 'English' : 'Hebrew'} content blocks yet. Add one to get
                  started.
                </div>
              ) : (
                formData.contentBlocks[activeTab]
                  .sort((a, b) => a.order - b.order)
                  .map((block, index) => {
                    const blockType = CONTENT_BLOCK_TYPES.find((t) => t.value === block.type);
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
                            const draggedIndex = blocks.findIndex(
                              (b) => b.id === draggedBlockRef.current!.id
                            );
                            const targetIndex = blocks.findIndex((b) => b.id === block.id);
                            const [moved] = blocks.splice(draggedIndex, 1);
                            blocks.splice(targetIndex, 0, moved);
                            blocks.forEach((b, i) => (b.order = i));
                            setFormData((prev) => ({
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
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 15l7-7 7 7"
                                  />
                                </svg>
                              </button>
                              <span className="text-xs text-text-secondary dark:text-text-secondary-dark font-medium">
                                {index + 1}
                              </span>
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
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                            <div
                              className="flex items-center gap-2 cursor-move"
                              title="Drag to reorder"
                            >
                              <svg
                                className="w-5 h-5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 8h16M4 16h16"
                                />
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
                                  placeholder={
                                    activeTab === 'en'
                                      ? 'Enter text... Use [link text](url) for links'
                                      : 'הכנס טקסט... השתמש ב-[טקסט קישור](url) לקישורים'
                                  }
                                  dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                />
                                <div className="text-xs text-text-secondary dark:text-text-secondary-dark bg-gray-50 p-2 rounded border">
                                  <p className="font-semibold mb-1">Link Format:</p>
                                  <p className="font-mono">[link text](https://example.com)</p>
                                  <p className="mt-1 text-gray-400">
                                    Example: Check out our [shop](https://example.com/shop) for more
                                    products.
                                  </p>
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
                                  placeholder={
                                    activeTab === 'en' ? 'Enter heading...' : 'הכנס כותרת...'
                                  }
                                  dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                />
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    {activeTab === 'en' ? 'Heading Level' : 'רמת כותרת'}
                                  </label>
                                  <SegmentedControls
                                    value={block.headingLevel || 'h2'}
                                    onValueChange={(value) =>
                                      handleUpdateContentBlock(block.id, {
                                        headingLevel: value as 'h2' | 'h3' | 'h4',
                                      })
                                    }
                                    options={[
                                      { value: 'h2', label: 'H2' },
                                      { value: 'h3', label: 'H3' },
                                      { value: 'h4', label: 'H4' },
                                    ]}
                                    className="max-w-[200px]"
                                  />
                                </div>
                              </div>
                            )}

                            {block.type === 'list' &&
                              (() => {
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
                                          handleUpdateContentBlock(block.id, {
                                            listType: value as 'bullet' | 'numbered',
                                          })
                                        }
                                        options={[
                                          { value: 'bullet', label: 'Bullet' },
                                          { value: 'numbered', label: 'Numbered' },
                                        ]}
                                        className="max-w-[200px]"
                                      />
                                    </div>
                                    <div className="mt-2 space-y-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                          {activeTab === 'en'
                                            ? 'English List Items'
                                            : 'פריטי רשימה בעברית'}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                                          {activeTab === 'en' ? 'EN' : 'HE'}
                                        </span>
                                      </div>
                                      {items.map((item, itemIndex) => (
                                        <div
                                          key={itemIndex}
                                          className="border border-gray-200 rounded-lg p-3 space-y-2"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-text-secondary dark:text-text-secondary-dark">
                                              Item {itemIndex + 1}
                                            </span>
                                            <Button
                                              type="button"
                                              variant="red"
                                              size="sm"
                                              onClick={() =>
                                                handleRemoveListItem(block.id, itemIndex)
                                              }
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                          <Input
                                            label="Title (Optional)"
                                            value={item.title || ''}
                                            onChange={(e) =>
                                              handleUpdateListItem(
                                                block.id,
                                                itemIndex,
                                                'title',
                                                e.target.value
                                              )
                                            }
                                            placeholder={
                                              activeTab === 'en' ? 'Item title...' : 'כותרת פריט...'
                                            }
                                            dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                          />
                                          <Textarea
                                            value={item.content || ''}
                                            onChange={(e) =>
                                              handleUpdateListItem(
                                                block.id,
                                                itemIndex,
                                                'content',
                                                e.target.value
                                              )
                                            }
                                            rows={3}
                                            placeholder={
                                              activeTab === 'en'
                                                ? 'Item content...'
                                                : 'תוכן פריט...'
                                            }
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
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                  <h4 className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
                                    Upload to Cloudinary (guideAssets)
                                  </h4>
                                  <ImageUploader
                                    images={
                                      block.imageUrl ? [{ url: block.imageUrl, publicId: '' }] : []
                                    }
                                    onUpload={(uploadedImages) => {
                                      if (uploadedImages.length > 0) {
                                        handleUpdateContentBlock(block.id, {
                                          imageUrl: uploadedImages[0].url,
                                        });
                                      }
                                    }}
                                    maxImages={1}
                                    folder={GUIDE_CLOUDINARY_FOLDER}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
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
                                    placeholder={
                                      activeTab === 'en' ? 'Image description' : 'תיאור תמונה'
                                    }
                                    dir={activeTab === 'he' ? 'rtl' : 'ltr'}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
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
                                    placeholder={
                                      activeTab === 'en' ? 'Image caption' : 'כיתוב תמונה'
                                    }
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
                                      handleUpdateContentBlock(block.id, {
                                        imageLinkUrl: e.target.value,
                                      })
                                    }
                                    placeholder={
                                      activeTab === 'en'
                                        ? 'https://... (leave empty for no link)'
                                        : 'https://... (השאר ריק ללא קישור)'
                                    }
                                  />
                                  <div className="mt-2">
                                    <Checkbox
                                      variant="brand"
                                      id={`image-link-external-${block.id}`}
                                      checked={block.imageLinkExternal || false}
                                      onChange={(checked) =>
                                        handleUpdateContentBlock(block.id, {
                                          imageLinkExternal: checked,
                                        })
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
                                        rel={
                                          block.imageLinkExternal
                                            ? 'noopener noreferrer'
                                            : undefined
                                        }
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
                                  value={block.language ?? ''}
                                  onChange={(e) =>
                                    handleUpdateContentBlock(block.id, { language: e.target.value })
                                  }
                                  options={CODE_LANGUAGES.map((lang) => ({
                                    value: lang,
                                    label: lang,
                                  }))}
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
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">
                    Status
                  </label>
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
                    setFormData((prev) => ({
                      ...prev,
                      metaTitle: { ...prev.metaTitle, [activeTab]: e.target.value },
                    }))
                  }
                  placeholder={activeTab === 'en' ? 'SEO title' : 'כותרת SEO'}
                  maxLength={70}
                />
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {formData.metaTitle[activeTab].length}/70 characters
                </p>
              </div>

              <div className="space-y-2">
                <Textarea
                  label="Meta Description"
                  value={formData.metaDescription[activeTab]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metaDescription: { ...prev.metaDescription, [activeTab]: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder={activeTab === 'en' ? 'SEO description' : 'תיאור SEO'}
                  maxLength={160}
                />
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {formData.metaDescription[activeTab].length}/160 characters
                </p>
              </div>

              <div>
                <Input
                  label="Meta Keywords"
                  value={formData.metaKeywords[activeTab]}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metaKeywords: { ...prev.metaKeywords, [activeTab]: e.target.value },
                    }))
                  }
                  placeholder={
                    activeTab === 'en' ? 'keyword1, keyword2, keyword3' : 'מילת מפתח 1, מילת מפתח 2'
                  }
                />
              </div>
              <Input
                label="OG / Meta Image URL"
                value={formData.metaImage}
                onChange={(e) => setFormData((prev) => ({ ...prev, metaImage: e.target.value }))}
                placeholder="https://example.com/image.jpg or /images/og-image.jpg. Leave empty to use cover image."
              />
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}

/**
 * YouTube Video Embed Component
 */
function YouTubeEmbed({ url }: { url: string }) {
  const getVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getVideoId(url);
  if (!videoId) return null;

  return (
    <div className="relative w-full my-8" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-2xl"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Helper component to render content blocks in preview - Matching Public Guide Page Style
function RenderContentBlock({ block, lang }: { block: ContentBlock; lang: 'en' | 'he' }) {
  const parseTextWithLinks = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-main dark:text-brand-dark font-medium underline decoration-2 underline-offset-2 hover:decoration-brand-main/50 transition-all"
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  switch (block.type) {
    case 'heading':
      const HeadingTag = block.headingLevel || 'h2';
      const headingText = block.heading || '';

      // Duolingo-style heading classes - clean and bold
      const headingClasses = {
        h2: `text-[1.225rem] sm:text-3xl ${lang === 'he' ? 'font-bold' : 'font-extrabold'} mt-12 mb-4 text-gray-900 dark:text-white`,
        h3: 'text-xl sm:text-[1.225rem] font-bold mt-10 mb-3 text-gray-900 dark:text-white',
        h4: 'text-lg sm:text-xl font-bold mt-8 mb-2 text-gray-900 dark:text-white',
      };
      return (
        <HeadingTag
          className={headingClasses[HeadingTag as 'h2' | 'h3' | 'h4'] || headingClasses.h2}
        >
          {headingText}
        </HeadingTag>
      );

    case 'text':
      const textContent = block.text || '';

      return (
        <p className="text-[1rem] leading-relaxed text-text-secondary dark:text-text-secondary-dark dark:text-gray-300">
          {parseTextWithLinks(textContent)}
        </p>
      );

    case 'list':
      const ListTag = block.listType === 'numbered' ? 'ol' : 'ul';
      const isNumbered = block.listType === 'numbered';
      const isRTL = lang === 'he';
      const listItems = block.listItems || [];

      return (
        <ListTag
          className={`my-6 space-y-3 ${isNumbered ? 'list-decimal' : 'list-none'} ${isRTL ? 'pr-0' : 'pl-0'}`}
        >
          {listItems.filter(Boolean).map((item: any, i: number) => (
            <li
              key={i}
              className={`text-lg text-text-secondary dark:text-text-secondary-dark dark:text-gray-300 leading-relaxed flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {!isNumbered && (
                <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">
                  •
                </span>
              )}
              <div>
                {item.title && (
                  <span className="font-bold text-gray-900 dark:text-white">{item.title} </span>
                )}
                {item.content}
              </div>
            </li>
          ))}
        </ListTag>
      );

    case 'image':
      if (!block.imageUrl) return null;

      const imageElement = (
        <Image
          src={block.imageUrl}
          alt={block.imageAlt || block.imageCaption || 'Guide image'}
          width={800}
          height={450}
          className={`w-full h-auto rounded-2xl ${block.imageLinkUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
        />
      );

      return (
        <figure className="my-8">
          {block.imageLinkUrl ? (
            <a
              href={block.imageLinkUrl}
              target={block.imageLinkExternal ? '_blank' : '_self'}
              rel={block.imageLinkExternal ? 'noopener noreferrer' : undefined}
            >
              {imageElement}
            </a>
          ) : (
            imageElement
          )}
          {block.imageCaption && (
            <figcaption className="text-center text-sm text-text-secondary dark:text-text-secondary-dark dark:text-gray-400 mt-3 italic">
              {block.imageCaption}
            </figcaption>
          )}
        </figure>
      );

    case 'video':
      if (!block.videoUrl) return null;

      return (
        <div className="my-8">
          {block.videoUrl.includes('youtube.com') || block.videoUrl.includes('youtu.be') ? (
            <YouTubeEmbed url={block.videoUrl} />
          ) : (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <video src={block.videoUrl} controls className="w-full h-full">
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {block.videoTitle && (
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark dark:text-gray-400 mt-3 text-center italic">
              {block.videoTitle}
            </p>
          )}
        </div>
      );

    case 'link':
      if (!block.linkUrl) return null;

      return (
        <p className="my-6">
          <a
            href={block.linkUrl}
            target={block.linkExternal ? '_blank' : '_self'}
            rel={block.linkExternal ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1 text-brand-main dark:text-brand-dark font-semibold underline decoration-2 underline-offset-2 hover:decoration-brand-main/50 transition-colors"
          >
            {block.linkText || block.linkUrl}
            {block.linkExternal && <ExternalLink className="w-4 h-4" />}
          </a>
        </p>
      );

    case 'code':
      if (!block.code) return null;
      return (
        <pre className="bg-gray-900 text-gray-100 rounded-2xl p-6 overflow-x-auto my-8">
          <code className="text-sm font-mono">{block.code}</code>
        </pre>
      );

    case 'divider':
      return <hr className="my-12 border-t-2 border-gray-200 dark:border-gray-700" />;

    default:
      return null;
  }
}
