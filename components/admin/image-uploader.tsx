'use client';

import { useState, useRef, useCallback } from 'react';
interface ImageData {
  url: string;
  publicId: string;
  alt?: string;
}

/** Resolves upload preset and public_id so uploads go to the correct folder with no prefix.
 * Prefer signed upload via /api/upload/cloudinary-sign (admin-only, no preset exposed).
 * Fallback: Cloudinary unsigned preset per context when signed upload is not available.
 * - Skateparks: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_SKATEPARKS (preset folder = skateparks), else default + folder param.
 * - Guides: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_GUIDES (preset folder = guideAssets). If not set, use default + folder param
 *   (works only if default preset has no folder set; otherwise create a preset with folder=guideAssets and set _GUIDES).
 * - Events: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EVENTS (preset folder = EventAssets).
 */
function getUploadConfig(folder: string): {
  uploadPreset: string;
  sendFolderInRequest: boolean;
  /** public_id: only filename when using request folder; only filename when using preset folder. */
  publicIdPrefix: string;
} {
  const defaultPreset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '').trim();
  if (folder === 'skateparks') {
    const preset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_SKATEPARKS || '').trim();
    if (preset) return { uploadPreset: preset, sendFolderInRequest: false, publicIdPrefix: '' };
  }
  if (folder === 'guideAssets') {
    const preset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_GUIDES || '').trim();
    if (preset) return { uploadPreset: preset, sendFolderInRequest: false, publicIdPrefix: '' };
    // Cloudinary: preset folder overrides the request folder. If the default preset has folder=skateparks,
    // uploads would go there. So we require a dedicated guides preset for guideAssets.
    return { uploadPreset: '', sendFolderInRequest: true, publicIdPrefix: '' };
  }
  if (folder === 'eventAssets') {
    const preset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EVENTS || '').trim();
    if (preset) return { uploadPreset: preset, sendFolderInRequest: false, publicIdPrefix: '' };
  }
  // Default: send folder in request; public_id = filename only (Cloudinary places at folder/filename)
  return { uploadPreset: defaultPreset, sendFolderInRequest: true, publicIdPrefix: '' };
}

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface ImageUploaderProps {
  images: ImageData[];
  onUpload: (images: ImageData[]) => void;
  maxImages?: number;
  folder: string;
  maxFileSizeBytes?: number;
}

