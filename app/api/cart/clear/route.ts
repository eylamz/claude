import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth';
// import { redis } from '@/lib/redis';

export async function DELETE(_request: NextRequest) {
  try {
    // Get user session
    // const session = await getSession(request);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Clear cart in Redis
    // const userId = session.user.id;
    // const cartKey = `cart:${userId}`;
    // await redis.del(cartKey);

    return NextResponse.json(
      { 
        message: 'Cart cleared',
        success: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cart clear error:', error);
    return NextResponse.json(
      { message: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}











