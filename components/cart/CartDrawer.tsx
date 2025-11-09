'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { 
  useCartStore, 
  useCartItems, 
  useCartIsOpen, 
  useCartTotals, 
  useCartIsLoading,
  useCartError,
  CartItem 
} from '@/stores/cartStore';

/**
 * CartDrawer Component
 * 
 * Features:
 * - Slide-in drawer from right
 * - Header with title, items count, close button
 * - Cart items list with product details
 * - Empty state with icon and message
 * - Footer with subtotal, shipping, tax, total
 * - Smooth animations for slide-in/out and item removal
 * - Mobile: Full screen on small devices
 */
export default function CartDrawer() {
  const router = useRouter();
  const items = useCartItems();
  const isOpen = useCartIsOpen();
  const totals = useCartTotals();
  const isLoading = useCartIsLoading();
  const error = useCartError();
  const { toggleCart, updateQuantity, removeItem } = useCartStore();
  
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Shipping calculation (free over $50)
  const SHIPPING_THRESHOLD = 50;
  const SHIPPING_COST = 5.99;
  const estimatedShipping = totals.subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  // Handle mount for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        toggleCart();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, toggleCart]);

  // Handle quantity update with visual feedback
  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.maxStock) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));
    
    try {
      const success = await updateQuantity(item.id, newQuantity);
      
      // Keep loading state for visual feedback animation
      setTimeout(() => {
        setUpdatingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 400);
      
      if (!success) {
        // Error is already set by the store
      }
    } catch (err) {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Handle item removal with animation
  const handleRemoveItem = async (item: CartItem) => {
    // Start removal animation
    setRemovingItems(prev => new Set(prev).add(item.id));
    
    // Wait for fade-out animation before actually removing
    setTimeout(async () => {
      await removeItem(item.id);
      // Item will be removed from store, animation state will clear
    }, 300);
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    toggleCart();
    router.push('/shop');
  };

  // Handle checkout
  const handleCheckout = () => {
    toggleCart();
    router.push('/checkout');
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <>
      {/* Overlay with smooth fade */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
        aria-hidden="true"
      />

      {/* Drawer - Full screen on mobile, fixed width on desktop */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 id="cart-drawer-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Shopping Cart
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={toggleCart}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in fade-in slide-in-from-top-2">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-in fade-in">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
                Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
              </p>
              <button
                onClick={handleContinueShopping}
                className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Cart Items */
            <div className="space-y-4">
              {items.map((item) => {
                const isUpdating = updatingItems.has(item.id);
                const isRemoving = removingItems.has(item.id);
                const currentPrice = item.discountPrice || item.price;
                const hasDiscount = !!item.discountPrice;

                return (
                  <div
                    key={item.id}
                    className={`flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-300 ${
                      isRemoving ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'
                    } ${isUpdating ? 'ring-2 ring-blue-200 dark:ring-blue-700' : ''}`}
                  >
                    {/* Product Image */}
                    <Link
                      href={`/shop/${item.productSlug}`}
                      onClick={toggleCart}
                      className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-gray-700 rounded-lg overflow-hidden hover:opacity-75 transition-opacity"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      {/* Name and Remove Button */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link
                          href={`/shop/${item.productSlug}`}
                          onClick={toggleCart}
                          className="font-medium text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors line-clamp-2"
                        >
                          {item.productName}
                        </Link>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          disabled={isRemoving || isUpdating}
                          className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remove item"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Variant Details */}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Color:</span> 
                          <span className="flex items-center gap-1">
                            <span 
                              className="w-3 h-3 rounded-full border border-gray-300"
                              style={{ backgroundColor: item.color }}
                              aria-label={item.color}
                            />
                            {item.color}
                          </span>
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Size:</span> {item.size}
                        </span>
                      </div>

                      {/* Price and Quantity */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Price */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ${currentPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-through">
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Quantity Selector with Loading State */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating || isRemoving}
                            className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            aria-label="Decrease quantity"
                          >
                            {isUpdating && item.quantity === item.quantity ? (
                              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-300 animate-spin" />
                            ) : (
                              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-300" />
                            )}
                          </button>
                          
                          <span className={`min-w-[2rem] text-center font-medium text-gray-900 dark:text-white transition-opacity ${
                            isUpdating ? 'opacity-50' : ''
                          }`}>
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock || isUpdating || isRemoving}
                            className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                            aria-label="Increase quantity"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-300 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-300" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Stock Warning */}
                      {item.quantity >= item.maxStock && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          Maximum available quantity
                        </p>
                      )}

                      {/* SKU */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        SKU: {item.sku}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Only show if cart has items */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 sm:px-6 py-4 sticky bottom-0">
            {/* Totals */}
            <div className="space-y-2 mb-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${totals.subtotal.toFixed(2)}
                </span>
              </div>

              {/* Discount */}
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    -${totals.discount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Estimated Shipping */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Estimated Shipping</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {estimatedShipping === 0 ? (
                    <span className="text-green-600 dark:text-green-400">FREE</span>
                  ) : (
                    `$${estimatedShipping.toFixed(2)}`
                  )}
                </span>
              </div>

              {/* Free shipping threshold message */}
              {estimatedShipping > 0 && totals.subtotal < SHIPPING_THRESHOLD && (
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                  Add ${(SHIPPING_THRESHOLD - totals.subtotal).toFixed(2)} more for free shipping!
                </p>
              )}

              {/* Tax */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${totals.tax.toFixed(2)}
                </span>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-gray-900 dark:text-white text-lg">
                  ${(totals.total + estimatedShipping).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-center py-3 px-4 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </button>
              
              <button
                onClick={handleContinueShopping}
                className="w-full text-gray-700 dark:text-gray-300 text-center py-2 px-4 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Continue Shopping
              </button>
            </div>

            {/* Additional Info */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Secure checkout • Free returns • 30-day guarantee
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

