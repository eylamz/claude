'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ProductGallery } from '@/components/shop/product-gallery';
import { Accordion, Button } from '@/components/ui';
import { useTranslation } from '@/hooks/use-translation';
import { useLocaleInfo } from '@/hooks/use-translation';
import { cn } from '@/lib/utils/cn';
import { isEcommerceEnabled } from '@/lib/utils/ecommerce';
import { useRouter } from 'next/navigation';

interface ProductImage {
  url: string;
  alt: string;
  order?: number;
}

interface ProductVariant {
  color: {
    name: string;
    hex: string;
  };
  sizes: Array<{
    size: string;
    stock: number;
    sku: string;
    isInStock: boolean;
  }>;
}

interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  isOnSale: boolean;
  currentPrice: number;
  category: string;
  subcategory?: string;
  relatedSports?: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  totalStock: number;
  isFeatured: boolean;
  isPreorder: boolean;
  availableColors: Array<{ name: string; hex: string }>;
  metadata?: {
    title: string;
    description: string;
  };
}

export default function ProductPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';
  const t = useTranslation('shop');
  const { isRTL } = useLocaleInfo();
  const ecommerceEnabled = isEcommerceEnabled();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [rating] = useState(4.5); // Mock rating
  const [reviewCount] = useState(128); // Mock review count

  const slug = params.slug as string;

  // Show "Page in construction" if ecommerce is disabled
  if (!ecommerceEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center px-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-brand-main/10 dark:from-green-500/20 dark:to-brand-main/20 mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {locale === 'he' ? 'דף בבנייה' : 'Page in Construction'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            {locale === 'he' 
              ? 'החנות זמינה בקרוב. אנא נסו מאוחר יותר.'
              : 'The shop is coming soon. Please check back later.'
            }
          </p>
          <Button
            onClick={() => router.push(`/${locale}`)}
            variant="brand"
            className="px-6 py-3"
          >
            {locale === 'he' ? 'חזרה לדף הבית' : 'Back to Homepage'}
          </Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchProduct();
  }, [slug, locale]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${slug}?locale=${locale}`);
      if (!response.ok) {
        throw new Error('Product not found');
      }
      const data = await response.json();
      setProduct(data.product);

      // Set initial color selection
      if (data.product.availableColors && data.product.availableColors.length > 0) {
        setSelectedColor(data.product.availableColors[0].hex);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  // Get available sizes for selected color
  const getAvailableSizes = () => {
    if (!product || !selectedColor) return [];
    const variant = product.variants.find((v) => v.color.hex === selectedColor);
    if (!variant) return [];
    return variant.sizes.filter((size) => size.isInStock);
  };

  // Get stock for selected color and size
  const getStock = () => {
    if (!product || !selectedColor || !selectedSize) return 0;
    const variant = product.variants.find((v) => v.color.hex === selectedColor);
    if (!variant) return 0;
    const size = variant.sizes.find((s) => s.size === selectedSize);
    return size ? size.stock : 0;
  };

  // Get color name for selected color
  const getSelectedColorName = () => {
    if (!product || !selectedColor) return '';
    const color = product.availableColors.find((c) => c.hex === selectedColor);
    return color ? color.name : '';
  };

  const availableSizes = getAvailableSizes();
  const stock = getStock();
  const maxQuantity = Math.min(10, stock || product?.totalStock || 10);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(maxQuantity, prev + delta)));
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!selectedColor) {
      alert('Please select a color');
      return;
    }
    if (!selectedSize && availableSizes.length > 0) {
      alert('Please select a size');
      return;
    }
    // TODO: Implement add to cart
    console.log('Add to cart:', {
      productId: product.id,
      color: selectedColor,
      size: selectedSize,
      quantity,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Product not found
          </h1>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Structured data for SEO
  const getStructuredData = () => {
    if (typeof window === 'undefined') {
      return {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map((img) => img.url),
        brand: {
          '@type': 'Brand',
          name: 'ENBOSS',
        },
        offers: {
          '@type': 'Offer',
          url: `https://example.com${pathname}`,
          priceCurrency: 'ILS',
          price: product.currentPrice,
          availability: product.totalStock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'ENBOSS',
          },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating,
          reviewCount: reviewCount,
        },
      };
    }
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images.map((img) => img.url),
      brand: {
        '@type': 'Brand',
        name: 'ENBOSS',
      },
      offers: {
        '@type': 'Offer',
        url: `${window.location.origin}${pathname}`,
        priceCurrency: 'ILS',
        price: product.currentPrice,
        availability: product.totalStock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'ENBOSS',
        },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount,
      },
    };
  };

  const structuredData = getStructuredData();

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-gray-900 dark:hover:text-white">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/shop" className="hover:text-gray-900 dark:hover:text-white">
                  Shop
                </Link>
              </li>
              {product.category && (
                <>
                  <li>/</li>
                  <li className="text-gray-900 dark:text-white">{product.category}</li>
                </>
              )}
              <li>/</li>
              <li className="text-gray-900 dark:text-white font-medium">{product.name}</li>
            </ol>
          </nav>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Product Gallery */}
            <div>
              <ProductGallery images={product.images} productName={product.name} />
            </div>

            {/* Right Column - Product Details */}
            <div className="space-y-6">
              {/* Product Title */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {product.name}
                </h1>
                {product.subcategory && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {product.subcategory}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₪{product.currentPrice.toFixed(2)}
                </span>
                {product.isOnSale && product.discountPrice && (
                  <>
                    <span className="text-xl text-gray-500 dark:text-gray-400 line-through">
                      ₪{product.price.toFixed(2)}
                    </span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">
                      {t('onSale')}
                    </span>
                  </>
                )}
              </div>

              {/* Rating and Review Count */}
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={cn(
                        'w-5 h-5',
                        i < Math.floor(rating)
                          ? 'text-yellow-400 fill-current'
                          : i < rating
                          ? 'text-yellow-400 fill-current opacity-50'
                          : 'text-gray-300 dark:text-gray-600'
                      )}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {rating} ({reviewCount} reviews)
                </span>
              </div>

              {/* Color Selector */}
              {product.availableColors && product.availableColors.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Color:
                    </label>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getSelectedColorName()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.availableColors.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => {
                          setSelectedColor(color.hex);
                          setSelectedSize(''); // Reset size when color changes
                        }}
                        className={cn(
                          'w-12 h-12 rounded-full border-2 transition-all hover:scale-110',
                          selectedColor === color.hex
                            ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800 shadow-lg'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={`Select color ${color.name}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {availableSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-900 dark:text-white">
                      Size:
                    </label>
                    <Link
                      href="#size-guide"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Size Guide
                    </Link>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {availableSizes.map((size) => {
                      const sizeStock = product.variants
                        .find((v) => v.color.hex === selectedColor)
                        ?.sizes.find((s) => s.size === size.size)?.stock || 0;
                      const isOutOfStock = sizeStock === 0;

                      return (
                        <button
                          key={size.size}
                          onClick={() => !isOutOfStock && setSelectedSize(size.size)}
                          disabled={isOutOfStock}
                          className={cn(
                            'px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all',
                            selectedSize === size.size
                              ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                              : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500',
                            isOutOfStock &&
                              'opacity-50 cursor-not-allowed line-through'
                          )}
                        >
                          {size.size}
                          {isOutOfStock && (
                            <span className="block text-xs text-red-500 mt-1">Out</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Status */}
              <div className="text-sm">
                {stock > 0 ? (
                  <p className="text-green-600 dark:text-green-400">
                    {t('inStock')} - {stock} available
                  </p>
                ) : product.totalStock > 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    Please select a color and size
                  </p>
                ) : (
                  <p className="text-red-600 dark:text-red-400">{t('outOfStock')}</p>
                )}
              </div>

              {/* Quantity Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Quantity:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 12H4"
                      />
                    </svg>
                  </button>
                  <span className="w-12 text-center font-semibold text-gray-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= maxQuantity}
                    className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Max: {maxQuantity}
                  </span>
                </div>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={
                  product.totalStock === 0 ||
                  (availableSizes.length > 0 && !selectedSize) ||
                  !selectedColor
                }
                className="w-full py-3 text-lg"
                variant="primary"
                size="lg"
              >
                {t('addToCart')}
              </Button>

              {/* Add to Wishlist Button */}
              <Button
                onClick={() => setIsWishlisted(!isWishlisted)}
                variant="secondary"
                className="w-full"
              >
                {isWishlisted ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-2 fill-current"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {t('removeFromWishlist')}
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {t('addToWishlist')}
                  </>
                )}
              </Button>

              {/* Product Details Accordion */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <Accordion title={t('productDetails')} defaultOpen>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                </Accordion>

                <Accordion title="Shipping Information">
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <strong>Free Shipping</strong> on orders over ₪200
                    </p>
                    <p>
                      <strong>Standard Shipping:</strong> 3-5 business days
                    </p>
                    <p>
                      <strong>Express Shipping:</strong> 1-2 business days (additional fee)
                    </p>
                    <p>
                      <strong>International Shipping:</strong> Available to select countries
                    </p>
                  </div>
                </Accordion>

                <Accordion title="Care Instructions">
                  <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <strong>Washing:</strong> Machine wash cold, gentle cycle
                    </p>
                    <p>
                      <strong>Drying:</strong> Air dry or tumble dry low
                    </p>
                    <p>
                      <strong>Ironing:</strong> Low heat if needed
                    </p>
                    <p>
                      <strong>Bleaching:</strong> Do not bleach
                    </p>
                  </div>
                </Accordion>
              </div>

              {/* Share Buttons */}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Share this product:
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.share) {
                        navigator.share({
                          title: product.name,
                          text: product.description,
                          url: typeof window !== 'undefined' ? window.location.href : pathname,
                        });
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Share
                  </button>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.href : `https://example.com${pathname}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-lg hover:bg-[#166FE5] transition-colors text-sm font-medium"
                  >
                    Facebook
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.href : `https://example.com${pathname}`
                    )}&text=${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors text-sm font-medium"
                  >
                    Twitter
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      product.name
                    )}&body=${encodeURIComponent(
                      typeof window !== 'undefined' ? window.location.href : `https://example.com${pathname}`
                    )}`}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

