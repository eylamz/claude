'use client';

import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Cart Item Type
 * Represents a single item in the shopping cart
 */
export interface CartItem {
  id: string; // unique cart item id
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  maxStock: number;
  imageUrl: string;
  addedAt: number; // timestamp
}

/**
 * Product type for adding to cart
 */
export interface AddToCartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
}

/**
 * Variant type for adding to cart
 */
export interface AddToCartVariant {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price?: number;
}

/**
 * Cart Totals Type
 * Calculated totals for the cart
 */
export interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  itemCount: number;
}

/**
 * Cart State
 */
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Cart Actions
 */
interface CartActions {
  // Item management
  addItem: (
    product: AddToCartProduct,
    variant: AddToCartVariant,
    quantity?: number
  ) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  
  // UI actions
  toggleCart: () => void;
  openCart: () => void;
  setError: (error: string | null) => void;

  // Server sync
  syncWithServer: () => Promise<void>;
  
  // Merge guest cart on login
  mergeGuestCart: () => Promise<void>;
  
  // Calculations
  getTotals: () => CartTotals;
}

type CartStore = CartState & CartActions;


// Helper to generate unique cart item ID
const generateCartItemId = (productId: string, variantId: string): string => {
  return `${productId}-${variantId}-${Date.now()}`;
};

// Helper to check if item already exists in cart
const findExistingItem = (
  items: CartItem[],
  productId: string,
  variantId: string
): CartItem | undefined => {
  return items.find(
    item => item.productId === productId && item.variantId === variantId
  );
};

