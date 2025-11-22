# Cart System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Product    │  │   Product    │  │     Cart     │     │
│  │   Gallery    │  │   Variant    │  │    Drawer    │     │
│  │              │  │   Selector   │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │              ZUSTAND CART STORE                   │     │
│  │  ┌─────────────────────────────────────────────┐  │     │
│  │  │  State:                                     │  │     │
│  │  │  • items: CartItem[]                        │  │     │
│  │  │  • isOpen: boolean                          │  │     │
│  │  │  • isLoading: boolean                       │  │     │
│  │  │  • error: string | null                     │  │     │
│  │  └─────────────────────────────────────────────┘  │     │
│  │  ┌─────────────────────────────────────────────┐  │     │
│  │  │  Actions:                                   │  │     │
│  │  │  • addItem()                                │  │     │
│  │  │  • updateQuantity()                         │  │     │
│  │  │  • removeItem()                             │  │     │
│  │  │  • clearCart()                              │  │     │
│  │  │  • syncWithServer()                         │  │     │
│  │  │  • mergeGuestCart()                         │  │     │
│  │  └─────────────────────────────────────────────┘  │     │
│  └───────────────────────────────────────────────────┘     │
│                            │                                │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │localStorage│      │  Stock   │      │   Cart   │         │
│  │ Persistence│      │Validation│      │  Utils   │         │
│  └──────────┘      └──────────┘      └──────────┘         │
│                                                             │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cart Operations:          Product Operations:             │
│  ┌──────────────┐          ┌──────────────┐               │
│  │ /api/cart/   │          │ /api/products│               │
│  │   /add       │          │   /variants/ │               │
│  │   /update    │          │   [id]/stock │               │
│  │   /remove    │          └──────────────┘               │
│  │   /clear     │                                          │
│  │   /sync      │                                          │
│  │   /merge     │                                          │
│  └──────────────┘                                          │
│         │                           │                      │
└─────────┼───────────────────────────┼──────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐          ┌──────────────┐               │
│  │    Redis     │          │   Database   │               │
│  │              │          │              │               │
│  │ User Carts   │          │  Products    │               │
│  │ (Session)    │          │  Variants    │               │
│  │              │          │  Stock       │               │
│  └──────────────┘          └──────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### Adding Item to Cart

```
User Action
    │
    ▼
[ProductPage] Select variant & click "Add to Cart"
    │
    ▼
[CartStore] addItem(product, variant, quantity)
    │
    ├─► [Validation] Check quantity > 0
    │
    ├─► [API] GET /api/products/variants/[id]/stock
    │       │
    │       └─► Verify stock availability
    │
    ├─► [State Update] Optimistic update (instant UI)
    │       │
    │       └─► Add/Update item in state.items[]
    │
    ├─► [Persistence] Save to localStorage (guests)
    │
    ├─► [API] POST /api/cart/add (if logged in)
    │       │
    │       └─► Save to Redis
    │
    └─► [UI] Open CartDrawer with updated items
```

### Guest to User Cart Merge

```
Guest Shopping
    │
    ├─► Items stored in localStorage
    │
    ▼
User Logs In
    │
    ▼
[CartStore] mergeGuestCart(userId)
    │
    ├─► [Read] Get guest items from localStorage
    │
    ├─► [API] POST /api/cart/merge
    │       │
    │       ├─► Get user's existing cart from Redis
    │       │
    │       ├─► Merge Logic:
    │       │   • Same product+variant: keep higher quantity
    │       │   • Different items: add all to user cart
    │       │
    │       └─► Save merged cart to Redis
    │
    ├─► [State Update] Replace local state with merged cart
    │
    └─► [Cleanup] Clear localStorage guest cart
```

### Updating Quantity

```
User Action
    │
    ▼
[CartDrawer] Click +/- button
    │
    ▼
[CartStore] updateQuantity(itemId, newQuantity)
    │
    ├─► [Validation] Check 1 ≤ quantity ≤ maxStock
    │
    ├─► [API] GET /api/products/variants/[id]/stock
    │       │
    │       └─► Verify stock still available
    │
    ├─► [State Update] Optimistic update
    │       │
    │       └─► Update item.quantity
    │
    ├─► [UI Feedback] Show loading indicator on item
    │
    ├─► [API] PUT /api/cart/update (if logged in)
    │       │
    │       ├─► Update in Redis
    │       │
    │       └─► On error: Rollback optimistic update
    │
    └─► [UI] Update totals and remove loading indicator
```

