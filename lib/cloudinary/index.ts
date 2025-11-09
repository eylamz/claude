/**
 * Cloudinary module exports
 */

// Configuration
export { configureCloudinary, TRANSFORMATION_PRESETS, UPLOAD_PRESETS, QUALITY_PRESETS, FORMAT_PRESETS } from './config';
export type { CloudinaryConfig, UploadOptions, TransformationOptions } from './config';

// Upload utilities
export {
  uploadImage,
  uploadMultiple,
  deleteImage,
  deleteMultiple,
  getOptimizedUrl,
  getThumbnailUrl,
  getProductUrl,
  getGalleryUrl,
  getMobileUrl,
  getResponsiveSrcSet,
  getImageInfo,
  uploadWithPreset,
} from './upload';
export type { UploadResult, UploadError } from './upload';

// Multer utilities
export {
  upload,
  uploadSingle,
  uploadMultipleMiddleware,
  uploadFields,
  uploadToCloudinary,
  memoryStorage,
  cloudinaryStorage,
  validateFileSize,
  validateFileType,
  multerErrorHandler,
  processUploadedFile,
  runMulterMiddleware,
} from './multer';
export type { ProcessedFile } from './multer';

// Cloudinary instance
export { cloudinary } from './config';

