# Cart System Guide

Complete implementation of a shopping cart system with Zustand state management, localStorage persistence, and server synchronization.

## 📁 File Structure

```
nextjs-app/
├── stores/
│   └── cartStore.ts                 # Zustand cart store with persistence
├── components/
│   ├── cart/
│   │   ├── CartDrawer.tsx          # Slide-in cart drawer
│   │   └── CartButton.tsx          # Cart toggle button with badge
│   └── shop/
│       ├── ProductGallery.tsx      # Product image gallery
│       └── VariantSelector.tsx     # Color & size selector
└── app/
    └── api/
        └── cart/
            ├── add/route.ts        # Add item to cart
            ├── update/route.ts     # Update item quantity
            ├── remove/route.ts     # Remove item from cart
            ├── clear/route.ts      # Clear entire cart
            ├── sync/route.ts       # Sync cart with server
            └── merge/route.ts      # Merge guest cart on login
        └── products/
            └── variants/
                └── [variantId]/
                    └── stock/route.ts  # Check stock availability
```

## 🎯 Features

### Cart Store (`cartStore.ts`)
- **State Management**: Uses Zustand with Immer middleware for immutable updates
- **Persistence**: Automatic localStorage persistence for guest users
- **Server Sync**: Redis synchronization for logged-in users
- **Optimistic Updates**: Instant UI updates with rollback on failure
- **Stock Validation**: Real-time stock checking before adding items
- **Guest Cart Merge**: Seamlessly merge guest cart when user logs in
- **Calculations**: Automatic totals (subtotal, discount, tax, shipping)

### CartDrawer Component
- **Slide-in Animation**: Smooth slide from right (full screen on mobile)
- **Empty State**: Helpful message and CTA when cart is empty
- **Item Management**: Inline quantity updates and remove buttons
- **Price Display**: Shows discounts and variant pricing
- **Totals Breakdown**: Subtotal, shipping, tax, and total
- **Loading States**: Visual feedback during updates
- **Error Handling**: Display and auto-dismiss errors
- **Accessibility**: Full ARIA labels and keyboard navigation

### ProductGallery Component
- **Main Image Display**: Large view with hover zoom
- **Thumbnail Strip**: Horizontal (mobile) / Vertical (desktop)
- **Fullscreen Modal**: Dark overlay with carousel and zoom controls
- **Mobile Gestures**: Swipe, pinch-to-zoom, double-tap
- **Loading States**: Spinner for each image
- **Error Handling**: Retry functionality for failed loads

### VariantSelector Component
- **Color Selection**: Hex color circles with hover tooltips
- **Size Selection**: Button-based size picker
- **Smart Logic**: Auto-reset size when color changes
- **Stock Indicators**: Out of stock, low stock warnings
- **Variant Info**: SKU, availability, and price display
- **Accessibility**: Full ARIA attributes

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install zustand
```

### 2. Add to Your Layout

Add the CartDrawer to your root layout:

```tsx
// app/layout.tsx
import CartDrawer from '@/components/cart/CartDrawer';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CartDrawer />
      </body>
    </html>
  );
}
```

### 3. Add Cart Button to Navigation

```tsx
// components/navigation/Header.tsx
import CartButton from '@/components/cart/CartButton';

export default function Header() {
  return (
    <header>
      <nav>
        {/* Your navigation items */}
        <CartButton />
      </nav>
    </header>
  );
}
```

## 📖 Usage Examples

### Adding Items to Cart

```tsx
import { useCartStore } from '@/stores/cartStore';

function ProductPage({ product, variants }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    const success = await addItem(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        discountPrice: product.discountPrice,
        imageUrl: product.images[0].url,
      },
      {
        id: selectedVariant.id,
        sku: selectedVariant.sku,
        color: selectedVariant.color,
        size: selectedVariant.size,
        stock: selectedVariant.stock,
        price: selectedVariant.price,
      },
      1 // quantity
    );

    if (success) {
      openCart(); // Open drawer on success
    }
  };

  return (
    <div>
      <ProductGallery 
        images={product.images} 
        productName={product.name} 
      />
      
      <VariantSelector
        variants={variants}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onVariantChange={(variant, color, size) => {
          setSelectedVariant(variant);
          setSelectedColor(color);
          setSelectedSize(size);
        }}
      />

      <button onClick={handleAddToCart}>
        Add to Cart
      </button>
    </div>
  );
}
```

### Using Cart State

```tsx
import { useCartStore, useCartItems, useCartTotals } from '@/stores/cartStore';

