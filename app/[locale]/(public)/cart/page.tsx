'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Minus, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  Loader2,
  Heart,
  Shield,
  Lock,
  CreditCard,
  X
} from 'lucide-react';
import { 
  useCartStore, 
  useCartItems, 
  useCartTotals, 
  useCartIsLoading,
  useCartError,
  CartItem 
} from '@/stores/cartStore';

interface RecentlyViewedProduct {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  discountPrice?: number;
}

export default function CartPage() {
  const router = useRouter();
  const items = useCartItems();
  const totals = useCartTotals();
  const isLoading = useCartIsLoading();
  const error = useCartError();
  const { updateQuantity, removeItem } = useCartStore();
  
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  // Shipping calculation
  const SHIPPING_THRESHOLD = 50;
  const SHIPPING_COST = 5.99;
  const estimatedShipping = totals.subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;

  // Load recently viewed from localStorage
  useEffect(() => {
    const viewed = localStorage.getItem('recentlyViewed');
    if (viewed) {
      try {
        setRecentlyViewed(JSON.parse(viewed).slice(0, 4));
      } catch (e) {
        console.error('Failed to parse recently viewed', e);
      }
    }
  }, []);

  // Handle quantity update
  const handleUpdateQuantity = async (item: CartItem, newQuantity: number) => {
    if (newQuantity < 1 || newQuantity > item.maxStock) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));
    
    try {
      await updateQuantity(item.id, newQuantity);
      setTimeout(() => {
        setUpdatingItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 300);
    } catch (err) {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Handle item removal
  const handleRemoveItem = async (item: CartItem) => {
    setRemovingItems(prev => new Set(prev).add(item.id));
    setTimeout(async () => {
      await removeItem(item.id);
    }, 300);
  };

  // Save for later
  const handleSaveForLater = (itemId: string) => {
    setSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Apply discount code
  const handleApplyDiscount = () => {
    if (!discountCode.trim()) return;
    
    // Simulate discount validation (replace with actual API call)
    const validCodes: Record<string, number> = {
      'SAVE10': 0.10,
      'WELCOME20': 0.20,
      'FREESHIP': 0,
    };

    const discountRate = validCodes[discountCode.toUpperCase()];
    
    if (discountRate !== undefined) {
      if (discountRate === 0) {
        // Free shipping code
        setDiscountApplied(true);
        setDiscountAmount(0);
      } else {
        setDiscountApplied(true);
        setDiscountAmount(totals.subtotal * discountRate);
      }
    } else {
      alert('Invalid discount code');
    }
  };

  // Calculate totals with discount
  const finalDiscount = discountApplied ? discountAmount : totals.discount;
  const finalShipping = discountApplied && discountCode.toUpperCase() === 'FREESHIP' 
    ? 0 
    : estimatedShipping;
  const finalTax = (totals.subtotal - finalDiscount) * 0.08;
  const finalTotal = totals.subtotal - finalDiscount + finalTax + finalShipping;

  // Handle checkout
  const handleCheckout = () => {
    router.push('/checkout');
  };

  // Handle guest checkout
  const handleGuestCheckout = () => {
    router.push('/checkout?guest=true');
  };

  // Handle PayPal
  const handlePayPalCheckout = () => {
    // Integrate PayPal SDK here
    console.log('PayPal checkout');
  };

  // Handle Apple Pay
  const handleApplePayCheckout = () => {
    // Integrate Apple Pay SDK here
    console.log('Apple Pay checkout');
  };

  if (items.length === 0) {
    // Empty cart state
    return (
      <div className="min-h-screen  py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 sm:p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Your bag is empty
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Recently Viewed Products */}
            {recentlyViewed.length > 0 && (
              <div className="mt-12 pt-12 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Recently Viewed
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recentlyViewed.map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/${product.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-2">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${(product.discountPrice || product.price).toFixed(2)}
                        </span>
                        {product.discountPrice && (
                          <span className="text-xs text-gray-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Shopping Cart ({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})
        </h1>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const isUpdating = updatingItems.has(item.id);
              const isRemoving = removingItems.has(item.id);
              const isSaved = savedItems.has(item.id);
              const currentPrice = item.discountPrice || item.price;
              const itemSubtotal = currentPrice * item.quantity;

              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 transition-all duration-300 ${
                    isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  } ${isSaved ? 'border-2 border-orange-200 dark:border-orange-800' : ''}`}
                >
                  <div className="flex gap-4 sm:gap-6">
                    {/* Product Image */}
                    <Link
                      href={`/shop/${item.productSlug}`}
                      className="relative flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden hover:opacity-75 transition-opacity"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/shop/${item.productSlug}`}
                            className="font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors line-clamp-2"
                          >
                            {item.productName}
                          </Link>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1.5">
                              <span 
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{ backgroundColor: item.color }}
                                aria-label={item.color}
                              />
                              {item.color}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span>Size: {item.size}</span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span>SKU: {item.sku}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          disabled={isRemoving}
                          className="flex-shrink-0 p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          {isRemoving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Price and Quantity Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                        {/* Price */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-gray-900 dark:text-white">
                              ${currentPrice.toFixed(2)}
                            </span>
                            {item.discountPrice && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                ${item.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Subtotal: ${itemSubtotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantity:
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating || isRemoving}
                              className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              aria-label="Decrease quantity"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 animate-spin" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                              )}
                            </button>
                            
                            <span className={`min-w-[3rem] text-center font-medium text-gray-900 dark:text-white ${
                              isUpdating ? 'opacity-50' : ''
                            }`}>
                              {item.quantity}
                            </span>
                            
                            <button
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                              disabled={item.quantity >= item.maxStock || isUpdating || isRemoving}
                              className="p-1.5 sm:p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              aria-label="Increase quantity"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Stock Warning and Actions */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {item.quantity >= item.maxStock && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Maximum available quantity
                          </p>
                        )}
                        <button
                          onClick={() => handleSaveForLater(item.id)}
                          className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-orange-500 text-orange-500' : ''}`} />
                          {isSaved ? 'Saved' : 'Save for later'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Recently Viewed Products */}
            {recentlyViewed.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Recently Viewed
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {recentlyViewed.map((product) => (
                    <Link
                      key={product.id}
                      href={`/shop/${product.slug}`}
                      className="group"
                    >
                      <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden mb-2">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${(product.discountPrice || product.price).toFixed(2)}
                        </span>
                        {product.discountPrice && (
                          <span className="text-xs text-gray-500 line-through">
                            ${product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary - Sticky on mobile */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                  Order Summary
                </h2>

                {/* Discount Code */}
                <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter code"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent"
                    />
                    <button
                      onClick={handleApplyDiscount}
                      disabled={!discountCode.trim() || discountApplied}
                      className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                      Apply
                    </button>
                  </div>
                  {discountApplied && (
                    <div className="mt-2 flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Code applied!</span>
                      <button
                        onClick={() => {
                          setDiscountApplied(false);
                          setDiscountAmount(0);
                          setDiscountCode('');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${totals.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {finalDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Discount</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        -${finalDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Shipping</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {finalShipping === 0 ? (
                        <span className="text-green-600 dark:text-green-400">FREE</span>
                      ) : (
                        `$${finalShipping.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {finalShipping > 0 && totals.subtotal < SHIPPING_THRESHOLD && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Add ${(SHIPPING_THRESHOLD - totals.subtotal).toFixed(2)} more for free shipping!
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Estimated Tax</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${finalTax.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-base pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-gray-900 dark:text-white text-lg">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </button>

                  <button
                    onClick={handleGuestCheckout}
                    className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Guest Checkout
                  </button>
                </div>

                {/* Payment Buttons */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handlePayPalCheckout}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    PayPal
                  </button>

                  <button
                    onClick={handleApplePayCheckout}
                    className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Apple Pay
                  </button>
                </div>

                {/* Payment Methods */}
                <div className="mb-6">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Accepted payment methods:
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['Visa', 'Mastercard', 'Amex', 'PayPal', 'Apple Pay'].map((method) => (
                      <div
                        key={method}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        {method}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security Badges */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    <span>SSL Encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
