import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary configuration types
 */
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  secure: boolean;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  eager?: string[];
  allowedFormats?: string[];
  maxFileSize?: number;
}

export interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string | number;
  format?: string;
  gravity?: string;
  radius?: string;
  effect?: string;
  overlay?: string;
  underlay?: string;
}

/**
 * Get Cloudinary configuration from environment
 */
function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be set'
    );
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    secure: true, // Use HTTPS
  };
}

/**
 * Configure Cloudinary
 */
export function configureCloudinary(): void {
  const config = getCloudinaryConfig();
  
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    ...(config.secure !== undefined && { secure: config.secure }),
  } as Record<string, unknown>);
}

/**
 * Transformation presets
 */
export const TRANSFORMATION_PRESETS = {
  /**
   * Auto: Best quality, automatic optimization
   */
  auto: {
    quality: 'auto',
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Thumbnail: 150x150, auto quality, face focus
   */
  thumbnail: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Small: 300x300, optimized for web
   */
  small: {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  },

  /**
   * Product image: 800x800, high quality
   */
  product: {
    width: 800,
    height: 800,
    crop: 'limit',
    quality: 90,
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Product detail: 1200x1200, very high quality
   */
  productDetail: {
    width: 1200,
    height: 1200,
    crop: 'limit',
    quality: 95,
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Gallery: 1920x1080, responsive
   */
  gallery: {
    width: 1920,
    height: 1080,
    crop: 'limit',
    quality: 'auto',
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Mobile optimized: 400x400, compressed
   */
  mobile: {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 80,
    fetch_format: 'auto',
  },

  /**
   * Avatar: 200x200, face focus
   */
  avatar: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto',
  },

  /**
   * Hero banner: Full width, optimized
   */
  hero: {
    width: 1920,
    height: 1080,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
    dpr: 'auto',
  },

  /**
   * Responsive image with width breakpoints
   */
  responsive: {
    transformation: [
      { width: 400, crop: 'scale' },
      { width: 800, crop: 'scale' },
      { width: 1200, crop: 'scale' },
      { width: 1920, crop: 'scale' },
    ],
    quality: 'auto',
    fetch_format: 'auto',
  },
} as const;

/**
 * Upload presets configuration
 */
export const UPLOAD_PRESETS = {
  /**
   * Product image upload preset
   */
  product: {
    folder: 'products',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10485760, // 10MB
    transformation: TRANSFORMATION_PRESETS.product,
  },

  /**
   * Gallery image upload preset
   */
  gallery: {
    folder: 'gallery',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10485760, // 10MB
    transformation: TRANSFORMATION_PRESETS.gallery,
  },

  /**
   * Avatar upload preset
   */
  avatar: {
    folder: 'avatars',
    allowedFormats: ['jpg', 'jpeg', 'png'],
    maxFileSize: 2097152, // 2MB
    transformation: TRANSFORMATION_PRESETS.avatar,
  },

  /**
   * General upload preset
   */
  general: {
    folder: 'uploads',
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxFileSize: 10485760, // 10MB
  },
} as const;

/**
 * Quality presets
 */
export const QUALITY_PRESETS = {
  high: 95,
  medium: 85,
  low: 75,
  auto: 'auto' as const,
} as const;

/**
 * Format presets
 */
export const FORMAT_PRESETS = {
  auto: 'auto' as const,
  webp: 'webp',
  jpg: 'jpg',
  png: 'png',
} as const;

/**
 * Initialize Cloudinary
 */
configureCloudinary();

export { cloudinary };

