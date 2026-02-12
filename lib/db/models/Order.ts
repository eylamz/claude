import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Order status type
 */
export type OrderStatus = 
  | 'pending' 
  | 'paid' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

/**
 * Customer information interface
 */
export interface ICustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Address interface
 */
export interface IAddress {
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
}

/**
 * Order item interface
 */
export interface IOrderItem {
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
  imageUrl: string;
  subtotal: number;
}

/**
 * Tracking information interface
 */
export interface ITracking {
  number: string;
  carrier: string;
  url?: string;
  addedAt: Date;
}

/**
 * Order interface extending Mongoose Document
 */
export interface IOrder extends Document {
  orderNumber: string;
  userId?: string;
  customerInfo: ICustomerInfo;
  items: IOrderItem[];
  shippingAddress: IAddress;
  billingAddress?: IAddress;
  paymentMethod: string;
  shopifyOrderId?: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  trackingNumber?: string;
  tracking?: ITracking;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  generateOrderNumber(): Promise<string>;
  updateStatus(status: OrderStatus): Promise<void>;
  addTracking(number: string, carrier: string, url?: string): Promise<void>;
}

/**
 * Order Model interface with static methods
 */
export interface IOrderModel extends Model<IOrder> {
  findByOrderNumber(orderNumber: string): Promise<IOrder | null>;
  findByUserId(userId: string): Promise<IOrder[]>;
  findByStatus(status: OrderStatus): Promise<IOrder[]>;
}

/**
 * Order schema definition
 */
const OrderSchema: Schema<IOrder> = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      
      uppercase: true,
      trim: true,
    },
    userId: {
      type: String,
      sparse: true, // Allow null but index non-null values
    },
    customerInfo: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
      },
      phone: {
        type: String,
        required: [true, 'Phone is required'],
        trim: true,
      },
    },
    items: [
      {
        productId: {
          type: String,
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        productSlug: {
          type: String,
          required: true,
        },
        variantId: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
          required: true,
          uppercase: true,
        },
        color: {
          type: String,
          required: true,
        },
        size: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        discountPrice: {
          type: Number,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        imageUrl: {
          type: String,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    shippingAddress: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      address1: {
        type: String,
        required: [true, 'Shipping address is required'],
        trim: true,
      },
      address2: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      province: {
        type: String,
        required: [true, 'State/Province is required'],
        trim: true,
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
      },
      zip: {
        type: String,
        required: [true, 'Zip/Postal code is required'],
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    billingAddress: {
      firstName: {
        type: String,
        trim: true,
      },
      lastName: {
        type: String,
        trim: true,
      },
      address1: {
        type: String,
        trim: true,
      },
      address2: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      province: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      zip: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      trim: true,
    },
    shopifyOrderId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
      required: true,
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0,
    },
    shipping: {
      type: Number,
      required: [true, 'Shipping is required'],
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: [true, 'Tax is required'],
      min: 0,
      default: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: 0,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    tracking: {
      number: {
        type: String,
        trim: true,
      },
      carrier: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      },
      addedAt: {
        type: Date,
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20240115-A1B2C)
 */
OrderSchema.methods.generateOrderNumber = async function (): Promise<string> {
  if (this.orderNumber) {
    return this.orderNumber;
  }

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5 char random
  
  let orderNumber = `ORD-${dateStr}-${randomStr}`;
  let attempts = 0;
  const maxAttempts = 10;

  // Check for uniqueness
  while (attempts < maxAttempts) {
    const existing = await mongoose.model<IOrder>('Order').findOne({ orderNumber });
    if (!existing) {
      this.orderNumber = orderNumber;
      return orderNumber;
    }
    // Regenerate if exists
    const newRandomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    orderNumber = `ORD-${dateStr}-${newRandomStr}`;
    attempts++;
  }

  // Fallback: use timestamp if all attempts fail
  orderNumber = `ORD-${dateStr}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  this.orderNumber = orderNumber;
  return orderNumber;
};

/**
 * Update order status
 */
OrderSchema.methods.updateStatus = async function (status: OrderStatus): Promise<void> {
  this.status = status;
  
  // Update tracking if shipping
  if (status === 'shipped' && !this.tracking) {
    // Auto-generate tracking if not set
    if (this.trackingNumber) {
      this.addTracking(this.trackingNumber, 'Standard Shipping');
    }
  }

  await this.save();
};

/**
 * Add tracking information
 */
OrderSchema.methods.addTracking = async function (
  number: string,
  carrier: string,
  url?: string
): Promise<void> {
  this.trackingNumber = number;
  this.tracking = {
    number,
    carrier,
    url,
    addedAt: new Date(),
  };

  // Auto-update status to shipped if not already shipped/delivered
  if (this.status !== 'shipped' && this.status !== 'delivered') {
    this.status = 'shipped';
  }

  await this.save();
};

/**
 * Static method: Find order by order number
 */
OrderSchema.statics.findByOrderNumber = function (orderNumber: string) {
  return this.findOne({ orderNumber: orderNumber.toUpperCase() });
};

/**
 * Static method: Find orders by user ID
 */
OrderSchema.statics.findByUserId = function (userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Static method: Find orders by status
 */
OrderSchema.statics.findByStatus = function (status: OrderStatus) {
  return this.find({ status }).sort({ createdAt: -1 });
};

/**
 * Pre-save middleware: Generate order number if not set
 */
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    await this.generateOrderNumber();
  }
  
  // Ensure total is calculated correctly
  if (this.isModified('subtotal') || this.isModified('shipping') || this.isModified('tax') || this.isModified('discount')) {
    this.total = this.subtotal - (this.discount || 0) + this.shipping + this.tax;
  }

  // Ensure billing address matches shipping if not provided
  if (!this.billingAddress || !this.billingAddress.address1) {
    this.billingAddress = {
      ...this.shippingAddress,
    };
  }

  next();
});

/**
 * Indexes
 */
OrderSchema.index({ orderNumber: 1 }, { unique: true });
// userId: compound index below covers userId-only queries (left-prefix rule)
// Removed standalone userId index to avoid duplicate with userId sparse/index
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ shopifyOrderId: 1 }, { sparse: true, unique: true });
OrderSchema.index({ 'customerInfo.email': 1 });

/**
 * Compound indexes
 */
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });

/**
 * Create and export Order model
 */
const Order = (mongoose.models.Order || mongoose.model<IOrder, IOrderModel>('Order', OrderSchema)) as IOrderModel;

export default Order;

