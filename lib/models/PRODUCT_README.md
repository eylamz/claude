# Product Model

## Overview

The `Product` model provides a comprehensive e-commerce product management system with support for complex variant systems (colors and sizes), multilingual content, discounts, and stock management.

## File Structure

```
lib/models/
├── Product.ts      # Product model with variant system
└── index.ts        # Model exports
```

## Product Schema

### Fields

#### Basic Information
- **slug** (String, unique, required)
  - Auto-converted to lowercase
  - Alphanumeric and hyphens only
  - Unique index for performance
  - Used for SEO-friendly URLs

- **name** (Localized, required)
  - English name (required)
  - Hebrew name (required)
  - Maximum 200 characters each

- **description** (Localized, required)
  - English description (required)
  - Hebrew description (required)
  - Maximum 5000 characters each

#### Pricing
- **price** (Number, required)
  - Minimum 0
  - Base product price

- **discountPrice** (Number, optional)
  - Must be less than regular price
  - Used when product is on sale

- **discountStartDate** (Date, optional)
  - Start date for discount period
  - Must be before end date

- **discountEndDate** (Date, optional)
  - End date for discount period
  - Must be after start date

#### Categorization
- **category** (String, required)
  - Primary product category
  - Indexed for performance

- **subcategory** (String, optional)
  - Secondary categorization

- **relatedSports** (Array of Strings)
  - Sports or activities related to the product
  - Used in compound index with category

#### Images
```typescript
interface IProductImage {
  url: string;
  alt: {
    en: string;
    he: string;
  };
  order: number;
  publicId: string;
}
```
- Array of product images
- Sorted by order field
- Supports alt text in multiple languages
- Includes publicId for cloud storage management

#### Variants
```typescript
interface IProductVariant {
  color: {
    name: {
      en: string;
      he: string;
    };
    hex: string; // Valid hex color code
  };
  sizes: Array<{
    size: string;
    stock: number;
    sku: string; // Auto-uppercased
  }>;
}
```
- Array of color variants
- Each color can have multiple sizes
- Stock tracking per size
- SKU per size variant

#### Status & Features
- **isFeatured** (Boolean, default: false)
  - Featured products
  - Indexed for performance

- **isPreorder** (Boolean, default: false)
  - Pre-order availability

- **status** (Enum, default: 'draft')
  - Values: `'active'`, `'inactive'`, `'draft'`
  - Indexed for performance

#### SEO Metadata
```typescript
interface IProductMetadata {
  title: {
    en?: string;
    he?: string;
  };
  description: {
    en?: string;
    he?: string;
  };
}
```
- Optional SEO titles
- Optional SEO descriptions
- Maximum 200 chars for titles
- Maximum 500 chars for descriptions

#### Timestamps
- **createdAt** (Date, auto-generated)
- **updatedAt** (Date, auto-generated)

## Indexes

### Single Field Indexes
```typescript
// Slug index (unique)
{ slug: 1 }

// Category index
{ category: 1 }

// Featured products index
{ isFeatured: 1, status: 1 }

// Status index
{ status: 1 }
```

### Compound Indexes
```typescript
// Category + Related Sports
{ category: 1, relatedSports: 1 }
```

### Text Indexes
Full-text search across:
- English name
- Hebrew name
- English description
- Hebrew description
- Category
- Subcategory

## Instance Methods

### `getAvailableSizes(colorHex: string): string[]`

Get all available sizes for a specific color.

**Example:**
```typescript
const product = await Product.findById(productId);
const availableSizes = product.getAvailableSizes('#FF0000');
// Returns: ['S', 'M', 'L']
```

### `checkStock(colorHex: string, size: string): number`

Check available stock for a specific color and size.

**Example:**
```typescript
const product = await Product.findById(productId);
const stock = product.checkStock('#FF0000', 'M');
// Returns: 15
```

### `updateStock(colorHex: string, size: string, quantity: number): void`

Update stock for a specific color and size.

