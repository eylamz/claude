# Quick Reference Card

## 🎯 Common Operations

### Add Item to Cart
```tsx
import { useCartStore } from '@/stores/cartStore';

const { addItem, openCart } = useCartStore();

await addItem(
  {
    id: 'product-1',
    name: 'T-Shirt',
    slug: 't-shirt',
    price: 29.99,
    discountPrice: 24.99,
    imageUrl: '/tshirt.jpg'
  },
  {
    id: 'variant-1',
    sku: 'TSH-BLU-M',
    color: 'Blue',
    size: 'M',
    stock: 10,
    price: 29.99
  },
  1 // quantity
);

openCart(); // Open drawer after adding
```

### Update Quantity
```tsx
import { useCartStore } from '@/stores/cartStore';

const { updateQuantity } = useCartStore();

await updateQuantity('cart-item-id', 3);
```

### Remove Item
```tsx
import { useCartStore } from '@/stores/cartStore';

const { removeItem } = useCartStore();

await removeItem('cart-item-id');
```

### Clear Cart
```tsx
import { useCartStore } from '@/stores/cartStore';

const { clearCart } = useCartStore();

await clearCart();
```

### Toggle Cart Drawer
```tsx
import { useCartStore } from '@/stores/cartStore';

const { toggleCart, openCart, closeCart } = useCartStore();

toggleCart(); // Open if closed, close if open
openCart();   // Always open
closeCart();  // Always close
```

### Get Cart Data
```tsx
import { useCartItems, useCartTotals, useCartItemCount } from '@/stores/cartStore';

function MyComponent() {
  const items = useCartItems();         // All cart items
  const totals = useCartTotals();       // Calculated totals
  const itemCount = useCartItemCount(); // Total item count
  
  return (
    <div>
      <p>Items: {itemCount}</p>
      <p>Total: ${totals.total.toFixed(2)}</p>
    </div>
  );
}
```

### Sync with Server
```tsx
import { useCartStore } from '@/stores/cartStore';

const { syncWithServer } = useCartStore();

await syncWithServer();
```

### Merge Guest Cart on Login
```tsx
import { cartActions } from '@/stores/cartStore';

// After user logs in
await cartActions.mergeGuestCart(userId);
```

## 🧩 Component Usage

### ProductGallery
```tsx
import ProductGallery from '@/components/shop/ProductGallery';

<ProductGallery
  images={[
    { id: '1', url: '/image1.jpg', alt: 'Front view' },
    { id: '2', url: '/image2.jpg', alt: 'Back view' }
  ]}
  productName="Premium T-Shirt"
/>
```

### VariantSelector
```tsx
import VariantSelector from '@/components/shop/VariantSelector';
import { useState } from 'react';

const [selectedColor, setSelectedColor] = useState(null);
const [selectedSize, setSelectedSize] = useState(null);
const [selectedVariant, setSelectedVariant] = useState(null);

<VariantSelector
  variants={[
    {
      id: 'v1',
      color: 'Blue',
      colorHex: '#0000FF',
      size: 'M',
      price: 29.99,
      stock: 10,
      sku: 'TSH-BLU-M'
    }
  ]}
  selectedColor={selectedColor}
  selectedSize={selectedSize}
  onVariantChange={(variant, color, size) => {
    setSelectedVariant(variant);
    setSelectedColor(color);
    setSelectedSize(size);
  }}
/>
```

### CartButton
```tsx
import CartButton from '@/components/cart/CartButton';

// Add to your header/navigation
<CartButton />
```

### CartDrawer
```tsx
import CartDrawer from '@/components/cart/CartDrawer';

// Add to root layout (only once)
<CartDrawer />
```

### CartProvider
```tsx
import CartProvider from '@/components/providers/CartProvider';

// Wrap your app
<CartProvider>
  {children}
</CartProvider>
```

## 🛠️ Utility Functions

### Format Currency
```tsx
import { formatCurrency } from '@/lib/cart-utils';

formatCurrency(29.99); // "$29.99"
```

### Calculate Discount Percentage
```tsx
import { calculateDiscountPercentage } from '@/lib/cart-utils';

calculateDiscountPercentage(29.99, 24.99); // 17
```

### Get Stock Status
```tsx
import { getStockStatusMessage } from '@/lib/cart-utils';

getStockStatusMessage(3);
// { message: "Only 3 left", color: "orange" }
```

