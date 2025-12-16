'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Eye, Heart, Star, User, Tag, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import Breadcrumb from '@/components/common/Breadcrumb';
import { generateArticleStructuredData } from '@/lib/seo/utils';

interface ILocalizedField {
  en: string;
  he: string;
}

interface ContentBlock {
  type: 'text' | 'heading' | 'list' | 'image' | 'video' | 'link' | 'code' | 'divider';
  order: number;
  // New format: single language strings (for new structure)
  text?: string;
  heading?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  listType?: 'bullet' | 'numbered';
  listItems?: Array<{ title?: string; content: string }>;
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
  // Old format: bilingual fields (for backward compatibility)
  textOld?: ILocalizedField;
  headingOld?: ILocalizedField;
  imageCaptionOld?: ILocalizedField;
  imageAltOld?: ILocalizedField;
  videoTitleOld?: ILocalizedField;
  linkTextOld?: ILocalizedField;
  listItemsOld?: ILocalizedField[] | { en: Array<{ title?: string; content: string }>; he: Array<{ title?: string; content: string }> };
}

interface Guide {
  _id: string;
  slug: string;
  title: ILocalizedField;
  description: ILocalizedField;
  coverImage: string;
  relatedSports: string[];
  contentBlocks: ContentBlock[] | { en: ContentBlock[]; he: ContentBlock[] };
  tags: string[] | { en: string[]; he: string[] }; // Support both old (array) and new (localized) formats
  viewsCount: number;
  likesCount: number;
  rating: number;
  ratingCount: number;
  status: string;
  isFeatured: boolean;
  authorId: string;
  authorName: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  metaTitle?: ILocalizedField;
  metaDescription?: ILocalizedField;
  metaKeywords?: ILocalizedField;
}

