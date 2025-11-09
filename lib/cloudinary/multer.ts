import { cloudinary } from './config';
import type { UploadedFile } from './types';

// Note: multer and multer-storage-cloudinary need to be installed
// npm install multer @types/multer multer-storage-cloudinary

// Mock types for development
type Multer = any;

let multer: Multer;
let CloudinaryStorageClass: any;

try {
  multer = require('multer');
  CloudinaryStorageClass = require('multer-storage-cloudinary');
} catch (error) {
  // If multer is not installed, provide stub functions
  console.warn('Multer not installed. Please install: npm install multer @types/multer multer-storage-cloudinary');
}

/**
 * Multer configuration with memory storage for Next.js API routes
 * Files are stored in memory as buffers before uploading to Cloudinary
 */
export const memoryStorage = multer?.memoryStorage() || { _handleFile: () => {}, _removeFile: () => {} };

/**
 * Multer instance with memory storage
 */
export const upload = multer ? multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10, // Max 10 files
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
}) : null;

/**
 * Single file upload middleware
 */
export const uploadSingle = upload?.single('image') || null;

/**
 * Multiple files upload middleware
 */
export const uploadMultipleMiddleware = upload?.array('images', 10) || null;

/**
 * Fields upload middleware
 */
export const uploadFields = upload?.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
]) || null;

/**
 * Cloudinary storage configuration (optional - for direct upload to Cloudinary)
 */
export const cloudinaryStorage = CloudinaryStorageClass ? new CloudinaryStorageClass({
  cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      {
        width: 1920,
        height: 1080,
        crop: 'limit',
        quality: 'auto',
      },
    ],
  },
}) : null;

/**
 * Multer with Cloudinary storage (for direct upload)
 */
export const uploadToCloudinary = cloudinaryStorage && multer ? multer({
  storage: cloudinaryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
}) : null;

/**
 * File size validation
 */
export const validateFileSize = (file: UploadedFile, maxSize: number = 10 * 1024 * 1024): boolean => {
  return file.size <= maxSize;
};

/**
 * File type validation
 */
export const validateFileType = (file: UploadedFile, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']): boolean => {
  return allowedTypes.includes(file.mimetype);
};

/**
 * Custom error handler for multer
 */
export const multerErrorHandler = (error: any, _req: any, res: any, next: any) => {
  if (error && error.code) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
};

/**
 * Process uploaded file and prepare for Cloudinary upload
 */
export interface ProcessedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export function processUploadedFile(file: UploadedFile): ProcessedFile {
  if (!file) {
    throw new Error('No file provided');
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
  if (!validateFileType(file, allowedTypes)) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  // Validate file size (10MB max)
  if (!validateFileSize(file, 10 * 1024 * 1024)) {
    throw new Error('File size exceeds 10MB limit.');
  }

  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    originalname: file.originalname,
    size: file.size,
  };
}

/**
 * Middleware wrapper for Next.js API routes
 */
export function runMulterMiddleware(req: any, res: any, middleware: any): Promise<void> {
  return new Promise((resolve, reject) => {
    middleware(req, res, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

