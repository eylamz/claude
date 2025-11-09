'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { useLocaleInfo } from '@/hooks/use-translation';
import { cn } from '@/lib/utils/cn';

/**
 * Product interface for the card
 */
interface ProductCardProduct {
  id: string;
  slug: string;
  name: {
    en: string;
    he: string;
  } | string;
  price: number;
  discountPrice?: number;
  discountStartDate?: Date | string;
  discountEndDate?: Date | string;
  images?: Array<{
    url: string;
    alt?: { en: string; he: string } | string;
    order?: number;
  }>;
  variants?: Array<{
    color: {
      name: { en: string; he: string } | string;
      hex: string;
    };
    sizes: Array<{
      size: string;
      stock: number;
    }>;
  }>;
  totalStock?: number;
  status?: 'active' | 'inactive' | 'draft';
}

interface ProductCardProps {
  product?: ProductCardProduct;
  view?: 'grid' | 'list';
  onQuickView?: (product: ProductCardProduct) => void;
  onAddToCart?: (product: ProductCardProduct) => void;
  className?: string;
  // Spread props for backward compatibility
  id?: string;
  slug?: string;
  name?: ProductCardProduct['name'];
  price?: number;
  discountPrice?: number;
  discountStartDate?: Date | string;
  discountEndDate?: Date | string;
  images?: ProductCardProduct['images'];
  variants?: ProductCardProduct['variants'];
  totalStock?: number;
  status?: ProductCardProduct['status'];
  // Legacy props
  image?: string;
  hasDiscount?: boolean;
}

