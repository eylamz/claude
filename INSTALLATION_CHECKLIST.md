# Installation Checklist ✅

Follow this checklist to integrate the cart system into your Next.js application.

## Prerequisites

- [ ] Next.js 14+ with App Router
- [ ] TypeScript configured
- [ ] Tailwind CSS installed
- [ ] Path aliases configured (`@/` pointing to root)

## Step 1: Install Dependencies

```bash
npm install zustand lucide-react
```

- [ ] Dependencies installed successfully
- [ ] No version conflicts

## Step 2: Verify File Structure

Ensure these files exist in your project:

### Core Components
- [ ] `components/cart/CartDrawer.tsx`
- [ ] `components/cart/CartButton.tsx`
- [ ] `components/shop/ProductGallery.tsx`
- [ ] `components/shop/VariantSelector.tsx`
- [ ] `components/providers/CartProvider.tsx`

### State & Utils
- [ ] `stores/cartStore.ts`
- [ ] `lib/cart-utils.ts`

### API Routes
- [ ] `app/api/cart/add/route.ts`
- [ ] `app/api/cart/update/route.ts`
- [ ] `app/api/cart/remove/route.ts`
- [ ] `app/api/cart/clear/route.ts`
- [ ] `app/api/cart/sync/route.ts`
- [ ] `app/api/cart/merge/route.ts`
- [ ] `app/api/products/variants/[variantId]/stock/route.ts`

### Documentation
- [ ] `CART_README.md`
- [ ] `QUICK_REFERENCE.md`
- [ ] `CART_SYSTEM_GUIDE.md`
- [ ] `ARCHITECTURE.md`
- [ ] `DEPENDENCIES.md`

## Step 3: Verify TypeScript Configuration

Check your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] Path aliases configured
- [ ] No TypeScript errors when building

## Step 4: Verify Tailwind Configuration

Check your `tailwind.config.js`:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './stores/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... rest of config
}
```

- [ ] All paths included in content array
- [ ] Tailwind builds successfully

## Step 5: Add CartProvider to Layout

Edit your root layout file:

```tsx
// app/layout.tsx or app/[locale]/layout.tsx
import CartProvider from '@/components/providers/CartProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
```

- [ ] CartProvider added to layout
- [ ] No hydration errors
- [ ] CartDrawer renders (check with React DevTools)

## Step 6: Add Cart Button to Navigation

Add to your header/navigation component:

```tsx
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

- [ ] Cart button visible in header
- [ ] Badge shows item count
- [ ] Clicking opens drawer

## Step 7: Test Basic Functionality

### Test Cart Drawer
- [ ] Click cart button to open drawer
- [ ] Drawer slides in from right
- [ ] Empty state shows with message
- [ ] Close button works
- [ ] ESC key closes drawer
- [ ] Clicking overlay closes drawer

### Test Adding Items (Manual)
Open browser console and run:

```javascript
const store = window.__ZUSTAND__ || 
  await import('@/stores/cartStore').then(m => m.useCartStore);

await store.getState().addItem(
  {
    id: 'test-1',
    name: 'Test Product',
    slug: 'test-product',
    price: 29.99,
    imageUrl: 'https://via.placeholder.com/400'
  },
  {
    id: 'var-1',
    sku: 'TEST-001',
    color: 'Blue',
    size: 'M',
    stock: 10
  },
  1
);
```

- [ ] Item appears in cart drawer
- [ ] Image loads correctly
- [ ] Price displays correctly
- [ ] Quantity controls work
- [ ] Remove button works
- [ ] Totals calculate correctly

### Test Persistence
- [ ] Add items to cart
- [ ] Refresh page
- [ ] Items persist in cart
- [ ] Check localStorage (`cart-storage`)

## Step 8: Integrate with Product Pages

Add to your product page component:

```tsx
import ProductGallery from '@/components/shop/ProductGallery';
import VariantSelector from '@/components/shop/VariantSelector';
import { useCartStore } from '@/stores/cartStore';

export default function ProductPage({ product }) {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = async () => {
    const success = await addItem(product, selectedVariant, 1);
    if (success) openCart();
  };

  return (
    <>
      <ProductGallery images={product.images} productName={product.name} />
      <VariantSelector variants={product.variants} {...props} />
      <button onClick={handleAddToCart}>Add to Cart</button>
    </>
  );
}
```