// API helpers
const apiCall = async (
  endpoint: string,
  method: string = 'GET',
  data?: any
) => {
  try {
    const response = await fetch(`/api/cart${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Failed to sync with server');
    }

    return await response.json();
  } catch (error) {
    console.error('Cart API error:', error);
    throw error;
  }
};

// Stock validation
const validateStock = async (
  variantId: string,
  requestedQuantity: number
): Promise<{ valid: boolean; availableStock: number; error?: string }> => {
  try {
    const response = await fetch(`/api/products/variants/${variantId}/stock`);
    
    if (!response.ok) {
      return {
        valid: false,
        availableStock: 0,
        error: 'Could not verify stock availability'
      };
    }

    const { stock } = await response.json();
    
    if (stock < requestedQuantity) {
      return {
        valid: false,
        availableStock: stock,
        error: stock === 0 
          ? 'This item is out of stock'
          : `Only ${stock} items available`
      };
    }

    return { valid: true, availableStock: stock };
  } catch (error) {
    console.error('Stock validation error:', error);
    return {
      valid: false,
      availableStock: 0,
      error: 'Could not verify stock availability'
    };
  }
};

/**
 * Check if user is logged in
 * Uses NextAuth session cookie detection
 */
const isUserLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check for NextAuth session cookie
  // NextAuth typically uses 'next-auth.session-token' or '__Secure-next-auth.session-token'
  const cookies = document.cookie.split(';');
  const hasSession = cookies.some(cookie => 
    cookie.trim().startsWith('next-auth.session-token') ||
    cookie.trim().startsWith('__Secure-next-auth.session-token') ||
    cookie.trim().startsWith('authjs.session-token') ||
    cookie.trim().startsWith('__Secure-authjs.session-token')
  );
  
  return hasSession;
};

/**
 * Get user ID from session
 * This should be called from components using useSession hook
 */
export const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get from session storage (if set by auth provider)
  const userId = sessionStorage.getItem('user_id');
  if (userId) return userId;
  
  // Fallback to checking if logged in
  return isUserLoggedIn() ? 'user' : null;
};

/**
 * Tax rate (8% - adjust as needed)
 */
const TAX_RATE = 0.08;

/**
 * Create the cart store with Zustand
 * Includes persistence for guest users and server sync for logged users
 */
export const useCartStore = create<CartStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      items: [],
      isOpen: false,
      isLoading: false,
      error: null,

      // Add item to cart
      addItem: async (product, variant, quantity = 1) => {
        const state = get();
        
        // Validate quantity
        if (quantity < 1) {
          set({ error: 'Quantity must be at least 1' });
          return false;
        }

        // Check if item already exists
        const existingItem = findExistingItem(
          state.items,
          product.id,
          variant.id
        );

        const totalQuantity = existingItem 
          ? existingItem.quantity + quantity 
          : quantity;

        // Validate stock
        const stockCheck = await validateStock(variant.id, totalQuantity);
        
        if (!stockCheck.valid) {
          set({ error: stockCheck.error || 'Insufficient stock' });
          return false;
        }

        // Optimistic update
        set((draft) => {
          draft.error = null;
          
          if (existingItem) {
            // Update existing item quantity
            const index = draft.items.findIndex(
              item => item.productId === product.id && item.variantId === variant.id
            );
            if (index !== -1) {
              draft.items[index].quantity = totalQuantity;
              draft.items[index].maxStock = stockCheck.availableStock;
            }
          } else {
            // Add new item
            const newItem: CartItem = {
              id: generateCartItemId(product.id, variant.id),
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              variantId: variant.id,
              sku: variant.sku,
              color: variant.color,
              size: variant.size,
              price: variant.price || product.price,
              discountPrice: product.discountPrice,
              quantity,
              maxStock: stockCheck.availableStock,
              imageUrl: product.imageUrl,
              addedAt: Date.now(),
            };
            draft.items.push(newItem);
          }
        });

        // Sync with server if logged in (Redis)
        if (isUserLoggedIn()) {
          try {
            set({ isLoading: true });
            await apiCall('/add', 'POST', {
              productId: product.id,
              variantId: variant.id,
              quantity: existingItem ? totalQuantity : quantity,
            });
            set({ isLoading: false });
          } catch (error) {
            console.error('Failed to sync add to server:', error);
            set({ 
              isLoading: false,
              error: 'Failed to sync with server, item added locally'
            });
            // Keep optimistic update even if sync fails
          }
        }

        return true;
      },

      // Update item quantity
      updateQuantity: async (itemId, quantity) => {
        const state = get();
        const item = state.items.find(i => i.id === itemId);

        if (!item) {
          set({ error: 'Item not found in cart' });
          return false;
        }

        if (quantity < 1) {
          set({ error: 'Quantity must be at least 1' });
          return false;
        }

        // Validate stock
        const stockCheck = await validateStock(item.variantId, quantity);
        
        if (!stockCheck.valid) {
          set({ error: stockCheck.error || 'Insufficient stock' });
          return false;
        }

        // Optimistic update
        const previousQuantity = item.quantity;
        set((draft) => {
          draft.error = null;
          const index = draft.items.findIndex(i => i.id === itemId);
          if (index !== -1) {
            draft.items[index].quantity = quantity;
            draft.items[index].maxStock = stockCheck.availableStock;
          }
        });

        // Sync with server if logged in (Redis)
        if (isUserLoggedIn()) {
          try {
            set({ isLoading: true });
            await apiCall('/update', 'PUT', {
              itemId,
              variantId: item.variantId,
              quantity,
            });
            set({ isLoading: false });
          } catch (error) {
            console.error('Failed to sync update to server:', error);
            // Rollback optimistic update on failure
            set((draft) => {
              const index = draft.items.findIndex(i => i.id === itemId);
              if (index !== -1) {
                draft.items[index].quantity = previousQuantity;
              }
              draft.isLoading = false;
              draft.error = 'Failed to update quantity';
            });
            return false;
          }
        }

        return true;
      },

      // Remove item from cart
      removeItem: async (itemId) => {
        const state = get();
        const item = state.items.find(i => i.id === itemId);

        if (!item) {
          set({ error: 'Item not found in cart' });
          return false;
        }

        // Optimistic update
        const removedItem = { ...item };
        set((draft) => {
          draft.error = null;
          draft.items = draft.items.filter(i => i.id !== itemId);
        });

        // Sync with server if logged in (Redis)
        if (isUserLoggedIn()) {
          try {
            set({ isLoading: true });
            await apiCall('/remove', 'DELETE', {
              itemId,
              variantId: item.variantId,
            });
            set({ isLoading: false });
          } catch (error) {
            console.error('Failed to sync remove to server:', error);
            // Rollback optimistic update on failure
            set((draft) => {
              draft.items.push(removedItem);
              draft.isLoading = false;
              draft.error = 'Failed to remove item';
            });
            return false;
          }
        }

        return true;
      },

      // Clear entire cart
      clearCart: async () => {
        const previousItems = [...get().items];
        
        // Optimistic update
        set({
          items: [],
          error: null,
        });

        // Sync with server if logged in (Redis)
        if (isUserLoggedIn()) {
          try {
            set({ isLoading: true });
            await apiCall('/clear', 'DELETE');
            set({ isLoading: false });
          } catch (error) {
            console.error('Failed to sync clear to server:', error);
            // Rollback optimistic update on failure
            set({
              items: previousItems,
              isLoading: false,
              error: 'Failed to clear cart',
            });
          }
        }
      },

      // Toggle cart drawer
      toggleCart: () => {
        set((draft) => {
          draft.isOpen = !draft.isOpen;
        });
      },

      openCart: () => {
        set({ isOpen: true });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      // Sync with server (Redis for logged users)
      syncWithServer: async () => {
        if (!isUserLoggedIn()) {
          console.log('Not logged in, skipping server sync');
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Fetch cart from Redis
          const serverCart = await apiCall('/sync', 'GET');
          
          // Merge server cart with local cart (server takes priority)
          set((draft) => {
            if (serverCart.items && serverCart.items.length > 0) {
              // Server cart exists, use it
              draft.items = serverCart.items || [];
            }
            // If server cart is empty but local has items, keep local
            draft.isLoading = false;
          });
        } catch (error) {
          console.error('Failed to sync with server:', error);
          set({
            isLoading: false,
            error: 'Failed to sync cart with server',
          });
        }
      },

      // Merge guest cart on login
      mergeGuestCart: async () => {
        if (!isUserLoggedIn()) {
          console.log('Not logged in, cannot merge cart');
          return;
        }

        const guestItems = [...get().items];
        
        if (guestItems.length === 0) {
          console.log('No guest items to merge');
          // Still sync to get server cart
          await get().syncWithServer();
          return;
        }

        set({ isLoading: true, error: null });

        try {
          // Send guest cart to server for merging with Redis cart
          const mergedCart = await apiCall('/merge', 'POST', {
            guestItems,
          });

          set((draft) => {
            // Server returns merged cart
            draft.items = mergedCart.items || guestItems;
            draft.isLoading = false;
          });

          console.log('Guest cart merged successfully');
        } catch (error) {
          console.error('Failed to merge guest cart:', error);
          set({
            isLoading: false,
            error: 'Failed to merge cart',
          });
          // Fallback: try to sync with server anyway
          await get().syncWithServer();
        }
      },

      // Calculate cart totals (subtotal, discount, tax, total)
      getTotals: () => {
        const state = get();
        
        // Calculate subtotal (using discount price if available)
        const subtotal = state.items.reduce((sum, item) => {
          const itemPrice = item.discountPrice || item.price;
          return sum + (itemPrice * item.quantity);
        }, 0);

        // Calculate total discount amount
        const discount = state.items.reduce((sum, item) => {
          if (item.discountPrice && item.discountPrice < item.price) {
            const savings = (item.price - item.discountPrice) * item.quantity;
            return sum + savings;
          }
          return sum;
        }, 0);
        
        // Calculate tax (on subtotal after discount)
        const taxableAmount = subtotal;
        const tax = taxableAmount * TAX_RATE;
        
        // Calculate total (subtotal + tax)
        const total = subtotal + tax;

        // Calculate item count
        const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

        return {
          subtotal,
          discount,
          tax,
          total,
          itemCount,
        };
      },
    })),
    {
      name: 'cart-storage', // localStorage key
      storage: createJSONStorage(() => localStorage), // Persist to localStorage for guests
      partialize: (state) => ({
        // Only persist items for guest users
        items: state.items,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, merge guest cart if user is logged in
        if (state && isUserLoggedIn()) {
          // Merge guest cart on login - merges localStorage cart with Redis cart
          state.mergeGuestCart();
        }
      },
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 * Use these in components to avoid unnecessary re-renders
 */
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);
export const useCartIsLoading = () => useCartStore((state) => state.isLoading);
export const useCartError = () => useCartStore((state) => state.error);
export const useCartTotals = () => {
  // Subscribe only to items array to avoid calling getTotals() which returns new object
  const items = useCartStore((state) => state.items);
  
  // Memoize totals calculation to prevent unnecessary recalculations
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const itemPrice = item.discountPrice || item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);

    const discount = items.reduce((sum, item) => {
      if (item.discountPrice && item.discountPrice < item.price) {
        const savings = (item.price - item.discountPrice) * item.quantity;
        return sum + savings;
      }
      return sum;
    }, 0);
    
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      discount,
      tax,
      total,
      itemCount,
    };
  }, [items]);
};
export const useCartItemCount = () => useCartStore((state) => 
  state.items.reduce((sum, item) => sum + item.quantity, 0)
);

/**
 * Cart actions - can be called outside React components
 */
export const cartActions = {
  addItem: (product: AddToCartProduct, variant: AddToCartVariant, quantity?: number) => 
    useCartStore.getState().addItem(product, variant, quantity),
  updateQuantity: (itemId: string, quantity: number) => 
    useCartStore.getState().updateQuantity(itemId, quantity),
  removeItem: (itemId: string) => 
    useCartStore.getState().removeItem(itemId),
  clearCart: () => 
    useCartStore.getState().clearCart(),
  toggleCart: () => 
    useCartStore.getState().toggleCart(),
  syncWithServer: () => 
    useCartStore.getState().syncWithServer(),
  mergeGuestCart: () => 
    useCartStore.getState().mergeGuestCart(),
};