**Example:**
```typescript
const product = await Product.findById(productId);
// Add 10 units
product.updateStock('#FF0000', 'M', 10);

// Remove 5 units
product.updateStock('#FF0000', 'M', -5);

await product.save();
```

**Note:** Throws error if stock would become negative.

### `getCurrentPrice(): number`

Get the current effective price (considering active discounts).

**Example:**
```typescript
const product = await Product.findById(productId);
const currentPrice = product.getCurrentPrice();
// Returns discountPrice if on sale, otherwise returns price
```

## Static Methods

### `findBySlug(slug: string): Promise<IProduct | null>`

Find a product by its slug.

**Example:**
```typescript
const product = await Product.findBySlug('nike-air-max-90');
```

### `findActive(): Promise<IProduct[]>`

Find all active products.

**Example:**
```typescript
const products = await Product.findActive();
```

### `findFeatured(): Promise<IProduct[]>`

Find all featured active products.

**Example:**
```typescript
const products = await Product.findFeatured();
```

### `searchProducts(query: string): Promise<IProduct[]>`

Search products by text query.

**Example:**
```typescript
const products = await Product.searchProducts('basketball shoes');
```

## Virtual Properties

### `primaryImage: IProductImage | undefined`

Get the primary (first) product image.

```typescript
const product = await Product.findById(productId);
const primaryImage = product.primaryImage;
```

### `isOnSale: boolean`

Check if product is currently on sale.

```typescript
const product = await Product.findById(productId);
if (product.isOnSale) {
  // Display sale badge
}
```

### `totalStock: number`

Get total stock across all variants and sizes.

```typescript
const product = await Product.findById(productId);
const totalStock = product.totalStock;
```

### `availableColors: IColorVariant[]`

Get all available colors for the product.

```typescript
const product = await Product.findById(productId);
const colors = product.availableColors;
```

## Usage Examples

### Create a Product

```typescript
import Product from '@/lib/models/Product';

const product = new Product({
  slug: 'nike-air-max-90',
  name: {
    en: 'Nike Air Max 90',
    he: 'נייקי אייר מקס 90',
  },
  description: {
    en: 'Classic Nike Air Max 90 running shoes...',
    he: 'נעלי ריצה קלאסיות Nike Air Max 90...',
  },
  price: 120,
  category: 'footwear',
  subcategory: 'running-shoes',
  relatedSports: ['running', 'athletics'],
  images: [
    {
      url: 'https://example.com/image1.jpg',
      alt: { en: 'Front view', he: 'נוף קדמי' },
      order: 0,
      publicId: 'products/nike-90-1',
    },
    {
      url: 'https://example.com/image2.jpg',
      alt: { en: 'Side view', he: 'נוף צדדי' },
      order: 1,
      publicId: 'products/nike-90-2',
    },
  ],
  variants: [
    {
      color: {
        name: { en: 'Red', he: 'אדום' },
        hex: '#FF0000',
      },
      sizes: [
        { size: 'S', stock: 10, sku: 'NIKE-90-RED-S' },
        { size: 'M', stock: 15, sku: 'NIKE-90-RED-M' },
        { size: 'L', stock: 8, sku: 'NIKE-90-RED-L' },
      ],
    },
    {
      color: {
        name: { en: 'Blue', he: 'כחול' },
        hex: '#0000FF',
      },
      sizes: [
        { size: 'S', stock: 5, sku: 'NIKE-90-BLUE-S' },
        { size: 'M', stock: 12, sku: 'NIKE-90-BLUE-M' },
        { size: 'L', stock: 3, sku: 'NIKE-90-BLUE-L' },
      ],
    },
  ],
  isFeatured: true,
  status: 'active',
  metadata: {
    title: {
      en: 'Nike Air Max 90 - Premium Running Shoes',
      he: 'נייקי אייר מקס 90 - נעלי ריצה פרימיום',
    },
    description: {
      en: 'Shop the classic Nike Air Max 90...',
      he: 'קנה את נייקי אייר מקס 90 הקלאסי...',
    },
  },
});

await product.save();
```

