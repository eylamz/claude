import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Settings from '@/lib/models/Settings';
import connectMongoDB from '@/lib/db/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoDB();
    
    const settings = await Settings.findOrCreate();
    
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    await connectMongoDB();
    
    const settings = await Settings.findOrCreate();
    
    // Update settings
    if (body.homepage) {
      settings.homepage = { ...settings.homepage, ...body.homepage };
    }
    if (body.shop) {
      settings.shop = { ...settings.shop, ...body.shop };
    }
    if (body.email) {
      settings.email = { ...settings.email, ...body.email };
    }
    if (body.seo) {
      settings.seo = { ...settings.seo, ...body.seo };
    }
    if (body.maintenance) {
      settings.maintenance = { ...settings.maintenance, ...body.maintenance };
    }
    if (body.skateparksVersion !== undefined) {
      settings.skateparksVersion = body.skateparksVersion;
    }
    if (body.guidesVersion !== undefined) {
      settings.guidesVersion = body.guidesVersion;
    }
    if (body.eventsVersion !== undefined) {
      settings.eventsVersion = body.eventsVersion;
    }
    
    await settings.save();
    
    return NextResponse.json({ 
      message: 'Settings saved successfully',
      settings 
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}














