import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import crypto from 'crypto';

// Rate limiting: Store in-memory (use Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number; firstRequest: number }>();

function checkRateLimit(ip: string, email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${ip}:${email.toLowerCase()}`;
  const record = rateLimitStore.get(key);

  if (!record) {
    // First request - allow it
    rateLimitStore.set(key, { 
      count: 1, 
      resetTime: now + 10000, // 10 seconds for second request
      firstRequest: now 
    });
    return { allowed: true };
  }

  // If it's been more than 1 minute since first request, reset to allow
  if (now - record.firstRequest > 60000) {
    rateLimitStore.set(key, { 
      count: 1, 
      resetTime: now + 10000, // 10 seconds for second request
      firstRequest: now 
    });
    return { allowed: true };
  }

  // Check if we're in the 10-second window for second request
  if (record.count === 1 && now < record.resetTime) {
    // Second request within 10 seconds - block
    return { 
      allowed: false, 
      retryAfter: Math.ceil((record.resetTime - now) / 1000) 
    };
  }

  // After second request, use 1-minute rate limit
  if (record.count >= 2) {
    if (now < record.resetTime) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((record.resetTime - now) / 1000) 
      };
    }
    // Reset to 1-minute window
    record.count = 1;
    record.resetTime = now + 60000; // 1 minute
    record.firstRequest = now;
    return { allowed: true };
  }

  // Increment count and set new reset time
  record.count++;
  if (record.count === 2) {
    record.resetTime = now + 10000; // 10 seconds for second request
  } else {
    record.resetTime = now + 60000; // 1 minute for subsequent requests
  }
  
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - Get client IP from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    const { email, locale: requestLocale } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = checkRateLimit(ip, email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: `Too many requests. Please try again in ${rateLimit.retryAfter} second${rateLimit.retryAfter !== 1 ? 's' : ''}.`,
          retryAfter: rateLimit.retryAfter 
        },
        { status: 429 }
      );
    }

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Return error if email is not associated with an account
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address.' },
        { status: 404 }
      );
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

    // Generate verification URL - client will send email via EmailJS
    const locale = requestLocale || request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'en';
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/${locale}/register/email/verify/${verificationToken}`;

    // Return verification URL to client so it can send email via EmailJS
    return NextResponse.json({
      success: true,
      verificationUrl,
      email: user.email,
    });
  } catch (error) {
    console.error('Email verification request error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

