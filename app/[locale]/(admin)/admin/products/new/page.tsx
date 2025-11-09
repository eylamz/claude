'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';

interface ColorVariant {
  id: string;
  name: { en: string; he: string };
  hex: string;
  sizes: Array<{
    size: string;
    stock: number;
    sku: string;
  }>;
}

interface ImageData {
  url: string;
  alt: { en: string; he: string };
  order: number;
  publicId: string;
}

interface ProductFormData {
  name: { en: string; he: string };
  slug: string;
  description: { en: string; he: string };
  category: string;
  subcategory: string;
  relatedSports: string[];
  price: string;
  discountPrice: string;
  discountStartDate: string;
  discountEndDate: string;
  variants: ColorVariant[];
  images: ImageData[];
  metaTitle: { en: string; he: string };
  metaDescription: { en: string; he: string };
  isFeatured: boolean;
  isPreorder: boolean;
  status: string;
}

export default function NewProductPage() {
  const locale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'en' | 'he'>('en');
  const [formData, setFormData] = useState<ProductFormData>({
    name: { en: '', he: '' },
    slug: '',
    description: { en: '', he: '' },
    category: '',
    subcategory: '',
    relatedSports: [],
    price: '',
    discountPrice: '',
    discountStartDate: '',
    discountEndDate: '',
    variants: [],
    images: [],
    metaTitle: { en: '', he: '' },
    metaDescription: { en: '', he: '' },
    isFeatured: false,
    isPreorder: false,
    status: 'draft',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (lang: 'en' | 'he', value: string) => {
    setFormData(prev => {
      const newData = { ...prev, name: { ...prev.name, [lang]: value } };
      // Auto-generate slug from English name if it's empty or matches the old name
      if (lang === 'en' && (!prev.slug || prev.slug === generateSlug(prev.name.en))) {
        newData.slug = generateSlug(value);
      }
      return newData;
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const addColorVariant = () => {
    const newVariant: ColorVariant = {
      id: Date.now().toString(),
      name: { en: '', he: '' },
      hex: '#000000',
      sizes: [{ size: 'M', stock: 0, sku: '' }],
    };
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant],
    }));
  };

  const updateColorVariant = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.id === id ? { ...v, [field]: value } : v
      ),
    }));
  };

  const addSizeToVariant = (variantId: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.id === variantId
          ? { ...v, sizes: [...v.sizes, { size: 'M', stock: 0, sku: '' }] }
          : v
      ),
    }));
  };

  const updateSize = (variantId: string, sizeIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.id === variantId
          ? {
              ...v,
              sizes: v.sizes.map((s, i) =>
                i === sizeIndex ? { ...s, [field]: value } : s
              ),
            }
          : v
      ),
    }));
  };

  const removeVariant = (variantId: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId),
    }));
  };

  const removeSize = (variantId: string, sizeIndex: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.id === variantId
          ? { ...v, sizes: v.sizes.filter((_, i) => i !== sizeIndex) }
          : v
      ),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In real implementation, upload to Cloudinary and get URLs
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData: ImageData = {
          url: reader.result as string,
          alt: { en: file.name, he: file.name },
          order: formData.images.length + index,
          publicId: `temp-${Date.now()}-${index}`,
        };
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, imageData],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const setPrimaryImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const [primary] = newImages.splice(index, 1);
      return { ...prev, images: [primary, ...newImages] };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.en) newErrors['name.en'] = 'English name is required';
    if (!formData.name.he) newErrors['name.he'] = 'Hebrew name is required';
    if (!formData.slug) newErrors['slug'] = 'Slug is required';
    if (!formData.description.en) newErrors['description.en'] = 'English description is required';
    if (!formData.description.he) newErrors['description.he'] = 'Hebrew description is required';
    if (!formData.category) newErrors['category'] = 'Category is required';
    if (!formData.price) newErrors['price'] = 'Price is required';
    if (formData.variants.length === 0) {
      newErrors['variants'] = 'At least one variant is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveDraft = useCallback(async () => {
    try {
      // In real implementation, save to API
      console.log('Saving draft...', formData);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [formData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // In real implementation, submit to API
      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push(`/${locale}/admin/products`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastSaved && `Last saved: ${lastSaved.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language Tabs */}
            <div className="flex space-x-2 border-b">
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'en'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('he')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'he'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                Hebrew
              </button>
            </div>

            {/* Name */}
            <div>
              <Input
                label="Name"
                value={formData.name[activeTab]}
                onChange={(e) => handleNameChange(activeTab, e.target.value)}
                placeholder={activeTab === 'en' ? 'Product Name' : 'שם המוצר'}
                error={errors[`name.${activeTab}`]}
                required
              />
            </div>

            {/* Slug */}
            <div>
              <Input
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                placeholder="product-slug"
                error={errors.slug}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                URL-friendly version of the name
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description[activeTab]}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    description: { ...prev.description, [activeTab]: e.target.value },
                  }))
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={activeTab === 'en' ? 'Product description' : 'תיאור המוצר'}
              />
              {errors[`description.${activeTab}`] && (
                <p className="mt-1 text-sm text-red-600">{errors[`description.${activeTab}`]}</p>
              )}
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                error={errors.category}
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'skateboards', label: 'Skateboards' },
                  { value: 'wheels', label: 'Wheels' },
                  { value: 'trucks', label: 'Trucks' },
                  { value: 'bearings', label: 'Bearings' },
                  { value: 'accessories', label: 'Accessories' },
                ]}
              />
              <Select
                label="Subcategory"
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                options={[
                  { value: '', label: 'Select Subcategory' },
                  { value: 'complete', label: 'Complete Boards' },
                  { value: 'decks', label: 'Decks' },
                  { value: 'street', label: 'Street' },
                  { value: 'vert', label: 'Vert' },
                ]}
              />
            </div>

            {/* Related Sports */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Sports
              </label>
              <div className="space-y-2">
                {['Skateboarding', 'Snowboarding', 'Surfing', 'Longboarding', 'BMX'].map((sport) => (
                  <div key={sport} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`sport-${sport.toLowerCase()}`}
                      checked={formData.relatedSports.includes(sport.toLowerCase())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            relatedSports: [...prev.relatedSports, sport.toLowerCase()],
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            relatedSports: prev.relatedSports.filter(s => s !== sport.toLowerCase()),
                          }));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`sport-${sport.toLowerCase()}`} className="ml-2 text-sm text-gray-700">
                      {sport}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Regular Price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                error={errors.price}
                required
              />
              <Input
                label="Discount Price"
                type="number"
                step="0.01"
                value={formData.discountPrice}
                onChange={(e) => handleInputChange('discountPrice', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Discount Start Date"
                type="date"
                value={formData.discountStartDate}
                onChange={(e) => handleInputChange('discountStartDate', e.target.value)}
              />
              <Input
                label="Discount End Date"
                type="date"
                value={formData.discountEndDate}
                onChange={(e) => handleInputChange('discountEndDate', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Product Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.variants.map((variant, variantIndex) => (
              <div key={variant.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Color Variant {variantIndex + 1}</h3>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeVariant(variant.id)}
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Color Name (EN)"
                    value={variant.name.en}
                    onChange={(e) =>
                      updateColorVariant(variant.id, 'name', { ...variant.name, en: e.target.value })
                    }
                  />
                  <Input
                    label="Color Name (HE)"
                    value={variant.name.he}
                    onChange={(e) =>
                      updateColorVariant(variant.id, 'name', { ...variant.name, he: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={variant.hex}
                    onChange={(e) => updateColorVariant(variant.id, 'hex', e.target.value)}
                    className="h-10 w-full rounded border border-gray-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Sizes</h4>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addSizeToVariant(variant.id)}
                    >
                      Add Size
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {variant.sizes.map((size, sizeIndex) => (
                      <div key={sizeIndex} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <Select
                            value={size.size}
                            onChange={(e) => updateSize(variant.id, sizeIndex, 'size', e.target.value)}
                            options={[
                              ...standardSizes.map(s => ({ value: s, label: s })),
                              { value: 'custom', label: 'Custom' },
                            ]}
                          />
                        </div>
                        <div className="col-span-4">
                          <Input
                            label="Stock"
                            type="number"
                            value={size.stock}
                            onChange={(e) => updateSize(variant.id, sizeIndex, 'stock', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="col-span-4">
                          <Input
                            label="SKU"
                            value={size.sku}
                            onChange={(e) => updateSize(variant.id, sizeIndex, 'sku', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removeSize(variant.id, sizeIndex)}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              onClick={addColorVariant}
            >
              + Add Color Variant
            </Button>
            {errors.variants && (
              <p className="text-sm text-red-600">{errors.variants}</p>
            )}
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img src={image.url} alt="Product" className="w-full h-32 object-cover rounded" />
                    {index === 0 && (
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center space-x-2">
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(index)}
                          className="px-2 py-1 bg-white rounded text-sm hover:bg-gray-100"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                label="Meta Title (EN)"
                value={formData.metaTitle.en}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaTitle: { ...prev.metaTitle, en: e.target.value },
                  }))
                }
                placeholder="SEO title for search engines"
              />
            </div>
            <div>
              <Input
                label="Meta Title (HE)"
                value={formData.metaTitle.he}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaTitle: { ...prev.metaTitle, he: e.target.value },
                  }))
                }
                placeholder="כותרת SEO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description (EN)
              </label>
              <textarea
                value={formData.metaDescription.en}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaDescription: { ...prev.metaDescription, en: e.target.value },
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SEO description for search engines"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description (HE)
              </label>
              <textarea
                value={formData.metaDescription.he}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    metaDescription: { ...prev.metaDescription, he: e.target.value },
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="תיאור SEO"
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="featured"
                checked={formData.isFeatured}
                onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                Featured Product
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="preorder"
                checked={formData.isPreorder}
                onChange={(e) => handleInputChange('isPreorder', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="preorder" className="text-sm font-medium text-gray-700">
                Preorder
              </label>
            </div>
            <div>
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

