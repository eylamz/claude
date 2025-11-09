import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Localized field interface
 */
export interface ILocalizedField {
  en: string;
  he: string;
}

/**
 * Product image interface
 */
export interface IProductImage {
  url: string;
  alt: ILocalizedField;
  order: number;
  publicId: string;
}

/**
 * Color variant interface
 */
export interface IColorVariant {
  name: ILocalizedField;
  hex: string;
}

/**
 * Size variant interface
 */
export interface ISizeVariant {
  size: string;
  stock: number;
  sku: string;
}

/**
 * Product variant interface
 */
export interface IProductVariant {
  color: IColorVariant;
  sizes: ISizeVariant[];
}

/**
 * Product metadata interface
 */
export interface IProductMetadata {
  title: ILocalizedField;
  description: ILocalizedField;
}

/**
 * Product status type
 */
export type ProductStatus = 'active' | 'inactive' | 'draft';

/**
 * Product interface extending Mongoose Document
 */
export interface IProduct extends Document {
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

  // Instance methods
  getAvailableSizes(colorHex: string): string[];
  checkStock(colorHex: string, size: string): number;
  updateStock(colorHex: string, size: string, quantity: number): void;
  getCurrentPrice(): number;
}

/**
 * Product Model interface with static methods
 */
export interface IProductModel extends Model<IProduct> {
  findBySlug(slug: string): Promise<IProduct | null>;
  findActive(): Promise<IProduct[]>;
  findFeatured(): Promise<IProduct[]>;
  searchProducts(query: string): Promise<IProduct[]>;
}

/**
 * Product schema definition
 */