function CheckoutPage() {
  const items = useCartItems();
  const totals = useCartTotals();
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div>
      <h1>Checkout</h1>
      
      {items.map(item => (
        <div key={item.id}>
          <img src={item.imageUrl} alt={item.productName} />
          <h3>{item.productName}</h3>
          <p>{item.color} - {item.size}</p>
          <p>${item.discountPrice || item.price}</p>
          
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
          />
          
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}

      <div>
        <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
        <p>Shipping: ${totals.shipping.toFixed(2)}</p>
        <p>Tax: ${totals.tax.toFixed(2)}</p>
        <p>Total: ${totals.total.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### Merging Guest Cart on Login

```tsx
import { cartActions } from '@/stores/cartStore';

async function handleLogin(userId: string) {
  // After successful login
  await cartActions.mergeGuestCart(userId);
}
```

### Manual Server Sync

```tsx
import { cartActions } from '@/stores/cartStore';

// Force sync with server
await cartActions.syncWithServer();
```

## 🔧 Configuration

### Tax Rate

Modify the tax rate in `cartStore.ts`:

```typescript
const TAX_RATE = 0.08; // 8% - adjust as needed
```

### Shipping Settings

```typescript
const SHIPPING_THRESHOLD = 50; // Free shipping over $50
const SHIPPING_COST = 5.99;    // Standard shipping cost
```

### Auth Integration

Update the `isUserLoggedIn()` function in `cartStore.ts`:

```typescript
const isUserLoggedIn = (): boolean => {
  // Replace with your auth implementation
  // Examples:
  // - Check for auth cookie
  // - Check localStorage/sessionStorage
  // - Use your auth store/context
  return !!yourAuthCheck();
};
```

## 🗄️ Backend Implementation

### Redis Setup (Example)

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### Database Schema (Prisma Example)

```prisma
model Product {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  price         Float
  discountPrice Float?
  imageUrl      String
  variants      ProductVariant[]
}

model ProductVariant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  sku       String  @unique
  color     String
  colorHex  String
  size      String
  price     Float?
  stock     Int     @default(0)
}
```

### Implementing API Routes

The API routes in `app/api/cart/` are set up with placeholder comments. Uncomment and implement based on your:
- Authentication system
- Database (Prisma, MongoDB, etc.)
- Redis implementation

## 📱 Mobile Optimization

- Full-screen drawer on mobile devices
- Touch gestures (swipe, pinch, double-tap)
- Optimized image loading
- Responsive layouts

## ♿ Accessibility

- Full keyboard navigation
- ARIA labels and attributes
- Focus management
- Screen reader friendly
- Semantic HTML

## 🎨 Customization

### Styling

All components use Tailwind CSS. Customize colors and styles:

```tsx
// Example: Change primary color from gray-900 to blue-600
className="bg-gray-900" // Change to
className="bg-blue-600"
```

### Animations

Adjust transition durations in components:

```tsx
// CartDrawer.tsx
className="transition-transform duration-300" // Adjust duration
```

## 🧪 Testing

### Test Cart Operations

```tsx
import { useCartStore } from '@/stores/cartStore';

// Get store instance
const store = useCartStore.getState();

// Test add
await store.addItem(mockProduct, mockVariant, 2);

// Test update
await store.updateQuantity(itemId, 5);

// Test remove
await store.removeItem(itemId);

// Test clear
await store.clearCart();
```

## 🐛 Troubleshooting

### Hydration Errors

If you see hydration mismatches, the CartDrawer uses a `mounted` state to prevent SSR issues.

### Cart Not Persisting

1. Check localStorage is enabled
2. Verify the storage key: `cart-storage`
3. Check browser console for errors

### Stock Validation Failing

Ensure the stock API endpoint returns correct format:
```json
{
  "stock": 10,
  "variantId": "variant-id"
}
```

## 📊 Performance

- **Optimistic Updates**: Instant UI feedback
- **Selective Re-renders**: Using Zustand selectors
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Components load on demand

## 🔐 Security

- Server-side stock validation
- User authentication checks
- Input sanitization
- CSRF protection (implement as needed)

## 📝 Type Safety

Full TypeScript support with interfaces:
- `CartItem`
- `CartTotals`
- `CartState`
- `CartActions`
- `ProductImage`
- `Variant`

## 🚢 Deployment

1. Set environment variables for Redis/Database
2. Build the project: `npm run build`
3. Test cart functionality in production mode
4. Monitor API endpoints for errors

## 📚 Additional Resources

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

Created with ❤️ for seamless e-commerce experiences.











