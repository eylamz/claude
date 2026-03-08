import { NextResponse } from 'next/server';
import { getConnectionStatus, isDBConnected } from '@/lib/db/mongodb';
import { internalError } from '@/lib/api/errors';

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
    return internalError(error, 'health');
  }
}

