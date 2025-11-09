import { NextResponse } from 'next/server';
import { connectDB, getConnectionStatus, isDBConnected } from '@/lib/db/mongodb';

/**
 * GET /api/health/db
 * Check database connection status
 */
export async function GET() {
  try {
    // Get current status without connecting
    const status = getConnectionStatus();
    
    return NextResponse.json({
      status: 'ok',
      database: {
        ...status,
        ready: isDBConnected(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/db
 * Test database connection by attempting to connect
 */
export async function POST() {
  try {
    console.log('🧪 Testing database connection...');
    
    await connectDB();
    
    const status = getConnectionStatus();
    
    return NextResponse.json({
      status: 'ok',
      message: 'Database connection test successful',
      database: {
        ...status,
        connected: true,
      },
    });
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