export function ImageUploader({ images, onUpload, maxImages = 10, folder, maxFileSizeBytes }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const validateFile = (file: File): string | null => {
    // Strict size limit (default 5MB) to reduce abuse risk when using unsigned preset fallback.
    // Can be overridden per-usage via maxFileSizeBytes (e.g. 1MB for OG images).
    const limitBytes = maxFileSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
    if (file.size > limitBytes) {
      return `File size exceeds ${Math.round((limitBytes / (1024 * 1024)) * 10) / 10}MB limit`;
    }

    // Image types only (no raw, video, or other)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, or WebP images are allowed';
    }

    return null;
  };

  const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions (max 2000px)
          const maxDimension = 2000;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadToCloudinary = async (
    file: File,
    publicId: string,
    preset: string,
    sendFolderInRequest: boolean,
    folderParam: string
  ): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();

      const doUpload = (formData: FormData, cloudNameForUrl: string) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress((prev) => ({ ...prev, [publicId]: percentComplete }));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              publicId: response.public_id,
            });
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error?.message || errorResponse.error || errorMessage;
            } catch {
              errorMessage = `Upload failed with status ${xhr.status}: ${xhr.statusText}`;
            }
            console.error('Cloudinary upload error:', { status: xhr.status, response: xhr.responseText });
            reject(new Error(errorMessage));
          }
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[publicId];
            return next;
          });
        });
        xhr.addEventListener('error', () => {
          reject(new Error('Upload error'));
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[publicId];
            return next;
          });
        });
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudNameForUrl}/image/upload`);
        xhr.send(formData);
      };

      const buildFormDataSigned = (sig: { signature: string; timestamp: number; apiKey: string; folder: string; public_id: string }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', sig.apiKey);
        formData.append('timestamp', String(sig.timestamp));
        formData.append('signature', sig.signature);
        formData.append('folder', sig.folder);
        formData.append('public_id', sig.public_id);
        return formData;
      };

      const buildFormDataUnsigned = () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', preset);
        if (sendFolderInRequest) formData.append('folder', folderParam);
        formData.append('public_id', publicId);
        return formData;
      };

      (async () => {
        if (!cloudName) {
          const errorMsg =
            'Cloudinary cloud name is not configured.\n\n' +
            'Please add to your .env.local file:\n' +
            'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name\n\n' +
            'After adding, restart your Next.js development server.';
          reject(new Error(errorMsg));
          return;
        }

        // Prefer signed upload (admin-only, no preset exposed)
        try {
          const signRes = await fetch('/api/upload/cloudinary-sign', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderParam, public_id: publicId }),
          });
          if (signRes.ok) {
            const sig = await signRes.json();
            doUpload(buildFormDataSigned(sig), sig.cloudName);
            return;
          }
        } catch {
          // Fall through to unsigned
        }

        // Fallback: unsigned preset (preset is visible in client; restrict in Cloudinary dashboard)
        if (!preset) {
          const isGuides = folderParam === 'guideAssets';
          const errorMsg = isGuides
            ? 'Guide uploads require a dedicated Cloudinary preset so images go to the guideAssets folder.\n\n' +
              '1. In Cloudinary Dashboard → Settings → Upload, create a new unsigned preset.\n' +
              '2. Set its Folder to: guideAssets\n' +
              '3. In .env.local add: NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_GUIDES=your-new-preset-name'
            : 'Cloudinary upload preset is not configured.\n\n' +
              'Add NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (and per-folder presets if needed) to .env.local, or configure server credentials (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) for signed uploads.';
          reject(new Error(errorMsg));
          return;
        }

        doUpload(buildFormDataUnsigned(), cloudName);
      })();
    });
  };

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      setErrors([]);

      // Check if adding these files would exceed max images
      if (images.length + fileArray.length > maxImages) {
        setErrors([`Maximum ${maxImages} images allowed`]);
        return;
      }

      // Validate files
      const validationErrors: string[] = [];
      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) validationErrors.push(`${file.name}: ${error}`);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setUploading(true);

      try {
        const config = getUploadConfig(folder);
        const uploadPromises = fileArray.map(async (file, _index) => {
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const publicId = config.publicIdPrefix + fileNameWithoutExt;
          const compressedFile = await compressImage(file);
          return await uploadToCloudinary(
            compressedFile,
            publicId,
            config.uploadPreset,
            config.sendFolderInRequest,
            folder
          );
        });

        const uploadedImages = await Promise.all(uploadPromises);
        onUpload([...images, ...uploadedImages]);
      } catch (error) {
        console.error('Upload error:', error);
        setErrors(['Failed to upload images. Please try again.']);
      } finally {
        setUploading(false);
      }
    },
    [images, onUpload, maxImages, folder]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      dragCounter.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index);
      onUpload(newImages);
    },
    [images, onUpload]
  );

  const handleSetPrimary = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newImages = [...images];
      const [primary] = newImages.splice(index, 1);
      onUpload([primary, ...newImages]);
    },
    [images, onUpload]
  );

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropReorder = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (draggedIndex === index) return;

    const newImages = [...images];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    onUpload(newImages);
  };

  const isUploading = Object.keys(uploadProgress).length > 0;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={(e) => {
            dragCounter.current++;
            handleDrag(e);
          }}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={uploading}
          />

          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const limitBytes = maxFileSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
                const mb = Math.round((limitBytes / (1024 * 1024)) * 10) / 10;
                return `PNG, JPG, WebP up to ${mb}MB each • Max ${maxImages} images`;
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Errors</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((image, index) => {
            const isPrimary = index === 0;
            const progress = uploadProgress[image.publicId];
            const isUploadingThis = progress !== undefined;

            return (
              <div
                key={image.publicId}
                className="relative group"
                draggable
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={handleDropReorder(index)}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.alt || 'Product image'}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center space-x-2">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(index)}
                        className="px-2 py-1 bg-white rounded text-xs hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Set as primary"
                      >
                        Primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Upload Progress */}
                  {isUploadingThis && progress !== undefined && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <div className="bg-white rounded-full px-3 py-1 text-sm font-medium">
                        {Math.round(progress)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Badge */}
                {isPrimary && (
                  <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Primary
                  </div>
                )}

                {/* Drag Handle */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="ml-3 text-sm text-blue-800">Uploading images...</p>
          </div>
        </div>
      )}
    </div>
  );
}
