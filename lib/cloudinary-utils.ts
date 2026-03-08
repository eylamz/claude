/**
 * Optimize Cloudinary image URLs for delivery: modern format (WebP/AVIF), quality, and size.
 * Use for background images, hero carousel, and any non-Next/Image Cloudinary URL.
 */

const CLOUDINARY_UPLOAD = '/image/upload/';

export interface CloudinaryOptimizeOptions {
  /** Max width in pixels (enables responsive size + c_fill). Omit to keep original dimensions. */
  width?: number;
  /** Quality: 'auto' (recommended), or 1–100. Default 'auto'. */
  quality?: 'auto' | number;
  /** Crop mode when width is set. Default 'fill'. */
  crop?: 'fill' | 'scale' | 'fit';
}

/**
 * Returns an optimized Cloudinary URL with f_auto (WebP/AVIF), q_auto (or given quality),
 * and optional width/crop to reduce payload. Non-Cloudinary URLs are returned unchanged.
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: CloudinaryOptimizeOptions = {}
): string {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return url;
  }

  const idx = url.indexOf(CLOUDINARY_UPLOAD);
  if (idx === -1) return url;

  const base = url.slice(0, idx + CLOUDINARY_UPLOAD.length);
  const after = url.slice(idx + CLOUDINARY_UPLOAD.length);
  const parts = after.split('/');

  if (parts.length === 0) return url;

  const hasExistingTransforms = parts[0].includes('_');
  const transformParts: string[] = [];

  if (options.width != null) {
    const w = Math.round(options.width);
    transformParts.push(`w_${w}`);
    const crop = options.crop === 'scale' ? 'c_scale' : options.crop === 'fit' ? 'c_fit' : 'c_fill';
    transformParts.push(crop);
  }
  transformParts.push('f_auto');
  if (options.quality !== undefined) {
    transformParts.push(
      options.quality === 'auto' ? 'q_auto:good' : `q_${Math.min(100, Math.max(1, options.quality))}`
    );
  } else {
    transformParts.push('q_auto:good');
  }

  const newTransform = transformParts.join(',');
  const rest = hasExistingTransforms ? parts.slice(1) : parts;
  const path = rest.length ? [newTransform, ...rest].join('/') : newTransform;

  return `${base}${path}`;
}

/** Default widths for hero carousel by breakpoint (match hero-carousel MAX_WIDTH_MAP). */
export const HERO_CAROUSEL_WIDTHS = { mobile: 275, tablet: 690, desktop: 980 } as const;

/** Width for community section tiles (aspect-square, max ~384px per tile; 600 covers 1.5x density). */
export const COMMUNITY_TILE_WIDTH = 600;

/** Width for final CTA background (typical viewport; keep under 1200 to reduce payload). */
export const CTA_BG_WIDTH = 1000;

/** Width for FixedBanner background image. */
export const FIXED_BANNER_WIDTH = 1000;