const ProductSchema: Schema<IProduct> = new Schema<IProduct>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    name: {
      en: {
        type: String,
        required: [true, 'English name is required'],
        trim: true,
        maxlength: [200, 'English name cannot exceed 200 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew name is required'],
        trim: true,
        maxlength: [200, 'Hebrew name cannot exceed 200 characters'],
      },
    },
    description: {
      en: {
        type: String,
        required: [true, 'English description is required'],
        trim: true,
        maxlength: [5000, 'English description cannot exceed 5000 characters'],
      },
      he: {
        type: String,
        required: [true, 'Hebrew description is required'],
        trim: true,
        maxlength: [5000, 'Hebrew description cannot exceed 5000 characters'],
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (this: IProduct, value: number | undefined) {
          return !value || value < this.price;
        },
        message: 'Discount price must be less than regular price',
      },
    },
    discountStartDate: {
      type: Date,
      validate: {
        validator: function (this: IProduct, value: Date | undefined) {
          if (!value) return true;
          if (this.discountEndDate && value > this.discountEndDate) {
            return false;
          }
          return true;
        },
        message: 'Discount start date must be before end date',
      },
    },
    discountEndDate: {
      type: Date,
      validate: {
        validator: function (this: IProduct, value: Date | undefined) {
          if (!value) return true;
          if (this.discountStartDate && value < this.discountStartDate) {
            return false;
          }
          return true;
        },
        message: 'Discount end date must be after start date',
      },
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    relatedSports: [
      {
        type: String,
        trim: true,
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: [true, 'Image URL is required'],
          trim: true,
        },
        alt: {
          en: {
            type: String,
            required: true,
            trim: true,
          },
          he: {
            type: String,
            required: true,
            trim: true,
          },
        },
        order: {
          type: Number,
          default: 0,
        },
        publicId: {
          type: String,
          required: [true, 'Public ID is required'],
          trim: true,
        },
      },
    ],
    variants: [
      {
        color: {
          name: {
            en: {
              type: String,
              required: true,
              trim: true,
            },
            he: {
              type: String,
              required: true,
              trim: true,
            },
          },
          hex: {
            type: String,
            required: [true, 'Color hex is required'],
            trim: true,
            match: [/^#[0-9A-Fa-f]{6}$/, 'Color hex must be a valid hex color code'],
          },
        },
        sizes: [
          {
            size: {
              type: String,
              required: [true, 'Size is required'],
              trim: true,
            },
            stock: {
              type: Number,
              required: [true, 'Stock is required'],
              min: [0, 'Stock cannot be negative'],
            },
            sku: {
              type: String,
              required: [true, 'SKU is required'],
              trim: true,
              uppercase: true,
            },
          },
        ],
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPreorder: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'draft',
    },
    metadata: {
      title: {
        en: {
          type: String,
          trim: true,
          maxlength: [200, 'SEO title cannot exceed 200 characters'],
        },
        he: {
          type: String,
          trim: true,
          maxlength: [200, 'SEO title cannot exceed 200 characters'],
        },
      },
      description: {
        en: {
          type: String,
          trim: true,
          maxlength: [500, 'SEO description cannot exceed 500 characters'],
        },
        he: {
          type: String,
          trim: true,
          maxlength: [500, 'SEO description cannot exceed 500 characters'],
        },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes for performance
 */
// Note: slug doesn't have unique: true in field definition, so we need the unique index here
ProductSchema.index({ slug: 1 }, { unique: true });

// Compound index for category and relatedSports
// Note: category already has index: true, but compound index is different and needed
ProductSchema.index({ category: 1, relatedSports: 1 });

// Index for featured products
// Note: isFeatured already has index: true, but compound index is different and needed
ProductSchema.index({ isFeatured: 1, status: 1 });

// Text index for search
ProductSchema.index({
  'name.en': 'text',
  'name.he': 'text',
  'description.en': 'text',
  'description.he': 'text',
  category: 'text',
  subcategory: 'text',
});

/**
 * Instance method: Get available sizes for a specific color
 */
ProductSchema.methods.getAvailableSizes = function (colorHex: string): string[] {
  const variant = this.variants.find((v: IProductVariant) => v.color.hex === colorHex);
  if (!variant) return [];

  return variant.sizes
    .filter((size: ISizeVariant) => size.stock > 0)
    .map((size: ISizeVariant) => size.size);
};

/**
 * Instance method: Check stock for a specific color and size
 */
ProductSchema.methods.checkStock = function (colorHex: string, size: string): number {
  const variant = this.variants.find((v: IProductVariant) => v.color.hex === colorHex);
  if (!variant) return 0;

  const sizeVariant = variant.sizes.find((s: ISizeVariant) => s.size === size);
  return sizeVariant ? sizeVariant.stock : 0;
};

/**
 * Instance method: Update stock for a specific color and size
 */
ProductSchema.methods.updateStock = function (
  colorHex: string,
  size: string,
  quantity: number
): void {
  const variant = this.variants.find((v: IProductVariant) => v.color.hex === colorHex);
  if (!variant) {
    throw new Error(`Color variant with hex ${colorHex} not found`);
  }

  const sizeVariant = variant.sizes.find((s: ISizeVariant) => s.size === size);
  if (!sizeVariant) {
    throw new Error(`Size ${size} not found for color ${colorHex}`);
  }

  const newStock = sizeVariant.stock + quantity;
  if (newStock < 0) {
    throw new Error('Stock cannot be negative');
  }

  sizeVariant.stock = newStock;
};

/**
 * Instance method: Get current price (considering discounts)
 */
ProductSchema.methods.getCurrentPrice = function (): number {
  const now = new Date();

  // Check if discount is active
  if (
    this.discountPrice &&
    (!this.discountStartDate || now >= this.discountStartDate) &&
    (!this.discountEndDate || now <= this.discountEndDate)
  ) {
    return this.discountPrice;
  }

  return this.price;
};

/**
 * Static method: Find product by slug
 */
ProductSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Static method: Find active products
 */
ProductSchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

/**
 * Static method: Find featured products
 */
ProductSchema.statics.findFeatured = function () {
  return this.find({ isFeatured: true, status: 'active' });
};

/**
 * Static method: Search products by text
 */
ProductSchema.statics.searchProducts = function (query: string) {
  return this.find({ $text: { $search: query }, status: 'active' })
    .sort({ score: { $meta: 'textScore' } });
};

/**
 * Pre-save middleware: Sort images by order
 */
ProductSchema.pre('save', function (next) {
  if (this.isModified('images') && this.images.length > 0) {
    this.images.sort((a, b) => a.order - b.order);
  }
  next();
});

/**
 * Pre-save middleware: Ensure at least one variant
 */
ProductSchema.pre('save', function (next) {
  if (this.variants.length === 0) {
    throw new Error('Product must have at least one variant');
  }
  next();
});

/**
 * Virtual: Get primary image
 */
ProductSchema.virtual('primaryImage').get(function (this: IProduct): IProductImage | undefined {
  return this.images.length > 0 ? this.images[0] : undefined;
});

/**
 * Virtual: Check if product is on sale
 */
ProductSchema.virtual('isOnSale').get(function (this: IProduct): boolean {
  const now = new Date();
  return !!(
    this.discountPrice &&
    (!this.discountStartDate || now >= this.discountStartDate) &&
    (!this.discountEndDate || now <= this.discountEndDate)
  );
});

/**
 * Virtual: Get total stock
 */
ProductSchema.virtual('totalStock').get(function (this: IProduct): number {
  return this.variants.reduce(
    (total, variant) => total + variant.sizes.reduce((sum, size) => sum + size.stock, 0),
    0
  );
});

/**
 * Virtual: Get available colors
 */
ProductSchema.virtual('availableColors').get(function (this: IProduct): IColorVariant[] {
  return this.variants.map((variant) => ({
    name: variant.color.name,
    hex: variant.color.hex,
  }));
});

/**
 * Create and export the Product model
 */
const Product: IProductModel =
  (mongoose.models.Product as IProductModel) ||
  mongoose.model<IProduct, IProductModel>('Product', ProductSchema);

export default Product;

