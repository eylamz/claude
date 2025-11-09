import { getRedisClient, type RedisClient } from './client';

/**
 * Cart item interface
 */
export interface CartItem {
  productId: string;
  variantId?: string;
  colorHex?: string;
  size?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  addedAt: string;
}

/**
 * Cart interface
 */
export interface Cart {
  items: CartItem[];
  userId?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  total: number;
  itemCount: number;
}

/**
 * Generate cart key
 */
function getCartKey(identifier: string, isUser: boolean = false): string {
  return isUser ? `cart:user:${identifier}` : `cart:session:${identifier}`;
}

/**
 * Calculate cart totals
 */
function calculateTotals(items: CartItem[]): { total: number; itemCount: number } {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { total, itemCount };
}

/**
 * Create empty cart
 */
function createEmptyCart(sessionId: string, userId?: string): Cart {
  return {
    items: [],
    userId,
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    total: 0,
    itemCount: 0,
  };
}

/**
 * Parse cart from JSON
 */
function parseCart(data: string | null): Cart | null {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Cart Manager
 */
export class CartManager {
  private redis: RedisClient;
  private cartTTL: number; // 7 days in seconds

  constructor() {
    this.redis = getRedisClient();
    this.cartTTL = 7 * 24 * 60 * 60; // 7 days
  }

  /**
   * Get cart by user ID or session ID
   */
  async getCart(userId?: string, sessionId?: string): Promise<Cart | null> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    // Try user cart first if userId is provided
    if (userId) {
      const userCart = await this.redis.get(getCartKey(userId, true));
      if (userCart) {
        return parseCart(userCart);
      }
    }

    // Fallback to session cart
    if (sessionId) {
      const sessionCart = await this.redis.get(getCartKey(sessionId, false));
      if (sessionCart) {
        return parseCart(sessionCart);
      }
    }

    return null;
  }

  /**
   * Add item to cart
   */
  async addToCart(
    item: Omit<CartItem, 'addedAt'>,
    userId?: string,
    sessionId?: string
  ): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const identifier = userId || sessionId!;
    const isUser = !!userId;

    // Get existing cart or create new one
    let cart = await this.getCart(userId, sessionId);
    if (!cart) {
      cart = createEmptyCart(sessionId || '', userId);
    }

    // Check if item already exists in cart (same product, variant, color, size)
    const existingItemIndex = cart.items.findIndex(
      existingItem =>
        existingItem.productId === item.productId &&
        existingItem.variantId === item.variantId &&
        existingItem.colorHex === item.colorHex &&
        existingItem.size === item.size
    );

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item
      cart.items.push({
        ...item,
        addedAt: new Date().toISOString(),
      });
    }

    // Recalculate totals
    const { total, itemCount } = calculateTotals(cart.items);
    cart.total = total;
    cart.itemCount = itemCount;
    cart.updatedAt = new Date().toISOString();
    if (userId) cart.userId = userId;

    // Save to Redis
    const cartKey = getCartKey(identifier, isUser);
    await this.redis.set(cartKey, JSON.stringify(cart), { ex: this.cartTTL });

    return cart;
  }

  /**
   * Update item quantity in cart
   */
  async updateQuantity(
    productId: string,
    quantity: number,
    userId?: string,
    sessionId?: string,
    options?: { variantId?: string; colorHex?: string; size?: string }
  ): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const identifier = userId || sessionId!;
    const isUser = !!userId;

    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Find item
    const itemIndex = cart.items.findIndex(
      item =>
        item.productId === productId &&
        item.variantId === options?.variantId &&
        item.colorHex === options?.colorHex &&
        item.size === options?.size
    );

    if (itemIndex < 0) {
      throw new Error('Item not found in cart');
    }

    // Update quantity
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    // Recalculate totals
    const { total, itemCount } = calculateTotals(cart.items);
    cart.total = total;
    cart.itemCount = itemCount;
    cart.updatedAt = new Date().toISOString();

    // Save to Redis
    const cartKey = getCartKey(identifier, isUser);
    await this.redis.set(cartKey, JSON.stringify(cart), { ex: this.cartTTL });

    return cart;
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(
    productId: string,
    userId?: string,
    sessionId?: string,
    options?: { variantId?: string; colorHex?: string; size?: string }
  ): Promise<Cart> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const identifier = userId || sessionId!;
    const isUser = !!userId;

    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      throw new Error('Cart not found');
    }

    // Find and remove item
    cart.items = cart.items.filter(
      item =>
        !(
          item.productId === productId &&
          item.variantId === options?.variantId &&
          item.colorHex === options?.colorHex &&
          item.size === options?.size
        )
    );

    // Recalculate totals
    const { total, itemCount } = calculateTotals(cart.items);
    cart.total = total;
    cart.itemCount = itemCount;
    cart.updatedAt = new Date().toISOString();

    // Save to Redis
    const cartKey = getCartKey(identifier, isUser);
    await this.redis.set(cartKey, JSON.stringify(cart), { ex: this.cartTTL });

    return cart;
  }

  /**
   * Clear cart
   */
  async clearCart(userId?: string, sessionId?: string): Promise<void> {
    if (!userId && !sessionId) {
      throw new Error('Either userId or sessionId must be provided');
    }

    const identifier = userId || sessionId!;
    const isUser = !!userId;
    const cartKey = getCartKey(identifier, isUser);

    await this.redis.del(cartKey);
  }

  /**
   * Merge guest cart into user cart
   */
  async mergeGuestCart(sessionId: string, userId: string): Promise<Cart> {
    const guestCart = await this.getCart(undefined, sessionId);
    const userCart = await this.getCart(userId, undefined);

    let mergedCart: Cart;

    if (guestCart && userCart) {
      // Merge both carts
      mergedCart = {
        ...userCart,
        items: [...userCart.items],
        updatedAt: new Date().toISOString(),
      };

      // Add guest items (merge quantities if duplicate)
      for (const guestItem of guestCart.items) {
        const existingItemIndex = mergedCart.items.findIndex(
          item =>
            item.productId === guestItem.productId &&
            item.variantId === guestItem.variantId &&
            item.colorHex === guestItem.colorHex &&
            item.size === guestItem.size
        );

        if (existingItemIndex >= 0) {
          mergedCart.items[existingItemIndex].quantity += guestItem.quantity;
        } else {
          mergedCart.items.push(guestItem);
        }
      }
    } else if (guestCart) {
      // Use guest cart as user cart
      mergedCart = {
        ...guestCart,
        userId,
      };
    } else if (userCart) {
      // Keep user cart
      mergedCart = userCart;
    } else {
      // Create empty cart
      mergedCart = createEmptyCart(sessionId, userId);
    }

    // Recalculate totals
    const { total, itemCount } = calculateTotals(mergedCart.items);
    mergedCart.total = total;
    mergedCart.itemCount = itemCount;
    mergedCart.updatedAt = new Date().toISOString();

    // Save merged cart
    const userCartKey = getCartKey(userId, true);
    await this.redis.set(userCartKey, JSON.stringify(mergedCart), { ex: this.cartTTL });

    // Delete guest cart
    const guestCartKey = getCartKey(sessionId, false);
    await this.redis.del(guestCartKey);

    return mergedCart;
  }

  /**
   * Get cart total
   */
  async getCartTotal(userId?: string, sessionId?: string): Promise<number> {
    const cart = await this.getCart(userId, sessionId);
    return cart?.total || 0;
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(userId?: string, sessionId?: string): Promise<number> {
    const cart = await this.getCart(userId, sessionId);
    return cart?.itemCount || 0;
  }
}

/**
 * Singleton cart manager instance
 */
let cartManagerInstance: CartManager | null = null;

/**
 * Get cart manager instance
 */
export function getCartManager(): CartManager {
  if (!cartManagerInstance) {
    cartManagerInstance = new CartManager();
  }
  return cartManagerInstance;
}

