import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';

// Rate limiting: Store in-memory (use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }

  if (record.count >= 1) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { email, locale: requestLocale } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email - confirm email is associated with an account
    const user = await User.findOne({ email: email.toLowerCase() });

    // Return error if email is not associated with an account
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
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

    // Generate reset URL - client will send email via EmailJS
    const locale = requestLocale || request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/${locale}/reset-password/${resetToken}`;

    // Return reset URL to client so it can send email via EmailJS
    return NextResponse.json({
      success: true,
      resetUrl,
      email: user.email,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

