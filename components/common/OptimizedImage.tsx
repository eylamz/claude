'use client';

import { useMemo, useRef, useState } from 'react';

interface OptimizedImageProps {
  src: string; // Cloudinary public_id, e.g., folder/image
  alt: string;
  sizes?: string; // CSS sizes attribute
  priority?: boolean;
  quality?: number; // 1-100 (overrides auto)
  onLoad?: () => void;
  className?: string;
  imgClassName?: string;
  width?: number; // optional fixed width
  height?: number; // optional fixed height
  fallbackSrc?: string; // optional custom fallback
}

// Default widths used for srcset generation
const WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920];

const getConnectionQuality = () => {
  try {
    const nav = (navigator as any);
    if (nav?.connection) {
      const { effectiveType, saveData } = nav.connection as { effectiveType?: string; saveData?: boolean };
      if (saveData) return 'low';
      if (effectiveType && (/^slow-2g|2g$/.test(effectiveType))) return 'low';
      if (effectiveType && (/^3g$/.test(effectiveType))) return 'med';
    }
  } catch {}
  return 'high';
};

const getCloudName = () => process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function buildCloudinaryURL(
  publicId: string,
  opts: { w?: number; q?: number | 'auto'; f?: 'auto' | 'auto:good' | 'auto:format'; dpr?: number; progressive?: boolean }
) {
  const cloudName = getCloudName();
  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const parts: string[] = [];
  // Auto format and DPR
  parts.push('f_auto');
  if (opts.progressive) parts.push('fl_progressive');
  if (opts.dpr) parts.push(`dpr_${opts.dpr}`);
  if (opts.w) parts.push(`w_${opts.w}`);
  if (opts.q) parts.push(typeof opts.q === 'number' ? `q_${opts.q}` : 'q_auto');
  // Fill mode can be added by callers via additional transforms if needed
  const transform = parts.join(',');
  return `${base}/${transform}/${publicId}`;
}

export default function OptimizedImage({
  src,
  alt,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
  priority = false,
  quality,
  onLoad,
  className = '',
  imgClassName = '',
  width,
  height,
  fallbackSrc = '/placeholder-image.jpg',
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const maxRetries = 2;
  const connection = useRef(getConnectionQuality());

  // Decide quality based on connection if not provided
  const resolvedQuality = useMemo(() => {
    if (typeof quality === 'number') return quality;
    if (connection.current === 'low') return 45;
    if (connection.current === 'med') return 65;
    return 80;
  }, [quality]);

  // Build srcset for responsive images
  const srcSet = useMemo(() => {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(2, Math.ceil(window.devicePixelRatio)) : 1;
    return WIDTHS.map((w) => `${buildCloudinaryURL(src, { w, q: resolvedQuality, dpr, progressive: true })} ${w}w`).join(', ');
  }, [src, resolvedQuality]);

  // Primary src (pick a reasonable baseline width)
  const primarySrc = useMemo(() => {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? Math.min(2, Math.ceil(window.devicePixelRatio)) : 1;
    const baseline = 1024;
    return buildCloudinaryURL(src, { w: baseline, q: resolvedQuality, dpr, progressive: true });
  }, [src, resolvedQuality]);

  // Very low-res preview for blur placeholder
  const previewSrc = useMemo(() => buildCloudinaryURL(src, { w: 20, q: 10, dpr: 1, progressive: false }), [src]);

  // Retry logic
  const handleError = () => {
    if (retryCount < maxRetries) {
      setRetryCount((c) => c + 1);
      setTimeout(() => {
        // Force reload by tweaking query param to bust cache
        const url = new URL(primarySrc, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
        url.searchParams.set('r', String(Date.now()));
        const set = new Image();
        set.src = url.toString();
      }, 200);
    } else {
      setErrored(true);
    }
  };

  const handleLoad = () => {
    setLoaded(true);
    if (onLoad) onLoad();
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={width && height ? { width, height } : undefined}>
      {/* Skeleton while preview not ready */}
      {!previewLoaded && !loaded && !errored && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}

      {/* Preview (very low-res) */}
      {!errored && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover blur-sm scale-105 transition-opacity duration-300 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setPreviewLoaded(true)}
        />
      )}

      {/* Main image */}
      {!errored ? (
        <img
          src={primarySrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`relative w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <img
          src={fallbackSrc}
          alt={alt}
          className={`relative w-full h-full object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
}



