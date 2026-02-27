import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import NewsletterSubscriber from '@/lib/models/NewsletterSubscriber';
import { RateLimiter } from '@/lib/redis';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  return realIp || request.ip || 'unknown';
}

// Redis-backed limiter: limit newsletter attempts per IP+email
const newsletterRateLimiter = new RateLimiter(60000, 10);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const email = rawEmail.toLowerCase();
    const rawLocale = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : '';
    const locale = rawLocale === 'he' ? 'he' : 'en';

    const ip = getClientIP(request);
    const rate = await newsletterRateLimiter.isAllowed(
      `newsletter:${ip}:${email}`
    );
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      console.warn('Newsletter subscribe rate limit exceeded', {
        ip,
        email,
        retryAfterSeconds,
      });
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await NewsletterSubscriber.findOne({ email, locale });
    if (existing) {
      return NextResponse.json(
        { success: true, message: 'You are already subscribed.', alreadySubscribed: true },
        { status: 200 }
      );
    }

    await NewsletterSubscriber.create({ email, locale, source: 'footer' });

    return NextResponse.json(
      { success: true, message: 'Successfully subscribed to the newsletter.' },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err?.code === 11000) {
      return NextResponse.json(
        { success: true, message: 'You are already subscribed.', alreadySubscribed: true },
        { status: 200 }
      );
    }
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
