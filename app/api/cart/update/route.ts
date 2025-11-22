import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth';
// import { redis } from '@/lib/redis';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, variantId, quantity } = body;

    if (!itemId || !variantId || quantity === undefined) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { message: 'Quantity must be at least 1' },
        { status: 400 }
      );
    }

    // Get user session
    // const session = await getSession(request);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Update in Redis
    // const userId = session.user.id;
    // const cartKey = `cart:${userId}`;
    // const cart = await redis.get(cartKey) || { items: [] };
    
    // const itemIndex = cart.items.findIndex((item: any) => item.variantId === variantId);
    // if (itemIndex >= 0) {
    //   cart.items[itemIndex].quantity = quantity;
    //   await redis.setex(cartKey, 30 * 24 * 60 * 60, JSON.stringify(cart));
    // }

    return NextResponse.json(
      { 
        message: 'Cart updated',
        success: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cart update error:', error);
    return NextResponse.json(
      { message: 'Failed to update cart' },
      { status: 500 }
    );
  }
}











