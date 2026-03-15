'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, ChevronLeft, X } from 'lucide-react';
import { Icon } from '@/components/icons';
import { Button, Skeleton, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { generateArticleStructuredData, getGuideMetaFromData } from '@/lib/seo/utils';
import type { GuideData } from '@/lib/api/guides';
import { sanitizeUrl } from '@/lib/utils/sanitizeUrl';
import {
  parseGuidesVersion,
  isGuidesCacheFresh,
  getGuidesFetchedAtReadable,
} from '@/lib/search-from-cache';
import { featureFlags } from '@/lib/config/feature-flags';
import { AnimatePresence, motion } from 'framer-motion';
import { GuideQuizSection } from '@/components/guides/GuideQuizSection';
import { Separator } from '@/components/ui';

interface ILocalizedField {
  en: string;
  he: string;
}

interface ContentBlock {
  type: 'text' | 'heading' | 'list' | 'image' | 'video' | 'link' | 'code' | 'divider';
  order: number;
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
  tags: string[] | { en: string[]; he: string[] };
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
  metaImage?: string;
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

/**
 * Content Block Renderer - Duolingo Style
 */
function ContentBlockRenderer({ blocks, locale }: { blocks: ContentBlock[] | { en: ContentBlock[]; he: ContentBlock[] }; locale: string }) {
  let sortedBlocks: ContentBlock[];
  if (Array.isArray(blocks)) {
    sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  } else if (blocks && typeof blocks === 'object' && ('en' in blocks || 'he' in blocks)) {
    const langBlocks = blocks[locale as 'en' | 'he'] || blocks.en || blocks.he || [];
    sortedBlocks = Array.isArray(langBlocks) ? [...langBlocks].sort((a, b) => a.order - b.order) : [];
  } else {
    sortedBlocks = [];
  }

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

      const safeHref = sanitizeUrl(match[2]);
      if (safeHref) {
        parts.push(
          <a
            key={key++}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-color dark:text-brand-dark font-medium underline decoration-2 underline-offset-2 hover:decoration-brand-main/50 transition-all"
          >
            {match[1]}
          </a>
        );
      } else {
        // If URL is unsafe, render just the link text
        parts.push(match[1]);
      }

      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="space-y-6">
      {sortedBlocks.map((item, index) => {
        switch (item.type) {
          case 'heading':
            const HeadingTag = item.headingLevel || 'h2';
            const headingText = typeof item.heading === 'string'
              ? item.heading
              : item.headingOld
              ? getLocalizedText(item.headingOld, locale)
              : '';
            
            // Duolingo-style heading classes - clean and bold
            const headingClasses = {
              h2: `text-[1.225rem] sm:text-3xl ${locale === 'he' ? 'font-bold' : 'font-extrabold'} mt-12 mb-4 text-gray-900 dark:text-white`,
              h3: 'text-xl sm:text-[1.225rem] font-bold mt-10 mb-3 text-gray-900 dark:text-white',
              h4: 'text-lg sm:text-xl font-bold mt-8 mb-2 text-gray-900 dark:text-white',
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
            const textContent = typeof item.text === 'string' 
              ? item.text 
              : item.textOld
              ? getLocalizedText(item.textOld, locale)
              : '';
            
            return (
              <p key={index} className="text-[1rem] leading-relaxed text-gray-700 dark:text-gray-300">
                {parseTextWithLinks(textContent)}
              </p>
            );

          case 'list':
            const ListTag = item.listType === 'numbered' ? 'ol' : 'ul';
            const isNumbered = item.listType === 'numbered';
            const isRTL = locale === 'he';
            
            return (
              <ListTag 
                key={index} 
                className={`my-6 space-y-3 ${isNumbered ? 'list-decimal' : 'list-none'} ${isRTL ? 'pr-0' : 'pl-0'}`}
              >
                {(() => {
                  if (item.listItems && Array.isArray(item.listItems) && item.listItems.length > 0) {
                    const firstItem = item.listItems[0];
                    if (typeof firstItem === 'object' && 'content' in firstItem && !('en' in firstItem) && !('he' in firstItem)) {
                      return item.listItems.map((listItem: { title?: string; content: string }, itemIndex: number) => (
                        <li 
                          key={itemIndex} 
                          className={`text-lg text-gray-700 dark:text-gray-300 leading-relaxed flex gap-3`}
                        >
                          {!isNumbered && (
                            <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
                          )}
                          <div>
                          {listItem.title && (
                            <>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {listItem.title}
                              </span>
                              <br />
                            </>
                          )}
                          {listItem.content}

                          </div>
                        </li>
                      ));
                    }
                  }
                  
                  const listItems = item.listItemsOld || item.listItems;
                  if (!listItems) return null;
                  
                  if (Array.isArray(listItems) && listItems.length > 0) {
                    const firstItem = listItems[0];
                    if (typeof firstItem === 'object' && ('en' in firstItem || 'he' in firstItem)) {
                      return (listItems as ILocalizedField[]).map((listItem: ILocalizedField, itemIndex: number) => (
                        <li 
                          key={itemIndex} 
                          className={`text-lg text-gray-700 dark:text-gray-300 leading-relaxed flex gap-3`}
                        >
                          {!isNumbered && (
                            <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
                          )}
                          <span>{getLocalizedText(listItem, locale)}</span>
                        </li>
                      ));
                    }
                  }
                  
                  if (typeof listItems === 'object' && !Array.isArray(listItems) && 'en' in listItems) {
                    const items = (listItems as any)[locale as 'en' | 'he'] || [];
                    return items.map((listItem: any, itemIndex: number) => (
                      <li 
                        key={itemIndex} 
                        className={`text-lg text-gray-700 dark:text-gray-300 leading-relaxed flex gap-3 ${isRTL ? '' : ''}`}
                      >
                        {!isNumbered && (
                          <span className="text-brand-main dark:text-brand-dark font-bold flex-shrink-0">•</span>
                        )}
                        <div>
                          {typeof listItem === 'object' && 'content' in listItem ? (
                            <>
                              {listItem.title && (
                                <span className="font-bold text-gray-900 dark:text-white ">{listItem.title} /n </span>
                              )}
                              {listItem.content}
                            </>
                          ) : (
                            listItem
                          )}
                        </div>
                      </li>
                    ));
                  }
                  return null;
                })()}
              </ListTag>
            );

          case 'image':
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
            
            const imageElement = item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={imageAlt || imageCaption || 'Guide image'}
                width={800}
                height={450}
                className={`w-full h-auto rounded-2xl ${item.imageLinkUrl ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
              />
            ) : null;
            
            const safeImageLinkUrl = sanitizeUrl(item.imageLinkUrl);

            return (
              <figure key={index} className="my-8">
                {safeImageLinkUrl ? (
                  <a
                    href={safeImageLinkUrl}
                    target={item.imageLinkExternal ? '_blank' : '_self'}
                    rel={item.imageLinkExternal ? 'noopener noreferrer' : undefined}
                  >
                    {imageElement}
                  </a>
                ) : (
                  imageElement
                )}
                {imageCaption && (
                  <figcaption className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3 italic">
                    {imageCaption}
                  </figcaption>
                )}
              </figure>
            );

          case 'video':
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
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center italic">{videoTitle}</p>
                    )}
                  </>
                )}
              </div>
            );

          case 'link':
            const linkText = typeof item.linkText === 'string'
              ? item.linkText
              : item.linkTextOld
              ? getLocalizedText(item.linkTextOld, locale)
              : item.linkUrl || '';

            const safeLinkUrl = sanitizeUrl(item.linkUrl);
            
            return (
              <p key={index} className="my-6">
                <Link
                  href={safeLinkUrl || '#'}
                  target={item.linkExternal ? '_blank' : '_self'}
                  rel={item.linkExternal ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-1 text-brand-main dark:text-brand-dark font-semibold underline decoration-2 underline-offset-2 hover:decoration-brand-main/50 transition-colors"
                >
                  {linkText}
                  {item.linkExternal && <ExternalLink className="w-4 h-4" />}
                </Link>
              </p>
            );

          case 'code':
            return (
              <pre key={index} className="bg-gray-900 text-gray-100 rounded-2xl p-6 overflow-x-auto my-8">
                <code className="text-sm font-mono">{item.code}</code>
              </pre>
            );

          case 'divider':
            return (
              <hr key={index} className="my-12 border-t-2 border-gray-200 dark:border-gray-700" />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * Main Guide Page Component - Duolingo Style
 */
export default function GuidePage() {
  const params = useParams();
  const locale = useLocale();
  const { status } = useSession();
  const tGuides = useTranslations('guides');
  const slug = params.slug as string;

  // Same sport translation as guides list (guides.sports.*)
  const getSportTranslation = (sport: string): string => {
    if (!sport) return sport;
    const sportKey = sport.toLowerCase();
    const translated = tGuides(`sports.${sportKey}` as any);
    if (translated && translated !== `sports.${sportKey}` && !translated.startsWith('sports.')) {
      return translated;
    }
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  };

  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheInitialized, setCacheInitialized] = useState(false);
  const [, setCurrentVersion] = useState<number | null>(null);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizModalClosing, setQuizModalClosing] = useState(false);
  const [showAlreadyCompletedPopup, setShowAlreadyCompletedPopup] = useState(false);
  const [userAlreadyPassedQuiz, setUserAlreadyPassedQuiz] = useState(false);
  const [userNoQuizAvailable, setUserNoQuizAvailable] = useState(false);
  const [showNoQuizPopup, setShowNoQuizPopup] = useState(false);
  const quizModalCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alreadyCompletedPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noQuizPopupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const handleGoToQuiz = useCallback(async () => {
    if (!guide?.slug || status !== 'authenticated') return;
    try {
      const quizRes = await fetch(`/api/guides/${encodeURIComponent(guide.slug)}/quiz`);
      if (!quizRes.ok) {
        setUserNoQuizAvailable(true);
        setShowNoQuizPopup(true);
        if (noQuizPopupTimeoutRef.current) clearTimeout(noQuizPopupTimeoutRef.current);
        noQuizPopupTimeoutRef.current = setTimeout(() => {
          setShowNoQuizPopup(false);
          noQuizPopupTimeoutRef.current = null;
        }, 2500);
        return;
      }
      const attemptRes = await fetch(`/api/guides/${encodeURIComponent(guide.slug)}/quiz/attempt`, {
        credentials: 'include',
      });
      if (attemptRes.ok) {
        const data = await attemptRes.json();
        if (data.attempt?.passed) {
          setUserAlreadyPassedQuiz(true);
          setShowAlreadyCompletedPopup(true);
          if (alreadyCompletedPopupTimeoutRef.current) clearTimeout(alreadyCompletedPopupTimeoutRef.current);
          alreadyCompletedPopupTimeoutRef.current = setTimeout(() => {
            setShowAlreadyCompletedPopup(false);
            alreadyCompletedPopupTimeoutRef.current = null;
          }, 2500);
          return;
        }
      }
    } catch {
      // ignore
    }
    setShowQuizModal(true);
  }, [guide?.slug, status]);

  const closeQuizModal = useCallback(() => {
    if (quizModalClosing) return;
    setQuizModalClosing(true);
    quizModalCloseTimeoutRef.current = setTimeout(() => {
      setShowQuizModal(false);
      setQuizModalClosing(false);
      quizModalCloseTimeoutRef.current = null;
    }, 320);
  }, [quizModalClosing]);

  useEffect(() => {
    return () => {
      if (quizModalCloseTimeoutRef.current) clearTimeout(quizModalCloseTimeoutRef.current);
      if (alreadyCompletedPopupTimeoutRef.current) clearTimeout(alreadyCompletedPopupTimeoutRef.current);
      if (noQuizPopupTimeoutRef.current) clearTimeout(noQuizPopupTimeoutRef.current);
    };
  }, []);

  // On load: if no quiz or user already passed, show button as disabled with tooltip
  useEffect(() => {
    if (!guide?.slug || status !== 'authenticated') return;
    let cancelled = false;
    fetch(`/api/guides/${encodeURIComponent(guide.slug)}/quiz`)
      .then((quizRes) => {
        if (!quizRes.ok && !cancelled) setUserNoQuizAvailable(true);
        return quizRes.ok
          ? fetch(`/api/guides/${encodeURIComponent(guide.slug)}/quiz/attempt`, { credentials: 'include' }).then((r) => r.ok ? r.json() : null)
          : Promise.resolve(null);
      })
      .then((data) => {
        if (!cancelled && data?.attempt?.passed) setUserAlreadyPassedQuiz(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [guide?.slug, status]);

  // Check version and cache on mount (refetch only after 1 hour from last fetch)
  useEffect(() => {
    const checkVersionAndCache = async () => {
      const cacheKey = 'guides_cache';
      const versionKey = 'guides_version';
      const cachedData = localStorage.getItem(cacheKey);
      const cachedVersionRaw = localStorage.getItem(versionKey);
      const { version: storedVersionNum, fetchedAt } = parseGuidesVersion(cachedVersionRaw);

      if (!cachedData || !cachedVersionRaw) {
        try {
          const response = await fetch('/api/guides?limit=100');
          if (response.ok) {
            const data = await response.json();
            const currentVersion = data.version || 1;
            const allGuides = data.guides || [];
            localStorage.setItem(cacheKey, JSON.stringify(allGuides));
            localStorage.setItem(
              versionKey,
              JSON.stringify({ version: currentVersion, fetchedAt: getGuidesFetchedAtReadable() })
            );
            setCurrentVersion(currentVersion);
          }
        } catch (error) {
          console.error('Error fetching guides for cache:', error);
        }
      } else if (isGuidesCacheFresh(fetchedAt)) {
        setCurrentVersion(storedVersionNum ?? parseInt(cachedVersionRaw, 10));
      } else {
        try {
          const versionResponse = await fetch('/api/guides?versionOnly=true');
          if (versionResponse.ok) {
            const versionData = await versionResponse.json();
            const fetchedVersion = versionData.version || 1;
            setCurrentVersion(fetchedVersion);
            const storedVersion = storedVersionNum ?? parseInt(cachedVersionRaw, 10);

            if (storedVersion !== fetchedVersion) {
              const response = await fetch('/api/guides?limit=100');
              if (response.ok) {
                const data = await response.json();
                const newVersion = data.version || 1;
                const allGuides = data.guides || [];
                localStorage.setItem(cacheKey, JSON.stringify(allGuides));
                localStorage.setItem(
                  versionKey,
                  JSON.stringify({ version: newVersion, fetchedAt: getGuidesFetchedAtReadable() })
                );
                setCurrentVersion(newVersion);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to check guides version', error);
        }
      }

      setCacheInitialized(true);
    };

    checkVersionAndCache();
  }, []);

  const fetchGuide = async () => {
    if (!cacheInitialized) return; // Wait for cache to initialize
    
    setLoading(true);
    setError(null);

    const cacheKey = 'guides_cache';
    const versionKey = 'guides_version';

    const getCachedGuide = (): GuideData | null => {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const allCachedGuides: GuideData[] = JSON.parse(raw);
        return allCachedGuides.find((g: GuideData) => g.slug === slug) ?? null;
      } catch {
        return null;
      }
    };

    const refreshGuidesCache = async (): Promise<void> => {
      const response = await fetch('/api/guides?limit=100');
      if (!response.ok) return;
      const data = await response.json();
      const currentVersion = data.version || 1;
      const allGuides = data.guides || [];
      localStorage.setItem(cacheKey, JSON.stringify(allGuides));
      localStorage.setItem(
        versionKey,
        JSON.stringify({ version: currentVersion, fetchedAt: getGuidesFetchedAtReadable() })
      );
    };

    // 1) Try to find guide in cache
    let cachedGuide = getCachedGuide();

    // 2) If not in cache, refresh guides_cache then look again
    if (!cachedGuide) {
      await refreshGuidesCache();
      cachedGuide = getCachedGuide();
    }

    // 3) If still no data for this guide after refresh, show 404
    if (!cachedGuide) {
      setError('Guide not found');
      setLoading(false);
      return;
    }

    // Found in cache (or after refresh) – optional fast display from cache
    let tags: string[] | { en: string[]; he: string[] } = { en: [], he: [] };
    if (cachedGuide.tags) {
      if (Array.isArray(cachedGuide.tags)) {
        tags = cachedGuide.tags;
      } else if (typeof cachedGuide.tags === 'object' && 'en' in cachedGuide.tags) {
        tags = cachedGuide.tags;
      }
    }
    const initialGuide: Guide = {
      _id: cachedGuide.id,
      slug: cachedGuide.slug,
      title: cachedGuide.title,
      description: cachedGuide.description || { en: '', he: '' },
      coverImage: cachedGuide.coverImage || '',
      relatedSports: cachedGuide.relatedSports || [],
      contentBlocks: { en: [], he: [] },
      tags,
      viewsCount: cachedGuide.viewsCount || 0,
      likesCount: 0,
      rating: cachedGuide.rating || 0,
      ratingCount: cachedGuide.ratingCount || 0,
      status: 'published',
      isFeatured: false,
      authorId: '',
      authorName: 'Unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGuide(initialGuide);

    // 4) Fetch full guide data from API (contentBlocks etc.)
    try {
      const response = await fetch(`/api/guides/${slug}?locale=${locale}`);
      if (!response.ok) {
        if (response.status === 404) {
          setGuide(null);
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
    }
    setLoading(false);
  };

  useEffect(() => {
    if (cacheInitialized) {
      fetchGuide();
    }
  }, [slug, locale, cacheInitialized]);

  // SEO calculations
  const guideTitle = guide ? getLocalizedText(guide.title, locale) : '';
  const guideDescription = guide ? getLocalizedText(guide.description, locale) : '';
  
  const metaTitle = guide?.metaTitle 
    ? getLocalizedText(guide.metaTitle, locale) 
    : guideTitle || 'Guide';
  const metaDescription = guide?.metaDescription 
    ? getLocalizedText(guide.metaDescription, locale) 
    : guideDescription || '';
  const metaKeywords = guide?.metaKeywords 
    ? getLocalizedText(guide.metaKeywords, locale) 
    : '';
  
  let tagsForKeywords: string[] = [];
  if (guide?.tags) {
    if (Array.isArray(guide.tags)) {
      tagsForKeywords = guide.tags;
    } else if (typeof guide.tags === 'object' && 'en' in guide.tags) {
      const localizedTags = guide.tags as { en: string[]; he: string[] };
      tagsForKeywords = localizedTags[locale as 'en' | 'he'] || localizedTags.en || localizedTags.he || [];
    }
  }
  
  const allKeywords = metaKeywords 
    ? `${metaKeywords}${tagsForKeywords.length > 0 ? `, ${tagsForKeywords.join(', ')}` : ''}`
    : tagsForKeywords.join(', ');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enboss.co';
  const canonicalUrl = guide ? `${siteUrl}/${locale}/guides/${guide.slug}` : '';
  const alternateEnUrl = guide ? `${siteUrl}/en/guides/${guide.slug}` : '';
  const alternateHeUrl = guide ? `${siteUrl}/he/guides/${guide.slug}` : '';
  const metaImageForOg = guide ? getGuideMetaFromData(guide, locale, guide.slug).image : '';
  const ogImage = metaImageForOg
    ? (metaImageForOg.startsWith('http') ? metaImageForOg : `${siteUrl}${metaImageForOg}`)
    : `${siteUrl}/og-guide-default.jpg`;

  // Set SEO meta tags dynamically
  useEffect(() => {
    if (!guide) {
      document.title = 'Guide - ENBOSS';
      return;
    }

    document.title = metaTitle;

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

    setMetaTag('description', metaDescription);
    if (allKeywords) {
      setMetaTag('keywords', allKeywords);
    }

    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
      setLinkTag('alternate', alternateEnUrl, 'en');
      setLinkTag('alternate', alternateHeUrl, 'he');
      setLinkTag('alternate', alternateEnUrl, 'x-default');
    }

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

    const existingArticleTags = document.querySelectorAll('meta[property="article:tag"]');
    existingArticleTags.forEach(tag => tag.remove());
    
    tagsForKeywords.forEach((tag) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'article:tag');
      meta.setAttribute('content', tag);
      document.head.appendChild(meta);
    });

    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', metaTitle);
    setMetaTag('twitter:description', metaDescription);
    setMetaTag('twitter:image', ogImage);
  }, [guide, metaTitle, metaDescription, allKeywords, canonicalUrl, alternateEnUrl, alternateHeUrl, ogImage, locale, tagsForKeywords]);

  // Loading state - skeleton mirrors actual page structure
  if (loading) {
    return (
      <div className="min-h-screen bg-background dark:bg-background-dark">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Article header skeleton */}
          <header className="my-10">
            <Skeleton className="h-9 sm:h-10 md:h-12 w-full max-w-2xl mb-4 rounded-lg" />
            <Skeleton className="h-5 w-full max-w-xl mb-2 rounded" />
            <Skeleton className="h-5 w-4/5 max-w-lg mb-6 rounded" />
            <div className="flex items-center gap-2 mb-8">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          </header>

          {/* Cover image skeleton - same aspect as real cover */}
          <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-10">
            <Skeleton className="absolute inset-0 rounded-2xl" />
          </div>

          {/* Article content skeleton - paragraphs + heading + more paragraphs */}
          <article className="mb-12 space-y-6">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-7 w-48 mt-8 mb-4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </article>

          {/* Tags section skeleton */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-6 w-14 rounded-lg" />
              <Skeleton className="h-6 w-18 rounded-lg" />
            </div>
          </div>

          {/* Related sports card skeleton */}
          <div className="bg-card dark:bg-card-dark rounded-2xl p-6 mb-8">
            <Skeleton className="h-4 w-28 mb-3 rounded" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>

          {/* Back to Guides button skeleton */}
          <div className="text-center pt-8">
            <Skeleton className="h-12 w-44 mx-auto rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !guide) {
    const backHref = `/${locale}/guides`;
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center px-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'מדריך לא נמצא' : 'Guide not found'}
          </h1>
          <Button
            variant="primary"
            disabled={isNavigatingBack}
            className={`inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full flex-shrink-0 min-w-[110px] ${locale === 'he' ? 'flex-row' : 'flex-row'}`}
            onClick={() => {
              setIsNavigatingBack(true);
              router.push(backHref);
            }}
          >
            {isNavigatingBack ? (
              <LoadingSpinner size={20} variant="brandText" className="!h-5 !w-5" />
            ) : (
              <>
                <ChevronLeft className={`w-4 h-4 ${locale === 'he' ? 'rotate-180' : ''}`} />
                {locale === 'he' ? 'חזרה למדריכים' : 'Back to Guides'}
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

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

  // Handle content blocks
  const contentBlocksToRender = Array.isArray(guide.contentBlocks)
    ? guide.contentBlocks
    : (guide.contentBlocks && typeof guide.contentBlocks === 'object' && ('en' in guide.contentBlocks || 'he' in guide.contentBlocks))
    ? guide.contentBlocks[locale as 'en' | 'he'] || guide.contentBlocks.en || guide.contentBlocks.he || []
    : [];

  // Get tags for display
  let tagsToDisplay: string[] = [];
  if (Array.isArray(guide.tags)) {
    tagsToDisplay = guide.tags;
  } else if (guide.tags && typeof guide.tags === 'object' && 'en' in guide.tags) {
    const localizedTags = guide.tags as { en: string[]; he: string[] };
    tagsToDisplay = localizedTags[locale as 'en' | 'he'] || localizedTags.en || localizedTags.he || [];
  }

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-background dark:bg-background-dark">
        {/* Sticky Back Navigation - Duolingo style */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Article Header - Duolingo Style */}
          <header className="my-10">
            {/* Title - Large and bold */}
            <h1 className={`text-3xl sm:text-4xl md:text-5xl ${locale === 'he' ? 'font-bold' : 'font-extrabold'} text-gray-900 dark:text-white leading-tight mb-4`}>
              {guideTitle}
            </h1>

            {/* Description/Subtitle - Hook line */}
            <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
              {guideDescription}
            </p>

            {/* Share */}
            <div className="flex flex-wrap items-center justify-end gap-3 text-sm -mt-6">
              <Button
                variant="brand"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({
                      title: guideTitle,
                      text: `${guideTitle} - ${locale === 'he' ? 'מדריך' : 'Guide'}`,
                      url: typeof window !== 'undefined' ? window.location.href : canonicalUrl,
                    }).catch((error) => {
                      console.error('Error sharing:', error);
                    });
                  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : canonicalUrl);
                  }
                }}
                className="px-2 py-1 rounded-lg font-medium flex-shrink-0 "
                aria-label={locale === 'he' ? 'שתף מדריך' : 'Share guide'}
              >
                <Icon name="shareBold" className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Cover Image - Full width with rounded corners */}
          {guide.coverImage && (
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-10">
              <Image
                src={guide.coverImage}
                alt={guideTitle}
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
              />
            </div>
          )}

          {/* Article Content */}
          <article className="mb-12">
            <ContentBlockRenderer blocks={contentBlocksToRender} locale={locale} />
          </article>

          {/* Tags Section - Duolingo Style */}
          {tagsToDisplay.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="tagBold" className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagsToDisplay.map((tag) => (
                  <Link
                    key={tag}
                    href={`/${locale}/guides?search=${encodeURIComponent(locale === 'he' ? 'תגית:' + tag : 'tag:' + tag)}`}
                    className="capitalize px-2 py-1 rounded-lg text-[12px] md:text-xs font-semibold bg-purple-bg dark:bg-purple-bg-dark text-purple dark:text-purple-dark border border-purple-border dark:border-purple-border-dark hover:bg-purple-hover-bg dark:hover:bg-purple-hover-bg-dark transition-colors duration-200"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related Sports - clickable, navigates to guides with sport filter */}
          {guide.relatedSports.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {tGuides('relatedSports')}
              </h3>
              <div className="flex flex-wrap gap-2 capitalize">
                {guide.relatedSports.map((sport) => (
                  <Link
                    key={sport}
                    href={`/${locale}/guides?sports=${encodeURIComponent(sport)}`}
                    className="capitalize px-2 py-1 rounded-lg text-sm font-semibold bg-teal-bg dark:bg-teal-bg-dark text-teal dark:text-teal-dark hover:bg-teal-hover-bg dark:hover:bg-teal-hover-bg-dark transition-colors border border-teal-border dark:border-teal-border-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    {getSportTranslation(sport)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back to Guides + Go to quiz (side by side) */}
          <div className="flex flex-wrap justify-center items-center gap-3 pt-8">
            <Button
              variant={featureFlags.guideQuizzes && status === 'authenticated' ? 'gray' : 'primary'}
              className="px-6 font-semibold inline-flex items-center gap-2"
              asChild
            >
              <Link
                href={`/${locale}/guides`}
                className={locale === 'he' ? 'flex-row-reverse' : 'flex-row-reverse'}
              >
                {locale === 'he' ? 'חזרה למדריכים' : 'Back to Guides'}
                <ChevronLeft className={`w-4 h-4 ${locale === 'he' ? 'rotate-180' : ''}`} />
              </Link>
            </Button>
            {featureFlags.guideQuizzes && status === 'authenticated' && (
              userAlreadyPassedQuiz ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="yellowBtn"
                          disabled
                          className="inline-flex items-center gap-2 px-6 font-semibold cursor-not-allowed opacity-70"
                        >
                {locale === 'he' ? 'בחן את עצמך' : 'Take the quiz'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" variant="yellow">
                      {locale === 'he' ? 'כבר הושלם' : 'Already completed'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : userNoQuizAvailable ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          variant="yellowBtn"
                          disabled
                          className="inline-flex items-center gap-2 px-6 font-semibold cursor-not-allowed opacity-70"
                        >
                         {locale === 'he' ? 'בחן את עצמך' : 'Take the quiz'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" variant="yellow">
                      {locale === 'he' ? 'אין בוחן למדריך זה' : 'No quiz available'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  variant="yellowBtn"
                  onClick={handleGoToQuiz}
                  className="inline-flex items-center gap-2 px-6 font-semibold"
                >
                {locale === 'he' ? 'בחן את עצמך' : 'Take the quiz'}
                </Button>
              )
            )}
          </div>
        </main>
      </div>

      {/* Quiz modal */}
      {showQuizModal && guide && (
        <div className={`fixed inset-0 z-50 overflow-y-auto ${quizModalClosing ? 'animate-fadeOut' : ''}`}>
          <div
            className={`fixed inset-0 bg-black/50 dark:bg-black/40 backdrop-blur-[2px] ${quizModalClosing ? 'animate-fadeOut' : ''}`}
            onClick={closeQuizModal}
            aria-hidden
          />
          <div className={`fixed inset-0 flex items-center justify-center p-4 pointer-events-none ${quizModalClosing ? 'animate-fadeOut' : ''}`}>
            <div
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-background dark:bg-background-dark pointer-events-auto ${quizModalClosing ? 'animate-fadeOut' : 'animate-scaleFadeUp'}`}
              role="dialog"
              aria-modal="true"
              aria-label={locale === 'he' ? `${guideTitle} בוחן` : `${guideTitle} quiz`}
            >
              <div className="sticky top-0 flex items-center justify-between z-10 bg-background dark:bg-background-dark pb-2">
                <h2 className="text-base font-bold text-text dark:text-text-dark">
                  {locale === 'he' ? `${guideTitle} בוחן` : `${guideTitle} quiz`}
                </h2>
                <button
                  type="button"
                  onClick={closeQuizModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={locale === 'he' ? 'סגור' : 'Close'}
                >
                  <X className="w-5 h-5 text-text dark:text-text-dark" />
                </button>
              </div>
              <Separator className="my-2" />
              <div className="min-h-[240px] pt-2">
                <GuideQuizSection
                  key={`quiz-modal-${guide.slug}`}
                  slug={guide.slug}
                  locale={locale}
                  inModal
                  onClose={closeQuizModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already completed quiz – thank you style popup (no error) */}
      <AnimatePresence>
        {showAlreadyCompletedPopup && (
          <motion.div
            key="quiz-already-completed-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="backdrop-blur-sm fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            aria-live="polite"
          >
            <div
              dir={locale === 'he' ? 'rtl' : 'ltr'}
              className="pointer-events-auto rounded-xl px-6 py-4 shadow-lg bg-sidebar dark:bg-sidebar-dark border border-border dark:border-border-dark text-center max-w-sm"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
            >
              <p className="text-base font-medium text-text dark:text-text-dark">
                {locale === 'he' ? 'כבר השלמת את הבוחן ✓' : "You've already completed this quiz ✓"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No quiz available – thank you style popup */}
      <AnimatePresence>
        {showNoQuizPopup && (
          <motion.div
            key="quiz-no-quiz-popup"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="backdrop-blur-sm fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            aria-live="polite"
          >
            <div
              dir={locale === 'he' ? 'rtl' : 'ltr'}
              className="pointer-events-auto rounded-xl px-6 py-4 shadow-lg bg-sidebar dark:bg-sidebar-dark border border-border dark:border-border-dark text-center max-w-sm"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
              }}
            >
              <p className="text-base font-medium text-text dark:text-text-dark">
                {locale === 'he' ? 'אין בוחן למדריך זה.' : 'No quiz available for this guide.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
