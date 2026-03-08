import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import Product from '@/lib/models/Product';
import { getShopifyClient } from '@/lib/shopify/client';
import { getRateLimiter } from '@/lib/redis/session';
import { getRedisClient } from '@/lib/redis/client';
import type { CartItem } from '@/stores/cartStore';
import { validateCsrf } from '@/lib/security/csrf';

/**
 * Checkout Create API Route
 * 
 * POST /api/checkout/create
 * 
 * Validates cart items, creates Shopify checkout, and reserves inventory
 */

// Rate limiter: 10 requests per minute
const rateLimiter = getRateLimiter(60000, 10);

/**
 * Helper to get client IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Check rate limit
 */
async function checkRateLimit(identifier: string) {
  const result = await rateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        },
      }
    );
  }
  
  return null;
}

/**
 * Validate cart items against MongoDB stock
 */
async function validateCartItems(items: CartItem[]): Promise<{
  valid: boolean;
  errors: string[];
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    availableStock: number;
  }>;
}> {
  const errors: string[] = [];
  const validatedItems: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    availableStock: number;
  }> = [];

  for (const item of items) {
    try {
      // Find product
      const product = await Product.findById(item.productId);
      
      if (!product) {
        errors.push(`Product ${item.productName} (ID: ${item.productId}) not found`);
        continue;
      }

      // Check if product is active
      if (product.status !== 'active') {
        errors.push(`Product ${item.productName} is not available`);
        continue;
      }

      // Check stock for variant (color + size)
      const availableStock = product.checkStock(item.color, item.size);
      
      if (availableStock < item.quantity) {
        errors.push(
          `Insufficient stock for ${item.productName} (${item.color}, ${item.size}). Available: ${availableStock}, Requested: ${item.quantity}`
        );
        continue;
      }

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        availableStock,
      });
    } catch (error) {
      console.error(`Error validating item ${item.id}:`, error);
      errors.push(`Validation failed for ${item.productName}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    items: validatedItems,
  };
}

/**
 * Reserve inventory in Redis (5 minutes)
 */
async function reserveInventory(
  items: Array<{ productId: string; variantId: string; quantity: number; color: string; size: string }>,
  reservationId: string
): Promise<void> {
  const redis = getRedisClient();
  const reservationKey = `inventory:reservation:${reservationId}`;
  const expiration = 5 * 60; // 5 minutes

  const reservations = items.map(item => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    color: item.color,
    size: item.size,
  }));

  await redis.set(reservationKey, JSON.stringify(reservations), { ex: expiration });

  // Also store reservation IDs per item for cleanup
  for (const item of items) {
    const itemKey = `inventory:reserved:${item.productId}:${item.variantId}`;
    await redis.sadd(itemKey, reservationId);
    await redis.expire(itemKey, expiration);
  }
}

/**
 * Calculate final prices including discounts
 */
function calculateFinalPrices(items: CartItem[]): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => {
    const price = item.discountPrice || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const discount = items.reduce((sum, item) => {
    if (item.discountPrice && item.discountPrice < item.price) {
      return sum + ((item.price - item.discountPrice) * item.quantity);
    }
    return sum;
  }, 0);

  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;

  return { subtotal, discount, tax, total };
}

/**
 * Validate discount code
 */
async function validateDiscountCode(code: string): Promise<{
  valid: boolean;
  discount?: number;
  type?: 'percentage' | 'fixed' | 'shipping';
}> {
  // Simulate discount validation (replace with actual Shopify discount API call)
  const validCodes: Record<string, { type: 'percentage' | 'fixed' | 'shipping'; value: number }> = {
    'SAVE10': { type: 'percentage', value: 10 },
    'WELCOME20': { type: 'percentage', value: 20 },
    'FREESHIP': { type: 'shipping', value: 0 },
  };

  const discount = validCodes[code.toUpperCase()];
  
  if (!discount) {
    return { valid: false };
  }

  return {
    valid: true,
    discount: discount.value,
    type: discount.type,
  };
}

/**
 * POST /api/checkout/create
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIP(request);
    const rateLimitError = await checkRateLimit(identifier);
    if (rateLimitError) return rateLimitError;

    // CSRF protection for cookie-authenticated and guest checkouts
    const csrfResponse = validateCsrf(request);
    if (csrfResponse) {
      return csrfResponse;
    }

    // Authentication check (optional for guest checkout)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Parse request body
    const body = await request.json();
    const {
      items,
      customer,
      shippingAddress,
      discountCode,
      note,
      guest = false,
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Validate cart items against MongoDB stock
    const validation = await validateCartItems(items);
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Cart validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Calculate final prices
    const prices = calculateFinalPrices(items);

    // Validate discount code if provided
    let discountApplied = false;
    if (discountCode) {
      const discountValidation = await validateDiscountCode(discountCode);
      if (!discountValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid discount code' },
          { status: 400 }
        );
      }
      discountApplied = true;
    }

    // Reserve inventory for 5 minutes
    const reservationId = `reservation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await reserveInventory(
      items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
      })),
      reservationId
    );

    // Create Shopify checkout
    const shopify = getShopifyClient();
    
    try {
      const checkout = await shopify.createCheckout({
        lineItems: items.map(item => ({
          variantId: item.variantId, // Shopify variant ID (gid://shopify/ProductVariant/123456)
          quantity: item.quantity,
          customAttributes: [
            { key: 'Product Name', value: item.productName },
            { key: 'Color', value: item.color },
            { key: 'Size', value: item.size },
            { key: 'SKU', value: item.sku },
            { key: 'Reservation ID', value: reservationId },
          ],
        })),
        customer: customer || (session?.user ? {
          email: session.user.email || undefined,
          firstName: (session.user as any).firstName,
          lastName: (session.user as any).lastName,
        } : undefined),
        shippingAddress: shippingAddress,
        discountCodes: discountCode ? [discountCode.toUpperCase()] : undefined,
        note: note || `Reservation ID: ${reservationId}`,
        customAttributes: [
          { key: 'Reservation ID', value: reservationId },
          { key: 'User ID', value: userId || 'guest' },
          { key: 'Guest Checkout', value: guest.toString() },
        ],
      });

      // Store checkout ID with reservation for cleanup
      const redis = getRedisClient();
      await redis.set(
        `checkout:reservation:${reservationId}`,
        checkout.checkoutId,
        { ex: 5 * 60 }
      );

      return NextResponse.json({
        success: true,
        checkoutId: checkout.checkoutId,
        checkoutUrl: checkout.checkoutUrl,
        reservationId,
        prices: {
          ...prices,
          discountApplied,
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    } catch (shopifyError) {
      // Release inventory reservation on Shopify error
      const redis = getRedisClient();
      await redis.del(`inventory:reservation:${reservationId}`);
      
      console.error('Shopify checkout creation error:', shopifyError);

      return NextResponse.json(
        { error: 'Failed to create checkout' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}