### Apply Discount

```typescript
const product = await Product.findById(productId);
if (product) {
  product.discountPrice = 90;
  product.discountStartDate = new Date('2024-01-01');
  product.discountEndDate = new Date('2024-01-31');
  await product.save();
}
```

### Check Stock and Update

```typescript
const product = await Product.findBySlug('nike-air-max-90');

// Check stock
const stock = product.checkStock('#FF0000', 'M');
console.log(`Available stock: ${stock}`);

// Update stock (after sale)
product.updateStock('#FF0000', 'M', -1);
await product.save();
```

### Get Available Sizes

```typescript
const product = await Product.findBySlug('nike-air-max-90');
const availableSizes = product.getAvailableSizes('#FF0000');
console.log(`Available sizes: ${availableSizes.join(', ')}`);
```

### Search Products

```typescript
// Search for products
const products = await Product.searchProducts('running shoes');

// Find featured products
const featured = await Product.findFeatured();

// Find by category
const products = await Product.find({ category: 'footwear', status: 'active' });
```

### Apply Multiple Filters

```typescript
const products = await Product.find({
  category: 'footwear',
  relatedSports: { $in: ['running'] },
  status: 'active',
  isFeatured: true,
}).sort({ createdAt: -1 });
```

## TypeScript Interfaces

### Localized Field
```typescript
interface ILocalizedField {
  en: string;
  he: string;
}
```

### Product Image
```typescript
interface IProductImage {
  url: string;
  alt: ILocalizedField;
  order: number;
  publicId: string;
}
```

### Color Variant
```typescript
interface IColorVariant {
  name: ILocalizedField;
  hex: string;
}
```

### Size Variant
```typescript
interface ISizeVariant {
  size: string;
  stock: number;
  sku: string;
}
```

### Product Variant
```typescript
interface IProductVariant {
  color: IColorVariant;
  sizes: ISizeVariant[];
}
```

### Product Metadata
```typescript
interface IProductMetadata {
  title: ILocalizedField;
  description: ILocalizedField;
}
```

### Product Interface
```typescript
interface IProduct extends Document {
  slug: string;
  name: ILocalizedField;
  description: ILocalizedField;
  price: number;
  discountPrice?: number;
  discountStartDate?: Date;
  discountEndDate?: Date;
  category: string;
  subcategory: string;
  relatedSports: string[];
  images: IProductImage[];
  variants: IProductVariant[];
  isFeatured: boolean;
  isPreorder: boolean;
  status: ProductStatus;
  metadata: IProductMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getAvailableSizes(colorHex: string): string[];
  checkStock(colorHex: string, size: string): number;
  updateStock(colorHex: string, size: string, quantity: number): void;
  getCurrentPrice(): number;
}
```

### Product Status Type
```typescript
type ProductStatus = 'active' | 'inactive' | 'draft';
```

## Validation

### Slug Validation
- Must be lowercase
- Can contain only letters, numbers, and hyphens
- Must be unique

### Color Hex Validation
- Must be a valid hex color code
- Format: `#RRGGBB`

### Discount Price Validation
- Must be less than regular price
- Cannot be negative

### Date Validation
- Start date must be before end date
- Both dates are optional

### Stock Validation
- Cannot be negative
- Validate before allowing purchases

## Middleware

### Pre-save: Sort Images
Images are automatically sorted by order field before saving.

### Pre-save: Validate Variants
Product must have at least one variant.

## Best Practices

### 1. Always Check Stock Before Purchase
```typescript
const stock = product.checkStock(colorHex, size);
if (stock < quantity) {
  throw new Error('Insufficient stock');
}
```

### 2. Use Atomic Updates for Stock
```typescript
// Good: Use method
product.updateStock(colorHex, size, -1);
await product.save();

// Better: Use atomic update
await Product.updateOne(
  { _id: productId, 'variants.color.hex': colorHex, 'variants.sizes.size': size },
  { $inc: { 'variants.$[].sizes.$[sizeVariant].stock': -1 } },
  { arrayFilters: [{ 'sizeVariant.size': size }] }
);
```