function getLocalizedText(field: ILocalizedField | undefined, locale: string): string {
  if (!field) return '';
  return field[locale as 'en' | 'he'] || field.en || '';
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
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Content Block Renderer
 */
function ContentBlockRenderer({ blocks, locale }: { blocks: ContentBlock[] | { en: ContentBlock[]; he: ContentBlock[] }; locale: string }) {
  // Handle both old format (array) and new format (object with en/he)
  let sortedBlocks: ContentBlock[];
  if (Array.isArray(blocks)) {
    // Old format: single array with bilingual fields
    sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  } else if (blocks && typeof blocks === 'object' && ('en' in blocks || 'he' in blocks)) {
    // New format: separated by language - get blocks for current locale
    const langBlocks = blocks[locale as 'en' | 'he'] || blocks.en || blocks.he || [];
    sortedBlocks = Array.isArray(langBlocks) ? [...langBlocks].sort((a, b) => a.order - b.order) : [];
  } else {
    sortedBlocks = [];
  }

  return (
    <div>
      {sortedBlocks.map((item, index) => {
        switch (item.type) {
          case 'heading':
            const HeadingTag = item.headingLevel || 'h2';
            // New format: single string, Old format: ILocalizedField
            const headingText = typeof item.heading === 'string'
              ? item.heading
              : item.headingOld
              ? getLocalizedText(item.headingOld, locale)
              : '';
            // Enhanced heading styling for better readability using design system colors
            const headingClasses = {
              h2: 'text-3xl font-bold mt-12 mb-6 leading-tight text-heading dark:text-heading-dark',
              h3: 'text-2xl font-bold mt-10 mb-4 leading-snug text-heading dark:text-heading-dark',
              h4: 'text-xl font-bold mt-8 mb-3 leading-snug text-heading dark:text-heading-dark',
            };
            return (
              <HeadingTag
                key={index}
                className={headingClasses[HeadingTag as 'h2' | 'h3' | 'h4'] || headingClasses.h2}
              >
                {headingText}
              </HeadingTag>
            );

          case 'text':
            // New format: single string, Old format: ILocalizedField
            const textContent = typeof item.text === 'string' 
              ? item.text 
              : item.textOld
              ? getLocalizedText(item.textOld, locale)
              : '';
            // Parse markdown-style links [text](url)
            const parseTextWithLinks = (text: string) => {
              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
              const parts: (string | React.ReactElement)[] = [];
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
                    className="text-brand-main dark:text-brand-dark font-medium underline hover:no-underline transition-all"
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
            
            // Enhanced paragraph styling for better readability using design system colors
            return (
              <p key={index} className="text-base leading-relaxed text-content dark:text-content-dark mb-6">
                {parseTextWithLinks(textContent)}
              </p>
            );

          case 'list':
            const ListTag = item.listType === 'numbered' ? 'ol' : 'ul';
            const isBulletList = item.listType !== 'numbered';
            const isRTL = locale === 'he';
            // Enhanced list styling for better readability
            return (
              <ListTag key={index} className={`my-6 ${isBulletList ? 'list-none' : ''}`}>
                {(() => {
                  // New format: array of { title?, content }
                  if (item.listItems && Array.isArray(item.listItems) && item.listItems.length > 0) {
                    const firstItem = item.listItems[0];
                    if (typeof firstItem === 'object' && 'content' in firstItem && !('en' in firstItem) && !('he' in firstItem)) {
                      // New format: array of { title?, content }
                      return item.listItems.map((listItem: { title?: string; content: string }, itemIndex: number) => {
                        const paddingClass = isRTL ? 'pl-4 pr-0' : 'pr-4 pl-0';
                        const bulletPositionClass = isRTL ? 'right-0' : 'left-0';
                        const contentPaddingClass = isBulletList ? (isRTL ? 'pr-4' : 'pl-4') : '';
                        return (
                          <li key={itemIndex} className={`my-4 relative ${paddingClass} leading-relaxed text-content dark:text-content-dark`}>
                            {isBulletList && (
                              <span className={`absolute ${bulletPositionClass} top-0 text-brand-main dark:text-brand-dark`}>•</span>
                            )}
                            <div className={contentPaddingClass}>
                              {listItem.title && <div className="text-md font-bold text-heading dark:text-heading-dark">{listItem.title}</div>}
                              {listItem.content}
                            </div>
                          </li>
                        );
                      });
                    }
                  }
                  
                  // Old format: ILocalizedField array or object with en/he
                  const listItems = item.listItemsOld || item.listItems;
                  if (!listItems) return null;
                  
                  if (Array.isArray(listItems) && listItems.length > 0) {
                    const firstItem = listItems[0];
                    // Old format: array of ILocalizedField
                    if (typeof firstItem === 'object' && ('en' in firstItem || 'he' in firstItem)) {
                      return (listItems as ILocalizedField[]).map((listItem: ILocalizedField, itemIndex: number) => {
                        const paddingClass = isRTL ? 'pl-4 pr-0' : 'pr-4 pl-0';
                        const bulletPositionClass = isRTL ? 'right-0' : 'left-0';
                        const contentPaddingClass = isBulletList ? (isRTL ? 'pr-4' : 'pl-4') : '';
                        return (
                          <li key={itemIndex} className={`my-4 relative ${paddingClass} leading-relaxed text-content dark:text-content-dark`}>
                            {isBulletList && (
                              <span className={`absolute ${bulletPositionClass} top-0 text-brand-main dark:text-brand-dark`}>•</span>
                            )}
                            <div className={contentPaddingClass}>
                              {getLocalizedText(listItem, locale)}
                            </div>
                          </li>
                        );
                      });
                    }
                  }
                  
                  // Very old format: object with en/he arrays
                  if (typeof listItems === 'object' && !Array.isArray(listItems) && 'en' in listItems) {
                    const items = (listItems as any)[locale as 'en' | 'he'] || [];
                    return items.map((listItem: any, itemIndex: number) => {
                      const paddingClass = isRTL ? 'pl-4 pr-0' : 'pr-4 pl-0';
                      const bulletPositionClass = isRTL ? 'right-0' : 'left-0';
                      const contentPaddingClass = isBulletList ? (isRTL ? 'pr-4' : 'pl-4') : '';
                      if (typeof listItem === 'object' && 'content' in listItem) {
                        return (
                          <li key={itemIndex} className={`my-4 relative ${paddingClass} leading-relaxed text-content dark:text-content-dark`}>
                            {isBulletList && (
                              <span className={`absolute ${bulletPositionClass} top-0 text-brand-main dark:text-brand-dark`}>•</span>
                            )}
                            <div className={contentPaddingClass}>
                              {listItem.title && <div className="text-lg font-semibold text-heading dark:text-heading-dark mb-1">{listItem.title}</div>}
                              {listItem.content}
                            </div>
                          </li>
                        );
                      }
                      return (
                        <li key={itemIndex} className={`my-4 relative ${paddingClass} leading-relaxed text-content dark:text-content-dark`}>
                          {isBulletList && (
                            <span className={`absolute ${bulletPositionClass} top-0 text-brand-main dark:text-brand-dark`}>•</span>
                          )}
                          <div className={contentPaddingClass}>
                            {listItem}
                          </div>
                        </li>
                      );
                    });
                  }
                  return null;
                })()}
              </ListTag>
            );

          case 'image':
            // New format: single strings, Old format: ILocalizedField
            const imageAlt = typeof item.imageAlt === 'string'
              ? item.imageAlt
              : item.imageAltOld
              ? getLocalizedText(item.imageAltOld, locale)
              : '';
            const imageCaption = typeof item.imageCaption === 'string'
              ? item.imageCaption
              : item.imageCaptionOld
              ? getLocalizedText(item.imageCaptionOld, locale)
              : '';
            
            // Enhanced figure styling for better readability
            const imageElement = item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={imageAlt || imageCaption || 'Guide image'}
                width={800}
                height={450}
                className={`w-full h-auto rounded-lg ${item.imageLinkUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            ) : null;
            
            return (
              <figure key={index} className="my-8">
                {item.imageLinkUrl ? (
                  <a
                    href={item.imageLinkUrl}
                    target={item.imageLinkExternal ? '_blank' : '_self'}
                    rel={item.imageLinkExternal ? 'noopener noreferrer' : undefined}
                  >
                    {imageElement}
                  </a>
                ) : (
                  imageElement
                )}
                {imageCaption && (
                  <figcaption className="text-center text-sm text-content-secondary dark:text-content-secondary-dark mt-3">
                    {imageCaption}
                  </figcaption>
                )}
              </figure>
            );

          case 'video':
            // New format: single string, Old format: ILocalizedField
            const videoTitle = typeof item.videoTitle === 'string'
              ? item.videoTitle
              : item.videoTitleOld
              ? getLocalizedText(item.videoTitleOld, locale)
              : '';
            
            return (
              <div key={index} className="my-8">
                {item.videoUrl && (
                  <>
                    {item.videoUrl.includes('youtube.com') || item.videoUrl.includes('youtu.be') ? (
                      <YouTubeEmbed url={item.videoUrl} />
                    ) : (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg">
                        <video
                          src={item.videoUrl}
                          controls
                          className="w-full h-full"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    {videoTitle && (
                      <p className="text-sm text-content-secondary dark:text-content-secondary-dark mt-3 text-center">{videoTitle}</p>
                    )}
                  </>
                )}
              </div>
            );

          case 'link':
            // New format: single string, Old format: ILocalizedField
            const linkText = typeof item.linkText === 'string'
              ? item.linkText
              : item.linkTextOld
              ? getLocalizedText(item.linkTextOld, locale)
              : item.linkUrl || '';
            // Enhanced link styling for better readability
            return (
              <p key={index} className="my-6">
                <Link
                  href={item.linkUrl || '#'}
                  target={item.linkExternal ? '_blank' : '_self'}
                  rel={item.linkExternal ? 'noopener noreferrer' : undefined}
                  className="text-brand-main dark:text-brand-dark font-medium no-underline hover:underline transition-colors"
                >
                  {linkText}
                  {item.linkExternal && <ExternalLink className="w-4 h-4 inline ml-1" />}
                </Link>
              </p>
            );

          case 'code':
            // Enhanced code block styling for better readability using design system colors
            return (
              <pre key={index} className="bg-background-dark dark:bg-background-dark text-content-dark rounded-lg p-4 overflow-x-auto my-6 shadow-lg">
                <code className="text-sm font-mono">{item.code}</code>
              </pre>
            );

          case 'divider':
            // Enhanced divider styling for better readability using design system colors
            return (
              <hr key={index} className="my-12 border-t border-border dark:border-border-dark" />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * Main Guide Page Component
 */
export default function GuidePage() {
  const params = useParams();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const slug = params.slug as string;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuide = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/guides/${slug}?locale=${locale}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Guide not found');
        } else {
          setError('Failed to load guide');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setGuide(data.guide);
    } catch (err) {
      console.error('Error fetching guide:', err);
      setError('Failed to load guide');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuide();
  }, [slug, locale]);

  // Calculate SEO metadata (safe to call even if guide is null)
  const guideTitle = guide ? getLocalizedText(guide.title, locale) : '';
  const guideDescription = guide ? getLocalizedText(guide.description, locale) : '';
  
  // Get locale-specific SEO metadata
  const metaTitle = guide?.metaTitle 
    ? getLocalizedText(guide.metaTitle, locale) 
    : guideTitle || 'Guide';
  const metaDescription = guide?.metaDescription 
    ? getLocalizedText(guide.metaDescription, locale) 
    : guideDescription || '';
  const metaKeywords = guide?.metaKeywords 
    ? getLocalizedText(guide.metaKeywords, locale) 
    : '';
  
  // Get locale-specific tags for keywords
  let tagsForKeywords: string[] = [];
  if (guide?.tags) {
    if (Array.isArray(guide.tags)) {
      tagsForKeywords = guide.tags;
    } else if (typeof guide.tags === 'object' && 'en' in guide.tags) {
      const localizedTags = guide.tags as { en: string[]; he: string[] };
      tagsForKeywords = localizedTags[locale as 'en' | 'he'] || localizedTags.en || localizedTags.he || [];
    }
  }
  
  // Combine metaKeywords with tags
  const allKeywords = metaKeywords 
    ? `${metaKeywords}${tagsForKeywords.length > 0 ? `, ${tagsForKeywords.join(', ')}` : ''}`
    : tagsForKeywords.join(', ');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.com';
  const canonicalUrl = guide ? `${siteUrl}/${locale}/guides/${guide.slug}` : '';
  const alternateEnUrl = guide ? `${siteUrl}/en/guides/${guide.slug}` : '';
  const alternateHeUrl = guide ? `${siteUrl}/he/guides/${guide.slug}` : '';
  const ogImage = guide?.coverImage 
    ? (guide.coverImage.startsWith('http') ? guide.coverImage : `${siteUrl}${guide.coverImage}`) 
    : `${siteUrl}/og-default.jpg`;

  // Set SEO meta tags dynamically - must be called before any conditional returns
  useEffect(() => {
    if (!guide) {
      // Reset to default title if no guide
      document.title = 'Guide - ENBOSS';
      return;
    }

    // Update document title
    document.title = metaTitle;

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Helper function to set or update link tag
    const setLinkTag = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang 
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]`;
      let link = document.querySelector(selector);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (hreflang) link.setAttribute('hreflang', hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Basic meta tags
    setMetaTag('description', metaDescription);
    if (allKeywords) {
      setMetaTag('keywords', allKeywords);
    }

    // Canonical and alternate links
    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
      setLinkTag('alternate', alternateEnUrl, 'en');
      setLinkTag('alternate', alternateHeUrl, 'he');
      setLinkTag('alternate', alternateEnUrl, 'x-default');
    }

    // Open Graph tags
    setMetaTag('og:title', metaTitle, true);
    setMetaTag('og:description', metaDescription, true);
    setMetaTag('og:image', ogImage, true);
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }
    setMetaTag('og:type', 'article', true);
    setMetaTag('og:locale', locale === 'he' ? 'he_IL' : 'en_US', true);
    if (locale === 'en') {
      setMetaTag('og:locale:alternate', 'he_IL', true);
    } else {
      setMetaTag('og:locale:alternate', 'en_US', true);
    }
    if (guide.authorName) {
      setMetaTag('article:author', guide.authorName, true);
    }
    if (guide.publishedAt) {
      setMetaTag('article:published_time', guide.publishedAt, true);
    }
    if (guide.updatedAt) {
      setMetaTag('article:modified_time', guide.updatedAt, true);
    }

    // Article tags - remove existing article:tag meta tags first
    const existingArticleTags = document.querySelectorAll('meta[property="article:tag"]');
    existingArticleTags.forEach(tag => tag.remove());
    
    // Add new article:tag meta tags
    tagsForKeywords.forEach((tag) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'article:tag');
      meta.setAttribute('content', tag);
      document.head.appendChild(meta);
    });

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', metaTitle);
    setMetaTag('twitter:description', metaDescription);
    setMetaTag('twitter:image', ogImage);
  }, [guide, metaTitle, metaDescription, allKeywords, canonicalUrl, alternateEnUrl, alternateHeUrl, ogImage, locale, tagsForKeywords]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text dark:text-text-dark mb-4">
            {error || 'Guide not found'}
          </h1>
          <Link
            href={`/${locale}/guides`}
            className="text-brand-main hover:text-brand-main/80 dark:text-brand-dark"
          >
            ← Back to Guides
          </Link>
        </div>
      </div>
    );
  }

  // At this point, guide is guaranteed to exist, so we can safely use it
  const publishedDate = guide.publishedAt
    ? new Date(guide.publishedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Generate structured data
  const structuredData = generateArticleStructuredData({
    title: guide.title,
    description: guide.description,
    coverImage: guide.coverImage,
    authorName: guide.authorName,
    publishedAt: guide.publishedAt,
    modifiedAt: guide.updatedAt,
    rating: guide.rating,
    ratingCount: guide.ratingCount,
    slug: guide.slug,
    locale,
    siteUrl,
  });

  // Handle content blocks - use the appropriate language blocks
  // New format: { en: ContentBlock[], he: ContentBlock[] }
  // Old format: ContentBlock[] (with bilingual fields)
  const contentBlocksToRender = Array.isArray(guide.contentBlocks)
    ? guide.contentBlocks // Old format: single array with bilingual fields
    : (guide.contentBlocks && typeof guide.contentBlocks === 'object' && ('en' in guide.contentBlocks || 'he' in guide.contentBlocks))
    ? guide.contentBlocks[locale as 'en' | 'he'] || guide.contentBlocks.en || guide.contentBlocks.he || [] // New format: separated by language
    : [];

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-background dark:bg-background-dark">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: tCommon('guides') || 'Guides', href: '/guides' },
            { label: guideTitle },
          ]}
        />

        <main className="min-h-screen w-full flex-1 mx-auto text-text dark:text-text-dark">
          <div className="p-6 py-36 mx-auto">
            {/* Header - Meta information outside article */}
            <header className="mb-8">
            {guide.isFeatured && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-main/10 text-brand-main dark:bg-brand-main/20 dark:text-brand-dark mb-4">
                <Star className="w-4 h-4 mr-1" />
                Featured
              </span>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-text/70 dark:text-text-dark/70 mb-6">
              {guide.authorName && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{guide.authorName}</span>
                </div>
              )}

              {publishedDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{publishedDate}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{guide.viewsCount.toLocaleString()} views</span>
              </div>

              {guide.ratingCount > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>
                    {guide.rating.toFixed(1)} ({guide.ratingCount} {guide.ratingCount === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
              )}

              {guide.likesCount > 0 && (
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>{guide.likesCount} likes</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {(() => {
              // Handle both old format (array) and new format (localized object)
              let tagsToDisplay: string[] = [];
              if (Array.isArray(guide.tags)) {
                // Old format: single array
                tagsToDisplay = guide.tags;
              } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
                // New format: localized object - get tags for current locale
                const localizedTags = guide.tags as { en: string[]; he: string[] };
                tagsToDisplay = localizedTags[locale as 'en' | 'he'] || localizedTags.en || localizedTags.he || [];
              }
              
              return tagsToDisplay.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <Tag className="w-4 h-4 text-text/70 dark:text-text-dark/70" />
                  {tagsToDisplay.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm bg-sidebar-hover dark:bg-sidebar-hover-dark text-text dark:text-text-dark/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Related Sports */}
            {guide.relatedSports.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {guide.relatedSports.map((sport) => (
                  <span
                    key={sport}
                    className="px-3 py-1 rounded-full text-sm bg-brand-main/10 text-brand-main dark:bg-brand-main/20 dark:text-brand-dark"
                  >
                    {sport}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Cover Image */}
          {guide.coverImage && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card dark:bg-card-dark mb-8">
              <Image
                src={guide.coverImage}
                alt={guideTitle}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          )}

            {/* Content Blocks */}
            <article className="prose prose-lg prose-slate dark:prose-invert max-w-4xl mx-auto 
              prose-headings:font-bold prose-headings:text-heading dark:prose-headings:text-heading-dark
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-0 prose-h1:leading-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:leading-tight
              prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4 prose-h3:leading-snug
              prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-3 prose-h4:leading-snug
              prose-p:text-base prose-p:leading-relaxed prose-p:mb-6 prose-p:text-content dark:prose-p:text-content-dark
              prose-a:text-brand-main dark:prose-a:text-brand-dark prose-a:font-medium prose-a:no-underline hover:prose-a:underline
              prose-strong:text-heading dark:prose-strong:text-heading-dark prose-strong:font-semibold
              prose-ul:my-6 prose-ol:my-6
              prose-li:my-2 prose-li:leading-relaxed prose-li:text-content dark:prose-li:text-content-dark
              prose-figure:my-8 prose-img:rounded-lg prose-img:shadow-lg
              prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-content-secondary dark:prose-figcaption:text-content-secondary-dark prose-figcaption:mt-3
              prose-pre:bg-background-dark dark:prose-pre:bg-background-dark prose-pre:text-content-dark
              prose-code:text-sm prose-code:bg-background-secondary dark:prose-code:bg-background-secondary-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-hr:my-12 prose-hr:border-border dark:prose-hr:border-border-dark
              prose-blockquote:border-l-4 prose-blockquote:border-brand-main dark:prose-blockquote:border-brand-dark prose-blockquote:pl-4 prose-blockquote:italic">
              <h1>{guideTitle}</h1>
              <p className="text-lg leading-relaxed text-content-secondary dark:text-content-secondary-dark mb-8">{guideDescription}</p>
              <ContentBlockRenderer blocks={contentBlocksToRender} locale={locale} />
            </article>

            {/* Footer Actions */}
            <div className="mt-12 pt-8 border-t border-border dark:border-border-dark">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Link
                  href={`/${locale}/guides`}
                  className="text-brand-main hover:text-brand-main/80 dark:text-brand-dark hover:dark:text-brand-dark/80 font-medium"
                >
                  ← Back to Guides
                </Link>

                <div className="flex items-center gap-4">
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Like this guide"
                  >
                    <Heart className="w-5 h-5" />
                    <span>{guide.likesCount}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

