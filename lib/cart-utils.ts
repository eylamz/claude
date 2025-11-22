import { CartItem } from '@/stores/cartStore';

/**
 * Format currency value
 */
export function formatCurrency(amount: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Calculate item subtotal
 */
export function calculateItemSubtotal(item: CartItem): number {
  const price = item.discountPrice || item.price;
  return price * item.quantity;
}

/**
 * Calculate total savings from discounts
 */
export function calculateItemSavings(item: CartItem): number {
  if (!item.discountPrice) return 0;
  return (item.price - item.discountPrice) * item.quantity;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  discountPrice: number
): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

/**
 * Check if item is low in stock
 */
export function isLowStock(stock: number, threshold: number = 5): boolean {
  return stock > 0 && stock <= threshold;
}

/**
 * Check if item is out of stock
 */
export function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}

/**
 * Get stock status message
 */
export function getStockStatusMessage(stock: number): {
  message: string;
  color: 'green' | 'orange' | 'red';
} {
  if (stock === 0) {
    return { message: 'Out of Stock', color: 'red' };
  }
  if (stock <= 5) {
    return { message: `Only ${stock} left`, color: 'orange' };
  }
  return { message: 'In Stock', color: 'green' };
}

/**
 * Validate quantity against stock
 */
export function validateQuantity(
  requestedQuantity: number,
  availableStock: number
): { valid: boolean; error?: string } {
  if (requestedQuantity < 1) {
    return { valid: false, error: 'Quantity must be at least 1' };
  }
  if (requestedQuantity > availableStock) {
    return {
      valid: false,
      error:
        availableStock === 0
          ? 'This item is out of stock'
          : `Only ${availableStock} items available`,
    };
  }
  return { valid: true };
}

/**
 * Generate cart item summary for analytics
 */
export function generateCartSummary(items: CartItem[]) {
  return {
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    uniqueProducts: items.length,
    totalValue: items.reduce((sum, item) => {
      const price = item.discountPrice || item.price;
      return sum + price * item.quantity;
    }, 0),
    totalSavings: items.reduce((sum, item) => {
      if (item.discountPrice) {
        return sum + (item.price - item.discountPrice) * item.quantity;
      }
      return sum;
    }, 0),
  };
}

/**
 * Group cart items by product
 */
export function groupItemsByProduct(items: CartItem[]): Map<string, CartItem[]> {
  return items.reduce((acc, item) => {
    const existing = acc.get(item.productId) || [];
    acc.set(item.productId, [...existing, item]);
    return acc;
  }, new Map<string, CartItem[]>());
}

/**
 * Sort cart items
 */
export function sortCartItems(
  items: CartItem[],
  sortBy: 'name' | 'price' | 'recent' | 'quantity' = 'recent'
): CartItem[] {
  const sorted = [...items];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    
    case 'price':
      return sorted.sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        return priceB - priceA;
      });
    
    case 'quantity':
      return sorted.sort((a, b) => b.quantity - a.quantity);
    
    case 'recent':
    default:
      return sorted.sort((a, b) => b.addedAt - a.addedAt);
  }
}

/**
 * Check if cart has items with discounts
 */
export function hasDiscountedItems(items: CartItem[]): boolean {
  return items.some(item => item.discountPrice);
}

/**
 * Get recommended quantity (based on common purchase patterns)
 */
export function getRecommendedQuantity(
  productType: string,
  stock: number
): number {
  // Example logic - customize based on your products
  const recommendations: Record<string, number> = {
    clothing: 1,
    accessories: 2,
    consumables: 3,
  };

  const recommended = recommendations[productType] || 1;
  return Math.min(recommended, stock);
}

/**
 * Calculate estimated delivery date
 */
export function getEstimatedDelivery(
  shippingMethod: 'standard' | 'express' | 'overnight' = 'standard'
): { min: Date; max: Date } {
  const now = new Date();
  const deliveryDays: Record<string, { min: number; max: number }> = {
    standard: { min: 5, max: 7 },
    express: { min: 2, max: 3 },
    overnight: { min: 1, max: 1 },
  };

  const days = deliveryDays[shippingMethod];
  const minDate = new Date(now);
  minDate.setDate(minDate.getDate() + days.min);

  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + days.max);

  return { min: minDate, max: maxDate };
}

/**
 * Format date range for delivery estimate
 */
export function formatDeliveryDate(min: Date, max: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  const minStr = min.toLocaleDateString('en-US', options);
  const maxStr = max.toLocaleDateString('en-US', options);

  if (minStr === maxStr) {
    return minStr;
  }

  return `${minStr} - ${maxStr}`;
}

/**
 * Check if free shipping threshold is met
 */
export function checkFreeShipping(
  subtotal: number,
  threshold: number = 50
): { eligible: boolean; remaining?: number } {
  if (subtotal >= threshold) {
    return { eligible: true };
  }
  return { eligible: false, remaining: threshold - subtotal };
}

/**
 * Generate SKU list for order
 */
export function getCartSkuList(items: CartItem[]): string[] {
  return items.map(item => item.sku);
}

/**
 * Prepare cart data for checkout
 */
export function prepareCheckoutData(items: CartItem[]) {
  return items.map(item => ({
    productId: item.productId,
    variantId: item.variantId,
    sku: item.sku,
    quantity: item.quantity,
    price: item.discountPrice || item.price,
  }));
}











