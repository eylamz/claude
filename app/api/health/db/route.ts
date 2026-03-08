import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getConnectionStatus, isDBConnected } from '@/lib/db/mongodb';
import { requireAdmin } from '@/lib/auth/server';

const HEALTH_SECRET = process.env.HEALTH_SECRET;
const HEALTH_ALLOWED_IPS = process.env.HEALTH_ALLOWED_IPS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  return 'unknown';
}

/**
 * Allow only: admin session, HEALTH_SECRET header, or IP in HEALTH_ALLOWED_IPS.
 * Returns true if request is authorized to access health/db.
 */
async function isHealthAuthorized(request: NextRequest): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    // Not admin; try secret or IP
  }
  if (HEALTH_SECRET) {
    const secretHeader = request.headers.get('x-health-secret');
    const bearer = request.headers.get('authorization');
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : null;
    if (secretHeader === HEALTH_SECRET || token === HEALTH_SECRET) return true;
  }
  if (HEALTH_ALLOWED_IPS.length > 0) {
    const ip = getClientIP(request);
    if (HEALTH_ALLOWED_IPS.includes(ip)) return true;
  }
  return false;
}

function forbidden(): NextResponse {
  return NextResponse.json({ status: 'forbidden', message: 'Forbidden' }, { status: 403 });
}

/**
 * GET /api/health/db
 * Check database connection status.
 * Restricted: admin auth, HEALTH_SECRET header, or HEALTH_ALLOWED_IPS.
 */
export async function GET(request: NextRequest) {
  if (!(await isHealthAuthorized(request))) return forbidden();
  try {
    const status = getConnectionStatus();
    return NextResponse.json({
      status: 'ok',
      database: {
        ...status,
        ready: isDBConnected(),
      },
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/health/db
 * Test database connection by attempting to connect.
 * Restricted: admin auth, HEALTH_SECRET header, or HEALTH_ALLOWED_IPS.
 */
export async function POST(request: NextRequest) {
  if (!(await isHealthAuthorized(request))) return forbidden();
  try {
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
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    );
  }
}

