import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';
import { getRateLimiter } from '@/lib/redis';
import { sendPasswordResetEmailJSServer } from '@/lib/email/emailjs-service';

// Generic message to avoid leaking whether the account exists (no email enumeration)
const GENERIC_SUCCESS_MESSAGE = 'If the account exists, a reset email was sent.';

// Shared rate limiter: 1 request per minute per IP/email combination
const rateLimiter = getRateLimiter(60000, 1);

export async function POST(request: NextRequest) {
  try {
    const { email, locale: requestLocale } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Rate limiting - Get client IP from headers and combine with email
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    const identifier = `${ip}:${email.toLowerCase()}`;

    const rateLimit = await rateLimiter.isAllowed(identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email - do not reveal whether account exists (no email enumeration)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Same generic response whether account exists or not
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set reset token and expiry (15 minutes)
    user.resetToken = resetTokenHash;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.resetTokenUsed = false;
    user.resetTokenAttempts = 0;
    user.resetTokenIP = ip; // Store IP for optional IP binding
    await user.save();

    // Build reset URL and send email from server only - never expose token/link to client
    const locale = requestLocale || request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/${locale}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmailJSServer({
        toEmail: user.email,
        resetUrl,
        locale,
        type: 'password_reset',
      });
    } catch (emailError) {
      console.error('Password reset email send error:', emailError);
      // Still return generic success to avoid leaking that the account exists
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

