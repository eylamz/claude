import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import Product from '@/lib/models/Product';

export async function GET() {
  try {
    // Connect to database first
    await connectDB();

    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    // First check session role (faster), then verify in database
    if (session.user.role !== 'admin') {
      // Verify in database as well to ensure role is up to date
      const user = await User.findById(session.user.id);
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Generate sales data for last 30 days
    const salesData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      salesData.push({
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 5000) + 1000,
      });
    }

    // Calculate metrics
    const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
    
    // Simulate orders (in real app, this would query an Order model)
    const totalOrders = Math.floor(totalRevenue / 100);
    const activeUsers = await User.countDocuments({ role: 'user' });
    
    // Get low stock products
    const products = await Product.find({ status: 'active' });
    const lowStockItems = products.filter(product => {
      const totalStock = product.variants.reduce(
        (sum, variant) => sum + variant.sizes.reduce((sizeSum, size) => sizeSum + size.stock, 0),
        0
      );
      return totalStock > 0 && totalStock <= 10;
    }).length;

    // Get popular products (simulated)
    const popularProducts = products
      .map((product: any) => ({
        id: product._id,
        name: product.name.en || product.name,
        category: product.category,
        sales: Math.floor(Math.random() * 100),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    // Simulate recent orders
    const recentOrders = Array.from({ length: 10 }, (_, i) => ({
      id: `order-${i + 1}`,
      customer: `Customer ${i + 1}`,
      product: popularProducts[i % popularProducts.length]?.name || 'Product',
      amount: Math.floor(Math.random() * 500) + 50,
      status: ['pending', 'completed', 'processing'][Math.floor(Math.random() * 3)],
      date: new Date(Date.now() - i * 86400000).toISOString(),
    }));

    return NextResponse.json({
      metrics: {
        totalRevenue,
        totalOrders,
        activeUsers,
        lowStockItems,
      },
      salesData,
      popularProducts,
      recentOrders,
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