### 3. Validate Discount Dates
```typescript
const now = new Date();
const isActive = (!product.discountStartDate || now >= product.discountStartDate) &&
                 (!product.discountEndDate || now <= product.discountEndDate);
```

### 4. Use Slug for URLs
```typescript
const product = await Product.findBySlug('nike-air-max-90');
// URL: /products/nike-air-max-90
```

### 5. Leverage Indexes
```typescript
// Good: Uses indexes
const products = await Product.find({ category: 'footwear', status: 'active' });

// Good: Uses compound index
const products = await Product.find({ category: 'footwear', relatedSports: 'running' });
```

## Related Files

- `lib/db/mongodb.ts` - Database connection utility
- `lib/models/User.ts` - User model with wishlist references
- `lib/models/index.ts` - Model exports

## Query Performance Tips

### 1. Use Projection
```typescript
const products = await Product.find({ status: 'active' })
  .select('name price variants slug');
```

### 2. Limit Results
```typescript
const products = await Product.find({ status: 'active' })
  .limit(20)
  .skip(page * 20);
```

### 3. Use Lean for Read Operations
```typescript
const products = await Product.find({ status: 'active' })
  .lean(); // Returns plain objects, faster but no methods
```

### 4. Sort by Indexed Fields
```typescript
const products = await Product.find({ status: 'active' })
  .sort({ createdAt: -1 }); // Uses index
```

## Migration Notes

When migrating from an existing database:

1. **Generate Slugs**
   ```typescript
   const products = await Product.find({ slug: { $exists: false } });
   for (const product of products) {
     product.slug = product.name.en.toLowerCase().replace(/\s+/g, '-');
     await product.save();
   }
   ```

2. **Create Indexes**
   ```typescript
   await Product.createIndexes();
   ```

3. **Add Default Values**
   ```typescript
   await Product.updateMany(
     { status: { $exists: false } },
     { $set: { status: 'draft' } }
   );
   ```

## Testing Example

```typescript
import Product from '@/lib/models/Product';
import { connectDB, disconnectDB } from '@/lib/db/mongodb';

describe('Product Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('should create a product with variants', async () => {
    const product = new Product({
      slug: 'test-product',
      name: { en: 'Test Product', he: 'מוצר בדיקה' },
      description: { en: 'Test', he: 'בדיקה' },
      price: 100,
      category: 'test',
      variants: [
        {
          color: { name: { en: 'Red', he: 'אדום' }, hex: '#FF0000' },
          sizes: [{ size: 'M', stock: 10, sku: 'TEST-M' }],
        },
      ],
    });
    
    await product.save();
    expect(product.slug).toBe('test-product');
  });

  it('should calculate current price correctly', async () => {
    const now = new Date();
    const product = new Product({
      slug: 'discount-product',
      name: { en: 'Discount Product', he: 'מוצר בהנחה' },
      description: { en: 'Test', he: 'בדיקה' },
      price: 100,
      discountPrice: 80,
      discountStartDate: now,
      discountEndDate: new Date(now.getTime() + 3600000),
      category: 'test',
      variants: [
        {
          color: { name: { en: 'Red', he: 'אדום' }, hex: '#FF0000' },
          sizes: [{ size: 'M', stock: 10, sku: 'DISCOUNT-M' }],
        },
      ],
    });
    
    await product.save();
    expect(product.getCurrentPrice()).toBe(80);
  });

  it('should update stock correctly', async () => {
    const product = await Product.findOne({ slug: 'discount-product' });
    const initialStock = product.checkStock('#FF0000', 'M');
    
    product.updateStock('#FF0000', 'M', -1);
    await product.save();
    
    expect(product.checkStock('#FF0000', 'M')).toBe(initialStock - 1);
  });
});
```