### Validate Quantity
```tsx
import { validateQuantity } from '@/lib/cart-utils';

validateQuantity(5, 3);
// { valid: false, error: "Only 3 items available" }
```

### Calculate Item Subtotal
```tsx
import { calculateItemSubtotal } from '@/lib/cart-utils';

calculateItemSubtotal(cartItem); // price * quantity
```

### Sort Cart Items
```tsx
import { sortCartItems } from '@/lib/cart-utils';

sortCartItems(items, 'name');     // Alphabetical
sortCartItems(items, 'price');    // By price (high to low)
sortCartItems(items, 'quantity'); // By quantity
sortCartItems(items, 'recent');   // Recently added first
```

### Check Free Shipping
```tsx
import { checkFreeShipping } from '@/lib/cart-utils';

checkFreeShipping(45.00, 50);
// { eligible: false, remaining: 5.00 }
```

## 🎨 TypeScript Types

### CartItem
```typescript
interface CartItem {
  id: string;
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
  addedAt: number;
}
```

### CartTotals
```typescript
interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  itemCount: number;
}
```

### Product (for addItem)
```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
}
```

### Variant (for addItem)
```typescript
interface Variant {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  price?: number;
}
```

## 🔧 Configuration

### Change Tax Rate
```typescript
// stores/cartStore.ts
const TAX_RATE = 0.08; // 8%
```

### Change Shipping Settings
```typescript
// stores/cartStore.ts
const SHIPPING_THRESHOLD = 50;  // Free over $50
const SHIPPING_COST = 5.99;     // Standard shipping
```

### Customize Auth Check
```typescript
// stores/cartStore.ts
const isUserLoggedIn = (): boolean => {
  // Your auth logic here
  return !!yourAuthCheck();
};
```

## 📱 Keyboard Shortcuts

### CartDrawer
- `Escape` - Close drawer

### ProductGallery (Fullscreen)
- `Escape` - Close fullscreen
- `←` / `→` - Navigate images
- `+` / `-` - Zoom in/out

## 🎯 Event Handlers

### Full Add to Cart Flow
```tsx
const [selectedVariant, setSelectedVariant] = useState(null);
const [quantity, setQuantity] = useState(1);
const { addItem, openCart, error, setError } = useCartStore();

const handleAddToCart = async () => {
  if (!selectedVariant) {
    setError('Please select a variant');
    return;
  }

  const success = await addItem(product, selectedVariant, quantity);
  
  if (success) {
    openCart();
    // Optional: Reset form
    setQuantity(1);
  }
};

return (
  <>
    {error && <p className="text-red-600">{error}</p>}
    <button onClick={handleAddToCart}>Add to Cart</button>
  </>
);
```

## 🔄 State Selectors

Use these for optimal performance:

```tsx
// Re-renders only when items change
const items = useCartItems();

// Re-renders only when drawer state changes
const isOpen = useCartIsOpen();

// Re-renders only when totals change
const totals = useCartTotals();

// Re-renders only when item count changes
const itemCount = useCartItemCount();

// Access full store (use sparingly)
const store = useCartStore();
```

## 🚨 Error Handling

```tsx
const { addItem, error, setError } = useCartStore();

const result = await addItem(product, variant, quantity);

if (!result) {
  // Error is already set in store
  console.error('Failed to add item:', error);
  
  // Auto-clear after 3 seconds
  setTimeout(() => setError(null), 3000);
}
```

## 📊 Analytics Integration

```tsx
import { useCartStore } from '@/stores/cartStore';
import { generateCartSummary } from '@/lib/cart-utils';

const items = useCartItems();
const summary = generateCartSummary(items);

// Track with your analytics
analytics.track('cart_viewed', {
  itemCount: summary.itemCount,
  totalValue: summary.totalValue,
  uniqueProducts: summary.uniqueProducts
});
```

## 🧪 Testing

```typescript
// Get store instance directly
import { useCartStore } from '@/stores/cartStore';

const store = useCartStore.getState();

// Test operations
await store.addItem(mockProduct, mockVariant, 1);
expect(store.items.length).toBe(1);

await store.updateQuantity(itemId, 3);
expect(store.items[0].quantity).toBe(3);

await store.removeItem(itemId);
expect(store.items.length).toBe(0);
```

---

**Tip:** Bookmark this page for quick reference during development!