- [ ] ProductGallery displays images
- [ ] Thumbnails clickable
- [ ] Fullscreen modal works
- [ ] VariantSelector shows colors
- [ ] Size buttons work
- [ ] Add to Cart adds item
- [ ] Cart drawer opens after adding

## Step 9: Test Mobile Responsiveness

### Desktop (>1024px)
- [ ] Cart drawer is 480px wide
- [ ] Thumbnails are vertical
- [ ] Hover zoom works on main image

### Tablet (768px - 1024px)
- [ ] Layout adjusts properly
- [ ] Touch interactions work

### Mobile (<768px)
- [ ] Cart drawer is full-width
- [ ] Thumbnails scroll horizontally
- [ ] Swipe gestures work in gallery
- [ ] Pinch to zoom works
- [ ] Double tap to zoom works

## Step 10: Backend Integration (Optional)

### Set up Authentication
- [ ] Implement `isUserLoggedIn()` in `cartStore.ts`
- [ ] Test logged-in vs guest behavior

### Set up Redis
- [ ] Install Redis client (`@upstash/redis`)
- [ ] Add environment variables
- [ ] Create `lib/redis.ts`
- [ ] Uncomment Redis code in API routes

### Set up Database
- [ ] Connect to your database
- [ ] Implement stock checking
- [ ] Implement product fetching

### Test Server Sync
- [ ] Login triggers sync
- [ ] Cart saves to Redis
- [ ] Cart loads from Redis
- [ ] Guest cart merges on login

## Step 11: Performance Check

- [ ] Run `npm run build`
- [ ] No build errors
- [ ] No TypeScript errors
- [ ] Bundle size acceptable
- [ ] Lighthouse score >90

## Step 12: Accessibility Check

- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Screen reader announces items
- [ ] ARIA labels present
- [ ] Keyboard shortcuts work

## Step 13: Cross-browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers

## Step 14: Final Checks

- [ ] All console errors resolved
- [ ] No hydration mismatches
- [ ] Images load properly
- [ ] Animations smooth
- [ ] No memory leaks
- [ ] LocalStorage working

## Customization Checklist

If you need to customize:

- [ ] Tax rate changed (if needed)
- [ ] Shipping settings adjusted (if needed)
- [ ] Colors customized (if needed)
- [ ] Currency format changed (if needed)
- [ ] Auth integration complete (if needed)

## Documentation Review

- [ ] Read `CART_README.md` - Overview and quick start
- [ ] Read `QUICK_REFERENCE.md` - Code snippets
- [ ] Skim `CART_SYSTEM_GUIDE.md` - Detailed guide
- [ ] Review `ARCHITECTURE.md` - System architecture

## Troubleshooting

If you encounter issues:

1. **Hydration Errors**
   - Check CartDrawer uses `mounted` state
   - Ensure CartProvider is client-side only

2. **TypeScript Errors**
   - Verify path aliases in `tsconfig.json`
   - Check all imports use `@/` prefix

3. **Styling Issues**
   - Verify Tailwind content paths
   - Check classes aren't being purged
   - Run `npm run dev` to rebuild

4. **Cart Not Persisting**
   - Check localStorage is enabled
   - Verify key is `cart-storage`
   - Check browser console for errors

5. **Stock Validation Failing**
   - Check API endpoint returns correct format
   - Verify endpoint path is correct
   - Check network tab for errors

## Success Criteria ✅

Your cart system is ready when:

- ✅ Cart drawer opens and closes smoothly
- ✅ Items can be added, updated, and removed
- ✅ Cart persists across page refreshes
- ✅ Totals calculate correctly
- ✅ Mobile experience is smooth
- ✅ No console errors
- ✅ All animations work
- ✅ Keyboard navigation works
- ✅ Product gallery functions fully
- ✅ Variant selector works correctly

## Next Steps

After installation:

1. **Customize styling** to match your brand
2. **Implement backend** API routes
3. **Add analytics** tracking
4. **Set up abandoned cart** emails
5. **Add promo code** support (if needed)
6. **Integrate with checkout** flow

## Need Help?

- Check `QUICK_REFERENCE.md` for code examples
- Read `CART_SYSTEM_GUIDE.md` for detailed explanations
- Review `ARCHITECTURE.md` for system design

---

**Congratulations! 🎉**

Your cart system is now fully integrated and ready for production use!