export const ProductCard: FC<ProductCardProps> = ({
  product: productProp,
  view = 'grid',
  onQuickView,
  onAddToCart,
  className,
  // Spread props for backward compatibility
  id,
  slug,
  name,
  price,
  discountPrice,
  discountStartDate,
  discountEndDate,
  images: imagesProp,
  variants: variantsProp,
  totalStock: totalStockProp,
  status: statusProp,
  // Legacy props
  image,
  hasDiscount: hasDiscountProp,
}) => {
  const t = useTranslation('shop');
  const { locale } = useLocaleInfo();
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Construct product object from props or use provided product prop
  const product: ProductCardProduct = productProp || {
    id: id!,
    slug: slug!,
    name: name || '',
    price: price || 0,
    discountPrice,
    discountStartDate,
    discountEndDate,
    images: imagesProp || (image ? [{ url: image }] : []),
    variants: variantsProp,
    totalStock: totalStockProp,
    status: statusProp,
  };

  // Helper functions
  const getLocalizedName = (name: ProductCardProduct['name']): string => {
    if (typeof name === 'string') return name;
    return name[locale] || name.en || name.he || '';
  };

  const getImageAlt = (alt: any, productName: string): string => {
    if (!alt) return productName;
    if (typeof alt === 'string') return alt;
    return alt[locale] || alt.en || alt.he || productName;
  };

  // Calculate stock
  const calculateTotalStock = (): number => {
    if (product.totalStock !== undefined) return product.totalStock;
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce(
      (total, variant) =>
        total + variant.sizes.reduce((sum, size) => sum + size.stock, 0),
      0
    );
  };

  // Check if discount is active
  const isDiscountActive = (): boolean => {
    // Use hasDiscount prop if provided (for backward compatibility)
    if (hasDiscountProp !== undefined) return hasDiscountProp;
    
    if (!product.discountPrice || product.discountPrice >= product.price) return false;
    const now = new Date();
    const startDate = product.discountStartDate
      ? new Date(product.discountStartDate)
      : null;
    const endDate = product.discountEndDate
      ? new Date(product.discountEndDate)
      : null;

    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  };

  // Check if single variant (one color, one size)
  const isSingleVariant = (): boolean => {
    if (!product.variants || product.variants.length === 0) return false;
    if (product.variants.length !== 1) return false;
    const variant = product.variants[0];
    return variant.sizes.length === 1;
  };

  // Get available colors (for swatches)
  const getAvailableColors = () => {
    if (!product.variants || product.variants.length === 0) return [];
    return product.variants.map((v) => ({
      name: v.color.name,
      hex: v.color.hex,
    }));
  };

  const totalStock = calculateTotalStock();
  const isOutOfStock = totalStock === 0;
  const hasDiscount = isDiscountActive();
  const finalPrice = hasDiscount ? product.discountPrice! : product.price;
  const productName = getLocalizedName(product.name);

  // Images
  const images = product.images || [];
  const primaryImage = images[0]?.url || '';
  const secondaryImage = images[1]?.url || primaryImage;
  const displayImage = isHovered && secondaryImage && secondaryImage !== primaryImage
    ? secondaryImage
    : primaryImage;

  // Colors for swatches
  const colors = getAvailableColors();
  const maxSwatches = 4;
  const visibleColors = colors.slice(0, maxSwatches);
  const remainingColors = colors.length - maxSwatches;

  // List view variant
  if (view === 'list') {
    return (
      <div
        className={cn(
          'group relative flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg',
          'hover:shadow-lg transition-all duration-300',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <Link href={`/shop/product/${product.slug}`} className="shrink-0">
          <div className="relative w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
            {displayImage && !imageError ? (
              <img
                src={displayImage}
                alt={getImageAlt(images[0]?.alt, productName)}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
                No Image
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-semibold">
                {t('onSale')}
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {t('outOfStock')}
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <Link href={`/shop/product/${product.slug}`}>
              <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {productName}
              </h3>
            </Link>

            {/* Price */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  'text-xl font-bold',
                  hasDiscount
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                )}
              >
                ₪{finalPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  ₪{product.price.toFixed(2)}
                </span>
              )}
            </div>

            {/* Color swatches */}
            {colors.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  {visibleColors.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                      title={typeof color.name === 'string' ? color.name : color.name[locale]}
                    />
                  ))}
                  {remainingColors > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                      +{remainingColors}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isOutOfStock && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (onAddToCart) onAddToCart(product);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  aria-label={t('addToCart')}
                >
                  {t('addToCart')}
                </button>
                {onQuickView && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onQuickView(product);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Quick View
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Wishlist button (absolute) */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsWishlisted(!isWishlisted);
          }}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 shadow-md',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            'hover:scale-110 transition-transform',
            'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
          aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
        >
          <svg
            className={cn(
              'w-5 h-5 transition-all duration-300',
              isWishlisted
                ? 'fill-red-500 text-red-500'
                : 'fill-none text-gray-600 dark:text-gray-400'
            )}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg',
        'overflow-hidden hover:shadow-xl transition-all duration-300',
        'transform hover:scale-[1.02]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <Link href={`/shop/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
          {/* Images with transition */}
          {displayImage && !imageError ? (
            <>
              <img
                src={primaryImage}
                alt={getImageAlt(images[0]?.alt, productName)}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                  isHovered && secondaryImage && secondaryImage !== primaryImage
                    ? 'opacity-0'
                    : 'opacity-100'
                )}
                onError={() => setImageError(true)}
              />
              {secondaryImage && secondaryImage !== primaryImage && (
                <img
                  src={secondaryImage}
                  alt={getImageAlt(images[1]?.alt, productName)}
                  className={cn(
                    'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
              No Image
            </div>
          )}

          {/* Sale Badge */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-lg z-10">
              {t('onSale')}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
              <span className="text-white font-semibold text-base px-4 py-2 bg-black/50 rounded-lg">
                {t('outOfStock')}
              </span>
            </div>
          )}

          {/* Quick Actions (visible on hover) */}
          {!isOutOfStock && (
            <div
              className={cn(
                'absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10'
              )}
            >
              {/* Quick Add to Cart (if single variant) */}
              {isSingleVariant() && onAddToCart && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className={cn(
                    'flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg',
                    'text-sm font-semibold hover:bg-blue-700',
                    'transition-all duration-200 transform hover:scale-105',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  )}
                  aria-label={t('addToCart')}
                >
                  {t('addToCart')}
                </button>
              )}

              {/* Quick View */}
              {onQuickView && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onQuickView(product);
                  }}
                  className={cn(
                    'px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                    'rounded-lg text-sm font-semibold',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'transition-all duration-200 transform hover:scale-105',
                    'border border-gray-200 dark:border-gray-600',
                    'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                  )}
                  aria-label="Quick View"
                >
                  Quick View
                </button>
              )}
            </div>
          )}

          {/* Wishlist Heart (top right) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
            }}
            className={cn(
              'absolute top-3 right-3 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg',
              'opacity-0 group-hover:opacity-100 transition-all duration-300 z-10',
              'hover:scale-110 transform',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            )}
            aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
          >
            <svg
              className={cn(
                'w-5 h-5 transition-all duration-300',
                isWishlisted
                  ? 'fill-red-500 text-red-500 scale-110'
                  : 'fill-none text-gray-600 dark:text-gray-400 hover:text-red-500'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Product Name */}
        <Link href={`/shop/product/${product.slug}`}>
          <h3
            className="text-base font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            title={productName}
          >
            {productName}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={cn(
              'text-lg font-bold',
              hasDiscount
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            )}
          >
            ₪{finalPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
              ₪{product.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Color Swatches */}
        {colors.length > 0 && (
          <div className="flex items-center gap-1.5">
            {visibleColors.map((color, idx) => (
              <div
                key={idx}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all duration-200',
                  'hover:scale-110 hover:shadow-md',
                  'border-gray-300 dark:border-gray-600',
                  'shadow-sm'
                )}
                style={{ backgroundColor: color.hex }}
                title={typeof color.name === 'string' ? color.name : color.name[locale]}
                aria-label={`Color: ${typeof color.name === 'string' ? color.name : color.name[locale]}`}
              />
            ))}
            {remainingColors > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-medium">
                +{remainingColors} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

