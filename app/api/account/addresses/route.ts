import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';

/**
 * Addresses API
 * GET:    list addresses
 * POST:   add address
 * PATCH:  update address / set default
 * DELETE: delete address
 */

const MAX_ADDRESSES = 5;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ addresses: user.addresses || [] });
  } catch (err) {
    console.error('Addresses GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, street, city, zip, country, phone, isDefault } = body;

    if (!type || !name || !street || !city || !zip || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if ((user.addresses?.length || 0) >= MAX_ADDRESSES) {
      return NextResponse.json({ error: `Maximum of ${MAX_ADDRESSES} addresses reached` }, { status: 400 });
    }

    const newAddress = { type, name, street, city, zip, country, phone, isDefault: !!isDefault } as any;

    // Ensure single default
    if (newAddress.isDefault) {
      user.addresses = (user.addresses || []).map((a: any) => ({ ...a, isDefault: false }));
    }

    user.addresses = [...(user.addresses || []), newAddress];
    await user.save();

    return NextResponse.json({ addresses: user.addresses });
  } catch (err) {
    console.error('Addresses POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { index, update, setDefault } = body as { index: number; update?: any; setDefault?: boolean };
    if (index === undefined || index === null) {
      return NextResponse.json({ error: 'Address index is required' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      return NextResponse.json({ error: 'Invalid address index' }, { status: 400 });
    }

    if (setDefault) {
      user.addresses = user.addresses.map((a: any, i: number) => ({ ...a.toObject?.() || a, isDefault: i === index }));
    }

    if (update) {
      const allowed = ['type', 'name', 'street', 'city', 'zip', 'country', 'phone'];
      for (const key of allowed) {
        if (key in update) {
          (user.addresses[index] as any)[key] = update[key];
        }
      }
    }

    await user.save();
    return NextResponse.json({ addresses: user.addresses });
  } catch (err) {
    console.error('Addresses PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const indexParam = request.nextUrl.searchParams.get('index');
    if (!indexParam) return NextResponse.json({ error: 'Address index is required' }, { status: 400 });
    const index = parseInt(indexParam, 10);

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (!user.addresses || index < 0 || index >= user.addresses.length) {
      return NextResponse.json({ error: 'Invalid address index' }, { status: 400 });
    }

    user.addresses.splice(index, 1);
    await user.save();

    return NextResponse.json({ addresses: user.addresses });
  } catch (err) {
    console.error('Addresses DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



