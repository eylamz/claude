import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Form from '@/lib/models/Form';
import FormSubmission from '@/lib/models/FormSubmission';
import crypto from 'crypto';
import { internalError } from '@/lib/api/errors';

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return realIp || 'unknown';
}

/**
 * Generate user fingerprint from IP and User-Agent
 */
function generateFingerprint(ip: string, userAgent: string): string {
  const combined = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectDB();

    // Get form
    const form = await Form.findBySlug(slug);
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Get client information
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const fingerprint = generateFingerprint(ip, userAgent);

    // Check for existing submission
    const existingSubmission = await FormSubmission.findByFingerprint(new mongoose.Types.ObjectId(String(form._id)), fingerprint);

    return NextResponse.json({
      submitted: !!existingSubmission,
    });
  } catch (error: any) {
    return internalError(error, 'forms/check-submission');
  }
}