## 🧩 Component Relationships

```
App Layout
    │
    ├─► CartProvider
    │       │
    │       ├─► Initializes cart store
    │       ├─► Syncs with server on mount
    │       └─► Provides CartDrawer
    │
    └─► Pages
            │
            ├─► Header
            │       └─► CartButton (opens CartDrawer)
            │
            └─► ProductPage
                    ├─► ProductGallery
                    │       └─► Displays images with zoom/carousel
                    │
                    ├─► VariantSelector
                    │       ├─► ColorSelector
                    │       └─► SizeSelector
                    │
                    └─► AddToCart Button
                            └─► Calls cartStore.addItem()

CartDrawer (Global, toggleable)
    │
    ├─► Header (title, count, close button)
    │
    ├─► Empty State (when items.length === 0)
    │       └─► Continue Shopping CTA
    │
    ├─► Items List (when items.length > 0)
    │       └─► CartItem × N
    │               ├─► Product Image
    │               ├─► Name & Variant Details
    │               ├─► Price Display
    │               ├─► Quantity Selector
    │               └─► Remove Button
    │
    └─► Footer
            ├─► Totals Breakdown
            ├─► Checkout Button
            └─► Continue Shopping Link
```

## 📦 State Structure

```typescript
CartStore
├── State
│   ├── items: [
│   │   {
│   │     id: "unique-id",
│   │     productId: "product-123",
│   │     productName: "Premium T-Shirt",
│   │     variantId: "variant-456",
│   │     color: "Blue",
│   │     size: "M",
│   │     price: 29.99,
│   │     discountPrice: 24.99,
│   │     quantity: 2,
│   │     maxStock: 15,
│   │     imageUrl: "/images/tshirt.jpg",
│   │     sku: "TSH-BLU-M",
│   │     addedAt: 1234567890
│   │   }
│   │ ]
│   ├── isOpen: false
│   ├── isLoading: false
│   ├── error: null
│   └── lastSyncedAt: 1234567890
│
└── Computed
    └── getTotals(): {
          subtotal: 49.98,
          discount: 10.00,
          tax: 3.20,
          shipping: 0.00,
          total: 43.18,
          itemCount: 2
        }
```

## 🎯 Integration Points

```
Authentication System
    │
    ├─► Login Event
    │       └─► Trigger mergeGuestCart()
    │
    └─► Logout Event
            └─► Clear user cart, keep as guest

Checkout System
    │
    └─► Use cartStore.items for order creation

Inventory System
    │
    ├─► Real-time stock checks before add/update
    └─► Update maxStock when stock changes

Analytics
    │
    ├─► Track addItem events
    ├─► Track removeItem events
    └─► Track abandoned carts

Email System
    │
    └─► Send abandoned cart reminders
```

## 🚀 Performance Optimizations

1. **Optimistic Updates**
   - Instant UI response
   - Rollback on server error

2. **Selective Re-renders**
   - Zustand selectors (useCartItems, useCartTotals)
   - Only affected components re-render

3. **Lazy Loading**
   - CartDrawer only renders when needed
   - Images load progressively

4. **Debouncing**
   - Quantity updates debounced
   - Prevents excessive API calls

5. **Caching**
   - localStorage for guests
   - Redis for logged users
   - Reduces database queries

## 🔒 Security Considerations

```
Client-Side (cartStore.ts)
    │
    ├─► Input validation
    ├─► Stock checks
    └─► Optimistic updates (UX only)

API Layer (app/api/cart/*)
    │
    ├─► Authentication checks
    ├─► Authorization (user owns cart)
    ├─► Rate limiting
    ├─► Input sanitization
    └─► Server-side stock validation

Database
    │
    ├─► Stock locking during checkout
    └─► Transaction isolation
```

## 📈 Scalability

- **Horizontal Scaling**: Stateless API, Redis for state
- **Caching**: Redis reduces database load
- **CDN**: Static assets (images) via CDN
- **Database**: Read replicas for product/stock data
- **Queue**: Background job for abandoned cart emails

---

**Architecture Benefits:**
- ✅ Separation of concerns
- ✅ Testable components
- ✅ Easy to extend
- ✅ Performance optimized
- ✅ Mobile-friendly
- ✅ Production-ready











