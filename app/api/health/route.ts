import { NextResponse } from 'next/server';
import { getConnectionStatus, isDBConnected } from '@/lib/db/mongodb';

export async function GET() {
  try {
    const status = getConnectionStatus();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        ...status,
        healthy: isDBConnected(),
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

