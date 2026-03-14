import { cloudinary, TRANSFORMATION_PRESETS } from './config';
import type { UploadOptions } from './config';
import type { UploadedFile } from './types';

/**
 * Upload result interface
 */
export interface UploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
  folder?: string;
  version: number;
  signature: string;
}

/**
 * Upload error interface
 */
export interface UploadError {
  message: string;
  error?: any;
}

/** Cloudinary returns snake_case; normalize to our UploadResult (camelCase). */
function normalizeUploadResult(raw: Record<string, unknown>): UploadResult {
  return {
    publicId: (raw.public_id as string) ?? '',
    secureUrl: (raw.secure_url as string) ?? (raw.secureUrl as string) ?? '',
    url: (raw.url as string) ?? '',
    width: (raw.width as number) ?? 0,
    height: (raw.height as number) ?? 0,
    format: (raw.format as string) ?? '',
    bytes: (raw.bytes as number) ?? 0,
    resourceType: (raw.resource_type as string) ?? 'image',
    folder: raw.folder as string | undefined,
    version: (raw.version as number) ?? 0,
    signature: (raw.signature as string) ?? '',
  };
}

/**
 * Upload a single image
 */
export async function uploadImage(
  file: UploadedFile | Buffer | string,
  folder: string = 'uploads',
  options?: UploadOptions
): Promise<UploadResult> {
  try {
    // If file is a Buffer (from multer), use it
    // If file is a string (URL), use it as source
    let uploadParams: any = {
      folder,
      ...options,
    };

    if (Buffer.isBuffer(file)) {
      if (!uploadParams.format) uploadParams.format = 'jpg';
      const streamOptions = {
        folder: uploadParams.folder,
        public_id: uploadParams.public_id ?? uploadParams.publicId,
        format: uploadParams.format,
        resource_type: 'auto',
      };
      const result = await new Promise<UploadResult>((resolve, reject) => {
        (cloudinary.uploader.upload_stream as (options: any, callback: (error: any, result: any) => void) => { end: (buffer: Buffer) => void })(
          streamOptions,
          (error: any, result: any) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(normalizeUploadResult(result));
            } else {
              reject(new Error('Upload failed'));
            }
          }
        ).end(file);
      });

      return result;
    } else if (typeof file === 'string') {
      const result = await cloudinary.uploader.upload(file, {
        ...uploadParams,
        resource_type: 'auto',
      });

      return normalizeUploadResult(result as Record<string, unknown>);
    } else {
      // Multer file object
      const fileBuffer = file.buffer;
      uploadParams.format = file.mimetype.split('/')[1];
      const streamOptions = {
        folder: uploadParams.folder,
        public_id: uploadParams.public_id ?? uploadParams.publicId,
        format: uploadParams.format,
        resource_type: 'auto',
      };
      const result = await new Promise<UploadResult>((resolve, reject) => {
        (cloudinary.uploader.upload_stream as (options: any, callback: (error: any, result: any) => void) => { end: (buffer: Buffer) => void })(
          streamOptions,
          (error: any, result: any) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(normalizeUploadResult(result));
            } else {
              reject(new Error('Upload failed'));
            }
          }
        ).end(fileBuffer);
      });

      return result;
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple images
 */
export async function uploadMultiple(
  files: UploadedFile[],
  folder: string = 'uploads',
  options?: UploadOptions
): Promise<UploadResult[]> {
  try {
    const uploadPromises = files.map(file => uploadImage(file, folder, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract Cloudinary public_id from a secure_url or upload URL.
 * Returns null if the URL is not a Cloudinary image URL.
 * Example: https://res.cloudinary.com/.../image/upload/v123/folder/id.webp → "folder/id"
 */
export function getPublicIdFromCloudinaryUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const path = match[1];
  const lastDot = path.lastIndexOf('.');
  return lastDot > -1 ? path.slice(0, lastDot) : path;
}

/**
 * Delete an image
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await (cloudinary.uploader.destroy as (publicId: string, options?: { resource_type?: string }) => Promise<any>)(publicId, {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Delete image error:', error);
    throw new Error(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete multiple images
 */
export async function deleteMultiple(publicIds: string[]): Promise<void> {
  try {
    await (cloudinary.uploader.destroy as (publicId: string, options?: { resource_type?: string }) => Promise<any>)(publicIds.join(','), {
      resource_type: 'image',
    });
  } catch (error) {
    console.error('Delete multiple images error:', error);
    throw new Error(`Failed to delete images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get optimized URL with transformations
 */
export function getOptimizedUrl(
  publicId: string,
  transformation: Record<string, any> = TRANSFORMATION_PRESETS.auto
): string {
  try {
    // Use auto transformation if none specified
    const trans = transformation.quality === 'auto' 
      ? TRANSFORMATION_PRESETS.auto 
      : transformation;

    return (cloudinary.url as (publicId: string, options?: Record<string, unknown>) => string)(publicId, {
      secure: true,
      ...trans,
    });
  } catch (error) {
    console.error('Get optimized URL error:', error);
    throw new Error(`Failed to generate URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get thumbnail URL
 */
export function getThumbnailUrl(publicId: string): string {
  return getOptimizedUrl(publicId, TRANSFORMATION_PRESETS.thumbnail);
}

/**
 * Get product URL
 */
export function getProductUrl(publicId: string): string {
  return getOptimizedUrl(publicId, TRANSFORMATION_PRESETS.product);
}

/**
 * Get gallery URL
 */
export function getGalleryUrl(publicId: string): string {
  return getOptimizedUrl(publicId, TRANSFORMATION_PRESETS.gallery);
}

/**
 * Get mobile URL
 */
export function getMobileUrl(publicId: string): string {
  return getOptimizedUrl(publicId, TRANSFORMATION_PRESETS.mobile);
}

/**
 * Get responsive image URLs for srcset
 */
export function getResponsiveSrcSet(publicId: string): string {
  const sizes = [400, 800, 1200, 1920];
  const urls = sizes.map(width => {
    return `${(cloudinary.url as (publicId: string, options?: Record<string, unknown>) => string)(publicId, {
      secure: true,
      width,
      crop: 'scale',
      quality: 'auto',
      fetch_format: 'auto',
      dpr: 'auto',
    })} ${width}w`;
  });

  return urls.join(', ');
}

/**
 * Get image info
 */
export async function getImageInfo(publicId: string): Promise<any> {
  try {
    const result = await (cloudinary.api as { resource: (publicId: string, options?: { resource_type?: string }) => Promise<any> }).resource(publicId, {
      resource_type: 'image',
    });
    return result;
  } catch (error) {
    console.error('Get image info error:', error);
    throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload with preset
 */
export async function uploadWithPreset(
  file: UploadedFile | Buffer | string,
  preset: 'thumbnail' | 'product' | 'gallery' | 'avatar',
  options?: UploadOptions
): Promise<UploadResult> {
  const transformations = {
    thumbnail: TRANSFORMATION_PRESETS.thumbnail,
    product: TRANSFORMATION_PRESETS.product,
    gallery: TRANSFORMATION_PRESETS.gallery,
    avatar: TRANSFORMATION_PRESETS.avatar,
  };

  const presetConfig = transformations[preset as keyof typeof transformations] || {};
  const folder = options?.folder || 'uploads';

  return uploadImage(file, folder, {
    ...options,
    eager: presetConfig.quality === 'auto' ? ['auto'] : undefined,
  });
}

