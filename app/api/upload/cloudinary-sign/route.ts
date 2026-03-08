import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, AuthError } from '@/lib/auth/server';
import crypto from 'crypto';

/** Allowed upload folders (must match image-uploader contexts) */
const ALLOWED_FOLDERS = ['skateparks', 'guideAssets', 'eventAssets'] as const;
const PUBLIC_ID_MAX_LENGTH = 200;
const PUBLIC_ID_REGEX = /^[a-zA-Z0-9_.-]+$/;

/**
 * Generate Cloudinary signed upload parameters.
 * Admin-only. Returns signature so the client can upload directly to Cloudinary
 * without exposing an unsigned preset or API secret.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary server credentials not configured (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)' },
      { status: 503 }
    );
  }

  let body: { folder?: string; public_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const folder = typeof body.folder === 'string' ? body.folder.trim() : '';
  const publicId = typeof body.public_id === 'string' ? body.public_id.trim() : '';

  if (!ALLOWED_FOLDERS.includes(folder as (typeof ALLOWED_FOLDERS)[number])) {
    return NextResponse.json(
      { error: `folder must be one of: ${ALLOWED_FOLDERS.join(', ')}` },
      { status: 400 }
    );
  }

  if (!publicId || publicId.length > PUBLIC_ID_MAX_LENGTH || !PUBLIC_ID_REGEX.test(publicId)) {
    return NextResponse.json(
      { error: 'public_id is required, max 200 chars, alphanumeric, dots, underscores, hyphens only' },
      { status: 400 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const sortedKeys = Object.keys(paramsToSign).sort();
  const paramString = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(paramString + apiSecret).digest('hex');

  return NextResponse.json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    public_id: publicId,
  });
}
