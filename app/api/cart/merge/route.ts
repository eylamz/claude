import { NextRequest, NextResponse } from 'next/server';
// import { getSession } from '@/lib/auth';
// import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, guestItems } = body;

    if (!userId || !guestItems) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user session to verify
    // const session = await getSession(request);
    // if (!session?.user?.id || session.user.id !== userId) {
    //   return NextResponse.json(
    //     { message: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Get existing user cart from Redis
    // const cartKey = `cart:${userId}`;
    // const existingCart = await redis.get(cartKey) || { items: [] };

    // Merge logic:
    // - If same product+variant exists in both, keep the higher quantity
    // - Otherwise, add guest items to user cart
    // const mergedItems = [...existingCart.items];
    
    // guestItems.forEach((guestItem: any) => {
    //   const existingIndex = mergedItems.findIndex(
    //     (item: any) => 
    //       item.productId === guestItem.productId && 
    //       item.variantId === guestItem.variantId
    //   );
    //   
    //   if (existingIndex >= 0) {
    //     // Keep higher quantity
    //     mergedItems[existingIndex].quantity = Math.max(
    //       mergedItems[existingIndex].quantity,
    //       guestItem.quantity
    //     );
    //   } else {
    //     // Add guest item
    //     mergedItems.push(guestItem);
    //   }
    // });

    // Save merged cart
    // const mergedCart = { items: mergedItems };
    // await redis.setex(cartKey, 30 * 24 * 60 * 60, JSON.stringify(mergedCart));

    return NextResponse.json(
      { 
        message: 'Cart merged successfully',
        items: guestItems, // Replace with mergedItems
        success: true 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cart merge error:', error);
    return NextResponse.json(
      { message: 'Failed to merge cart' },
      { status: 500 }
    );
  }
}











