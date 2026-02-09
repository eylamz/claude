'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Heart,
  ShoppingCart,
  X,
  Trash2,
  Share2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { useCartStore } from '@/stores/cartStore';
import { Skeleton } from '@/components/ui';

interface WishlistProduct {
  _id: string;
  name: string | { en: string; he: string };
  slug: string;
  price: number;
  discountPrice?: number;
  hasActiveDiscount: boolean;
  imageUrl: string;
  images: Array<{ url: string; alt?: any }>;
  variants: Array<{
    color: { name: string | { en: string; he: string }; hex: string };
    sizes: Array<{ size: string; stock: number }>;
  }>;
  totalStock: number;
  isInStock: boolean;
  status: string;
}

interface AnimatedItem {
  id: string;
  element: HTMLElement;
  imageUrl: string;
}

/**
 * Toast notification component
 */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
        type === 'success'
          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
      } animate-slide-in`}
    >
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      )}
      <p
        className={`text-sm font-medium ${
          type === 'success'
            ? 'text-green-800 dark:text-green-200'
            : 'text-red-800 dark:text-red-200'
        }`}
      >
        {message}
      </p>
      <button
        onClick={onClose}
        className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Product Card Component
 */
function WishlistProductCard({
  product,
  locale,
  onAddToCart,
  onRemove,
  showOutOfStock,
  isAnimating,
}: {
  product: WishlistProduct;
  locale: string;
  onAddToCart: () => void;
  onRemove: () => void;
  showOutOfStock: boolean;
  isAnimating: boolean;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getProductName = (name: WishlistProduct['name']): string => {
    if (typeof name === 'string') return name;
    const key = locale as 'en' | 'he';
    return name[key] ?? name.en ?? name.he ?? 'Product';
  };

  const finalPrice = product.hasActiveDiscount && product.discountPrice
    ? product.discountPrice
    : product.price;

  const shouldShow = product.isInStock || showOutOfStock;

  if (!shouldShow) return null;

  return (
    <div
      ref={cardRef}
      className={`group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
        isAnimating ? 'opacity-50 pointer-events-none' : ''
      } ${
        isRemoving ? 'animate-fade-out' : 'hover:shadow-xl'
      }`}
      style={{
        animation: isRemoving ? 'fadeOut 0.3s ease-out forwards' : undefined,
      }}
    >
      {/* Image */}
      <Link href={`/${locale}/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
          <Image
            src={product.imageUrl}
            alt={getProductName(product.name)}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Discount Badge */}
          {product.hasActiveDiscount && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-lg z-10">
              Sale
            </div>
          )}

          {/* Out of Stock Overlay */}
          {!product.isInStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
              <span className="text-white font-semibold text-sm px-4 py-2 bg-black/50 rounded-lg">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Product Name */}
        <Link href={`/${locale}/products/${product.slug}`}>
          <h3 className="text-base font-semibold mb-2 line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {getProductName(product.name)}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-lg font-bold ${
              product.hasActiveDiscount
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            ${finalPrice.toFixed(2)}
          </span>
          {product.hasActiveDiscount && (
            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center gap-2 mb-3">
          {product.isInStock ? (
            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium">In Stock</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {product.isInStock && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAddToCart}
              className="flex-1"
              disabled={isAnimating}
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              Add to Cart
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsRemoving(true);
              await new Promise((resolve) => setTimeout(resolve, 300));
              onRemove();
            }}
            disabled={isRemoving}
            className="p-2"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Wishlist Page
 */
export default function WishlistPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split('/')[1] || 'en';
  const addItem = useCartStore((state) => state.addItem);
  const toggleCart = useCartStore((state) => state.toggleCart);

  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOutOfStock, setShowOutOfStock] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const _animatedItemsRef = useRef<AnimatedItem[]>([]);

  useEffect(() => {
    fetchWishlist();
  }, []);

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.9);
        }
      }
      @keyframes flyToCart {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(var(--dx, 0), var(--dy, 0)) scale(0.3);
          opacity: 0;
        }
      }
      .animate-slide-in {
        animation: slideIn 0.3s ease-out;
      }
      .animate-fade-out {
        animation: fadeOut 0.3s ease-out forwards;
      }
      .animate-fly-to-cart {
        animation: flyToCart 0.6s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const fetchWishlist = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/wishlist');
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${locale}/login`);
          return;
        }
        throw new Error('Failed to fetch wishlist');
      }

      const data = await response.json();
      setWishlist(data.wishlist || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setToast({ message: 'Failed to load wishlist', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (product: WishlistProduct, element: HTMLElement | null) => {
    if (!product.isInStock) {
      setToast({ message: 'Product is out of stock', type: 'error' });
      return;
    }

    // Find first available variant
    const firstVariant = product.variants?.[0];
    if (!firstVariant) {
      setToast({ message: 'No variants available', type: 'error' });
      return;
    }

    const firstSize = firstVariant.sizes.find((s) => s.stock > 0);
    if (!firstSize) {
      setToast({ message: 'Product is out of stock', type: 'error' });
      return;
    }

    // Animation
    if (element) {
      const _productName = typeof product.name === 'string' ? product.name : product.name.en || product.name.he;
      
      // Create animated clone
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.zIndex = '9999';
      clone.style.width = `${element.offsetWidth}px`;
      clone.style.height = `${element.offsetHeight}px`;
      clone.style.top = `${element.getBoundingClientRect().top}px`;
      clone.style.left = `${element.getBoundingClientRect().left}px`;
      clone.style.pointerEvents = 'none';
      document.body.appendChild(clone);

      // Get cart button position (usually in header, try multiple selectors)
      const cartButton =
        (document.querySelector('[data-cart-button]') as HTMLElement) ||
        (document.querySelector('button[aria-label*="cart" i]') as HTMLElement) ||
        (document.querySelector('button[aria-label*="Cart" i]') as HTMLElement);
      
      const targetX = cartButton
        ? cartButton.getBoundingClientRect().left + cartButton.offsetWidth / 2
        : window.innerWidth - 50;
      const targetY = cartButton
        ? cartButton.getBoundingClientRect().top + cartButton.offsetHeight / 2
        : 50;

      const startX = element.getBoundingClientRect().left + element.offsetWidth / 2;
      const startY = element.getBoundingClientRect().top + element.offsetHeight / 2;

      const dx = targetX - startX;
      const dy = targetY - startY;

      clone.style.setProperty('--dx', `${dx}px`);
      clone.style.setProperty('--dy', `${dy}px`);
      clone.style.animation = `flyToCart 0.6s ease-in forwards`;
      clone.classList.add('animate-fly-to-cart');

      setTimeout(() => {
        document.body.removeChild(clone);
      }, 500);
    }

    setAnimatingItems((prev) => new Set(prev).add(product._id));

    try {
      const success = await addItem(
        {
          id: product._id,
          name: typeof product.name === 'string' ? product.name : product.name.en || product.name.he,
          slug: product.slug,
          price: product.price,
          discountPrice: product.discountPrice,
          imageUrl: product.imageUrl,
        },
        {
          id: `${product._id}-${firstVariant.color.hex}-${firstSize.size}`,
          sku: `${product._id}-${firstVariant.color.hex}-${firstSize.size}`,
          color: typeof firstVariant.color.name === 'string'
            ? firstVariant.color.name
            : firstVariant.color.name.en || firstVariant.color.name.he,
          size: firstSize.size,
          stock: firstSize.stock,
          price: product.discountPrice || product.price,
        },
        1
      );

      if (success) {
        setToast({ message: 'Added to cart!', type: 'success' });
        toggleCart(); // Open cart drawer
      } else {
        setToast({ message: 'Failed to add to cart', type: 'error' });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      setToast({ message: 'Failed to add to cart', type: 'error' });
    } finally {
      setTimeout(() => {
        setAnimatingItems((prev) => {
          const next = new Set(prev);
          next.delete(product._id);
          return next;
        });
      }, 500);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      const response = await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove from wishlist');
      }

      setWishlist((prev) => prev.filter((item) => item._id !== productId));
      setToast({ message: 'Removed from wishlist', type: 'success' });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      setToast({ message: 'Failed to remove from wishlist', type: 'error' });
    }
  };

  const handleAddAllToCart = async () => {
    const inStockProducts = wishlist.filter((p) => p.isInStock && showOutOfStock !== false);
    
    if (inStockProducts.length === 0) {
      setToast({ message: 'No in-stock items to add', type: 'error' });
      return;
    }

    let successCount = 0;
    for (const product of inStockProducts) {
      const card = document.querySelector(`[data-product-id="${product._id}"]`) as HTMLElement;
      await handleAddToCart(product, card);
      await new Promise((resolve) => setTimeout(resolve, 200)); // Stagger animations
      successCount++;
    }

    setToast({
      message: `${successCount} item${successCount !== 1 ? 's' : ''} added to cart!`,
      type: 'success',
    });
  };

  const handleClearWishlist = async () => {
    if (!confirm('Are you sure you want to clear your wishlist?')) {
      return;
    }

    try {
      const response = await fetch('/api/wishlist?clearAll=true', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear wishlist');
      }

      setWishlist([]);
      setToast({ message: 'Wishlist cleared', type: 'success' });
    } catch (error) {
      console.error('Error clearing wishlist:', error);
      setToast({ message: 'Failed to clear wishlist', type: 'error' });
    }
  };

  const handleShareWishlist = async () => {
    const productNames = wishlist.map((p) =>
      typeof p.name === 'string' ? p.name : p.name.en || p.name.he
    );
    const text = `Check out my wishlist:\n${productNames.join('\n')}`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Wishlist',
          text,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setToast({ message: 'Wishlist link copied to clipboard!', type: 'success' });
    }
  };

  const filteredWishlist = showOutOfStock
    ? wishlist
    : wishlist.filter((product) => product.isInStock);

  return (
    <div className="min-h-screen  pb-16 lg:pb-0">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                My Wishlist
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? 'Loading...' : `${filteredWishlist.length} item${filteredWishlist.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Bulk Actions */}
            {!isLoading && wishlist.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleAddAllToCart}
                  disabled={filteredWishlist.filter((p) => p.isInStock).length === 0}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add All to Cart
                </Button>
                <Button variant="outline" onClick={handleShareWishlist}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" onClick={handleClearWishlist}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Toggle Out of Stock */}
          {!isLoading && wishlist.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOutOfStock}
                  onChange={(e) => setShowOutOfStock(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show out of stock items
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-square rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredWishlist.length === 0 ? (
          /* Empty State */
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Your wishlist is empty
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {showOutOfStock
                  ? "Start adding products to your wishlist!"
                  : "No in-stock items in your wishlist."}
              </p>
              <Link href={`/${locale}/shop`}>
                <Button variant="primary">
                  <Package className="w-4 h-4 mr-2" />
                  Explore Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWishlist.map((product) => (
              <div key={product._id} data-product-id={product._id}>
                <WishlistProductCard
                  product={product}
                  locale={locale}
                  onAddToCart={() => {
                    const element = document.querySelector(
                      `[data-product-id="${product._id}"]`
                    ) as HTMLElement;
                    handleAddToCart(product, element);
                  }}
                  onRemove={() => handleRemoveFromWishlist(product._id)}
                  showOutOfStock={showOutOfStock}
                  isAnimating={animatingItems.has(product._id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

