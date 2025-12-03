// nextjs-app/components/shop/ProductCard.tsx
'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { useLocaleInfo } from '@/hooks/use-translation';
import { cn } from '@/lib/utils/cn';
import { Icon } from '@/components/icons/Icon';

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
    images?: Array<{
      url: string;
      alt?: { en: string; he: string } | string;
      order?: number;
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
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);

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
    const localizedName = name as { en: string; he: string };
    return localizedName[locale as 'en' | 'he'] || localizedName.en || localizedName.he || '';
  };

  // Helper to get localized color name
  const getLocalizedColorName = (colorName: { en: string; he: string } | string): string => {
    if (typeof colorName === 'string') return colorName;
    return colorName[locale as 'en' | 'he'] || colorName.en || colorName.he || '';
  };

  const getImageAlt = (alt: any, productName: string): string => {
    if (!alt) return productName;
    if (typeof alt === 'string') return alt;
    const localizedAlt = alt as { en: string; he: string };
    return localizedAlt[locale as 'en' | 'he'] || localizedAlt.en || localizedAlt.he || productName;
  };

  // Format price to show decimals only if needed
  const formatPrice = (price: number): string => {
    // Round to 2 decimal places to handle floating point precision issues
    const rounded = Math.round(price * 100) / 100;
    // Check if the rounded price is an integer (no decimal part)
    if (rounded % 1 === 0) {
      return rounded.toString();
    }
    // Show decimals if the price has a decimal part
    return rounded.toFixed(2);
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

  // Set default selected color on mount
  useEffect(() => {
    if (!selectedColorHex && product.variants && product.variants.length > 0) {
      setSelectedColorHex(product.variants[0].color.hex);
    }
  }, [product.variants, selectedColorHex]);

  // Get image for a specific color variant
  const getImageForColor = (colorHex: string) => {
    if (!product.variants) {
      return null;
    }
    
    // Find the variant for this color
    const variant = product.variants.find((v) => v.color.hex === colorHex);
    
    if (!variant) return null;
    
    // If variant has its own images, use the first one
    if (variant.images && variant.images.length > 0) {
      return variant.images[0]?.url || null;
    }
    
    // Fallback to product-level images
    if (product.images && product.images.length > 0) {
      const variantIndex = product.variants.findIndex((v) => v.color.hex === colorHex);
      const imageIndex = variantIndex % product.images.length;
      return product.images[imageIndex]?.url || null;
    }
    
    return null;
  };

  // Get all images for a specific color variant
  const getImagesForColor = (colorHex: string) => {
    if (!product.variants) {
      return product.images || [];
    }
    
    // Find the variant for this color
    const variant = product.variants.find((v) => v.color.hex === colorHex);
    
    if (!variant) return product.images || [];
    
    // If variant has its own images, use those
    if (variant.images && variant.images.length > 0) {
      return variant.images;
    }
    
    // Fallback to product-level images
    return product.images || [];
  };

  const totalStock = calculateTotalStock();
  const isOutOfStock = totalStock === 0;
  const hasDiscount = isDiscountActive();
  const finalPrice = hasDiscount ? product.discountPrice! : product.price;
  const productName = getLocalizedName(product.name);

  // Get images based on selected color variant or default
  const variantImages = selectedColorHex ? getImagesForColor(selectedColorHex) : (product.images || []);
  const images = variantImages.length > 0 ? variantImages : (product.images || []);
  
  // Determine primary image based on selected color or default
  let primaryImage = images[0]?.url || '';
  if (selectedColorHex) {
    const colorImage = getImageForColor(selectedColorHex);
    if (colorImage) {
      primaryImage = colorImage;
    }
  }
  
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
          'group relative flex gap-4 p-4 ',
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
                ₪{formatPrice(finalPrice)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  ₪{formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Color swatches */}
            {colors.length > 1 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  {visibleColors.map((color, idx) => {
                    const isSelected = selectedColorHex === color.hex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedColorHex(color.hex);
                        }}
                        className={cn(
                          'w-5 h-5 rounded-full border-2 shadow-sm transition-all cursor-pointer',
                          isSelected
                            ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={getLocalizedColorName(color.name)}
                        aria-label={`Select color: ${getLocalizedColorName(color.name)}`}
                      />
                    );
                  })}
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
          <Icon
            name={isWishlisted ? 'heartLike' : 'heart'}
            className={cn(
              'w-5 h-5 transition-all duration-300',
              isWishlisted
                ? 'text-red-500'
                : 'text-gray-600 dark:text-gray-400'
            )}
          />
        </button>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div
      className={cn(
        'group relative',
        'overflow-hidden',
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
              'absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-xl bg-card/85 dark:bg-card-dark/85 shadow-lg',
              'opacity-0 group-hover:opacity-100 transition-all duration-300 z-10',
              'hover:scale-110 transform',
              'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            )}
            aria-label={isWishlisted ? t('removeFromWishlist') : t('addToWishlist')}
          >
            <Icon
              name={isWishlisted ? 'heartBold' : 'heart'}
              className={cn(
                'w-5 h-5 transition-all duration-300',
                isWishlisted
                  ? 'text-red-500 scale-110'
                  : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
              )}
            />
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
            ₪{formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
              ₪{formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Color Swatches */}
        {colors.length > 1 && (
          <div className="flex items-center gap-1.5">
            {visibleColors.map((color, idx) => {
              const isSelected = selectedColorHex === color.hex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColorHex(color.hex);
                  }}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all duration-200 cursor-pointer',
                    'hover:scale-110 hover:shadow-md',
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
                    'shadow-sm'
                  )}
                  style={{ backgroundColor: color.hex }}
                  title={getLocalizedColorName(color.name)}
                  aria-label={`Select color: ${getLocalizedColorName(color.name)}`}
                />
              );
            })}
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

