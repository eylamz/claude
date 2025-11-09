import { NextResponse } from 'next/server';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/db/mongodb';

export async function GET() {
  try {
    await connectDB();
    
    const categories = await Product.distinct('category', { status: 'active' });
    const sports = await Product.distinct('relatedSports', { status: 'active' });
    
    return NextResponse.json({
      categories: categories.filter(Boolean),
      sports: sports.filter(Boolean),
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

