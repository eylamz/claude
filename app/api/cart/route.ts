import { NextRequest, NextResponse } from 'next/server';
import { getCartManager } from '@/lib/redis';
import { getRateLimiter } from '@/lib/redis';

/**
 * Cart API Routes
 * Handles GET (get cart), POST (add to cart), PATCH (update), DELETE (remove from cart)
 */

// Rate limiter: 20 requests per minute
const rateLimiter = getRateLimiter(60000, 20);

/**
 * Helper to get client IP
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Helper to check rate limit
 */
async function checkRateLimit(identifier: string) {
  const result = await rateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests',
        resetTime: result.resetTime,
        remaining: result.remaining
      },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
        }
      }
    );
  }
  
  return null;
}

/**
 * GET /api/cart - Get cart
 */
export async function GET(request: NextRequest) {
  try {
    const cartManager = getCartManager();
    const identifier = getClientIP(request);
    
    // Check rate limit
    const rateLimitError = await checkRateLimit(identifier);
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Either userId or sessionId is required' },
        { status: 400 }
      );
    }

    const cart = await cartManager.getCart(userId, sessionId);

    return NextResponse.json({
      cart: cart || null,
    });
  } catch (error) {
    console.error('Get cart error:', error);
    return NextResponse.json(
      { error: 'Failed to get cart' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart - Add item to cart
 */
export async function POST(request: NextRequest) {
  try {
    const cartManager = getCartManager();
    const identifier = getClientIP(request);
    
    // Check rate limit
    const rateLimitError = await checkRateLimit(identifier);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { userId, sessionId, item } = body;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Either userId or sessionId is required' },
        { status: 400 }
      );
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item is required' },
        { status: 400 }
      );
    }

    const cart = await cartManager.addToCart(item, userId, sessionId);

    return NextResponse.json({
      cart,
      message: 'Item added to cart',
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cart - Update quantity
 */
export async function PATCH(request: NextRequest) {
  try {
    const cartManager = getCartManager();
    const identifier = getClientIP(request);
    
    // Check rate limit
    const rateLimitError = await checkRateLimit(identifier);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { userId, sessionId, productId, quantity, options } = body;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Either userId or sessionId is required' },
        { status: 400 }
      );
    }

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      );
    }

    const cart = await cartManager.updateQuantity(
      productId,
      quantity,
      userId,
      sessionId,
      options
    );

    return NextResponse.json({
      cart,
      message: 'Quantity updated',
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    return NextResponse.json(
      { error: 'Failed to update quantity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart - Remove item or clear cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const cartManager = getCartManager();
    const identifier = getClientIP(request);
    
    // Check rate limit
    const rateLimitError = await checkRateLimit(identifier);
    if (rateLimitError) return rateLimitError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const sessionId = searchParams.get('sessionId') || undefined;
    const productId = searchParams.get('productId');

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Either userId or sessionId is required' },
        { status: 400 }
      );
    }

    if (productId) {
      // Remove specific item
      const body = await request.json().catch(() => ({}));
      const cart = await cartManager.removeFromCart(
        productId,
        userId,
        sessionId,
        body.options
      );

      return NextResponse.json({
        cart,
        message: 'Item removed',
      });
    } else {
      // Clear entire cart
      await cartManager.clearCart(userId, sessionId);

      return NextResponse.json({
        message: 'Cart cleared',
      });
    }
  } catch (error) {
    console.error('Delete cart error:', error);
    return NextResponse.json(
      { error: 'Failed to delete from cart' },
      { status: 500 }
    );
  }
}

