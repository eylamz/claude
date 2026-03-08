import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';
import { getRateLimiter } from '@/lib/redis';
import { sendPasswordResetEmailJSServer } from '@/lib/email/emailjs-service';

// Generic message to avoid leaking whether the account exists (no email enumeration)
const GENERIC_SUCCESS_MESSAGE = 'If the account exists, a verification email was sent.';

// Shared rate limiter: allow small bursts, then enforce 1-minute window per IP/email
const rateLimiter = getRateLimiter(60000, 3);

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
      const retryAfterSeconds = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${retryAfterSeconds} second${retryAfterSeconds !== 1 ? 's' : ''}.`,
          retryAfter: retryAfterSeconds, 
        },
        { status: 429, headers: { 'Retry-After': retryAfterSeconds.toString() } }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email - do not reveal whether account exists (no email enumeration)
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: GENERIC_SUCCESS_MESSAGE,
      });
    }

    // Generate verification token (reuse resetToken fields for email verification)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Set verification token and expiry (15 minutes)
    user.resetToken = verificationTokenHash;
    user.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.resetTokenUsed = false;
    user.resetTokenAttempts = 0;
    user.resetTokenIP = ip;
    await user.save();

    // Build verification URL and send email from server only - never expose token/link to client
    const locale = requestLocale || request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/${locale}/register/email/verify/${verificationToken}`;

    try {
      await sendPasswordResetEmailJSServer({
        toEmail: user.email,
        resetUrl: verificationUrl,
        locale,
        type: 'email_verification',
      });
    } catch (emailError) {
      console.error('Email verification send error:', emailError);
      // Still return generic success to avoid leaking that the account exists
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error('Email verification request error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

