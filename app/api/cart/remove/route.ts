import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth';
// import { redis } from '@/lib/redis';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, variantId } = body;

    if (!itemId || !variantId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
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

    // Remove from Redis
    // const userId = session.user.id;
    // const cartKey = `cart:${userId}`;
    // const cart = await redis.get(cartKey) || { items: [] };
    
    // cart.items = cart.items.filter((item: any) => item.variantId !== variantId);
    // await redis.setex(cartKey, 30 * 24 * 60 * 60, JSON.stringify(cart));

    return NextResponse.json(
      { 
        message: 'Item removed from cart',
        success: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cart remove error:', error);
    return NextResponse.json(
      { message: 'Failed to remove item' },
      { status: 500 }
    );
  }
}







