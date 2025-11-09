# Cloudinary Image Management Setup

This directory contains Cloudinary configuration and utilities for image upload, transformation, and management.

## Overview

- **Cloudinary SDK** - Image upload and management
- **Transformation Presets** - Pre-configured image sizes and formats
- **Multer Integration** - File upload handling
- **Optimized URLs** - Automatic optimization and responsive images

## Installation

Install required dependencies:

```bash
npm install cloudinary multer @types/multer multer-storage-cloudinary
```

## Environment Variables

Add these to your `.env.local`:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Get your credentials from [Cloudinary Console](https://console.cloudinary.com/).

## File Structure

```
lib/cloudinary/
├── config.ts          # Cloudinary configuration
├── upload.ts          # Upload utilities
├── multer.ts          # Multer configuration
├── types.d.ts         # Type definitions
├── index.ts           # Module exports
└── README.md          # This file
```

## Quick Start

### Basic Upload

```typescript
import { uploadImage, getOptimizedUrl } from '@/lib/cloudinary';

// Upload image
const result = await uploadImage(fileBuffer, 'products');
console.log(result.publicId);
console.log(result.secureUrl);
```

### Transformations

```typescript
import { getThumbnailUrl, getProductUrl, getMobileUrl } from '@/lib/cloudinary';

const publicId = 'products/example';

// Get different sizes
const thumbnail = getThumbnailUrl(publicId); // 150x150
const product = getProductUrl(publicId); // 800x800
const mobile = getMobileUrl(publicId); // 400x400
```

## API Usage

### Upload Single Image

```typescript
import { uploadImage } from '@/lib/cloudinary';

const result = await uploadImage(file, 'products', {
  publicId: 'custom-id',
  overwrite: false,
});
```

### Upload Multiple Images

```typescript
import { uploadMultiple } from '@/lib/cloudinary';

const results = await uploadMultiple(files, 'products');
```

### Get Optimized URL

```typescript
import { getOptimizedUrl, TRANSFORMATION_PRESETS } from '@/lib/cloudinary';

const url = getOptimizedUrl('products/image', {
  width: 800,
  height: 800,
  crop: 'limit',
  quality: 'auto',
});
```

### Delete Image

```typescript
import { deleteImage } from '@/lib/cloudinary';

await deleteImage('products/image');
```

### Delete Multiple Images

```typescript
import { deleteMultiple } from '@/lib/cloudinary';

await deleteMultiple(['products/image1', 'products/image2']);
```

## Transformation Presets

### Thumbnail (150x150)
```typescript
getThumbnailUrl(publicId);
// Optimized for thumbnails, face detection
```

### Product (800x800)
```typescript
getProductUrl(publicId);
// High quality, web optimized
```

### Gallery (1920x1080)
```typescript
getGalleryUrl(publicId);
// Full resolution gallery images
```

### Mobile (400x400)
```typescript
getMobileUrl(publicId);
// Compressed for mobile
```

### Responsive Images

```typescript
import { getResponsiveSrcSet } from '@/lib/cloudinary';

const srcset = getResponsiveSrcSet(publicId);
// Generates: url1 400w, url2 800w, url3 1200w, url4 1920w

// Use in HTML:
<img src="..." srcset={srcset} sizes="100vw" />
```

## Multer Configuration

### Setup

```typescript
import { uploadSingle, uploadMultipleMiddleware } from '@/lib/cloudinary';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Handle file upload
  const formData = await request.formData();
  const file = formData.get('image') as File;
  
  // Upload to Cloudinary
  const result = await uploadImage(file, 'uploads');
  
  return Response.json({ url: result.secureUrl });
}
```

### File Validation

```typescript
import { validateFileSize, validateFileType, processUploadedFile } from '@/lib/cloudinary';

const processedFile = processUploadedFile(file);

// Validate
if (!validateFileSize(processedFile, 5 * 1024 * 1024)) {
  throw new Error('File too large');
}

if (!validateFileType(processedFile, ['image/jpeg', 'image/png'])) {
  throw new Error('Invalid file type');
}
```

## Transformation Presets

### Available Presets

- **thumbnail**: 150x150, face detection
- **small**: 300x300, optimized
- **product**: 800x800, high quality
- **productDetail**: 1200x1200, very high quality
- **gallery**: 1920x1080, responsive
- **mobile**: 400x400, compressed
- **avatar**: 200x200, face focus
- **hero**: 1920x1080, banner
- **responsive**: Multiple breakpoints

### Custom Transformations

```typescript
const url = getOptimizedUrl(publicId, {
  width: 1200,
  height: 800,
  crop: 'fill',
  quality: 90,
  format: 'webp',
  effect: 'sharpen',
});
```

## Environment Variables

### Required

- `CLOUDINARY_CLOUD_NAME` - Your cloud name
- `CLOUDINARY_API_KEY` - Your API key
- `CLOUDINARY_API_SECRET` - Your API secret

### Get from Cloudinary Console

1. Go to [Cloudinary Console](https://console.cloudinary.com/)
2. Click on your dashboard
3. Copy credentials from "Settings" → "General"

## Best Practices

### 1. Use Appropriate Presets

```typescript
// For thumbnails
const thumb = getThumbnailUrl(publicId);

// For product images
const product = getProductUrl(publicId);

// For gallery
const gallery = getGalleryUrl(publicId);
```

### 2. Optimize for Web

```typescript
// Always use quality: 'auto'
const url = getOptimizedUrl(publicId, {
  quality: 'auto',
  fetch_format: 'auto',
});
```

### 3. Responsive Images

```typescript
// Generate srcset
const srcset = getResponsiveSrcSet(publicId);

<img src={baseUrl} srcset={srcset} sizes="100vw" alt="Product" />
```

### 4. Organize by Folder

```typescript
// Organize uploads
const result = await uploadImage(file, 'products/2024/01');
// Results in: products/2024/01/image-name
```

### 5. Delete Unused Images

```typescript
// Clean up old images
await deleteImage('products/old-product');
```

## Features

### Automatic Optimization

- **Quality**: Auto-quality based on content
- **Format**: Automatic format selection (WebP, AVIF, etc.)
- **DPR**: Automatic device pixel ratio
- **Responsive**: Multiple size generation

### Face Detection

Avatar and thumbnail presets use automatic face detection for better cropping.

### Image Info

```typescript
import { getImageInfo } from '@/lib/cloudinary';

const info = await getImageInfo(publicId);
console.log(info.width, info.height, info.bytes);
```

## Error Handling

```typescript
try {
  const result = await uploadImage(file, 'uploads');
} catch (error) {
  console.error('Upload failed:', error);
  // Handle error
}
```

## File Size Limits

Default limits:
- Max file size: 10MB
- Max files: 10 per request
- Allowed formats: jpg, jpeg, png, webp, gif

## Production Checklist

- [ ] Install Cloudinary SDK
- [ ] Add environment variables
- [ ] Configure upload presets
- [ ] Test image uploads
- [ ] Test transformations
- [ ] Configure CDN
- [ ] Set up monitoring
- [ ] Configure backups

## Related Files

- `lib/models/Product.ts` - Product model with images
- `lib/models/User.ts` - User model with avatars
- `components/ui/` - Image display components

## Troubleshooting

### Issue: "Cloudinary not configured"
**Solution**: Add environment variables to `.env.local`

### Issue: "File too large"
**Solution**: Increase `maxFileSize` in multer config

### Issue: "Invalid file type"
**Solution**: Check `allowedFormats` in upload preset

## Support

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary Console](https://console.cloudinary.com/)
- [Transformation Reference](https://cloudinary.com/documentation/image_transformations)

