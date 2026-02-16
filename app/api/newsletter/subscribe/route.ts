import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import NewsletterSubscriber from '@/lib/models/NewsletterSubscriber';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) return forwarded.split(',')[0].trim();
  return realIp || 'unknown';
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  const key = ip;
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  record.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', message: 'Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: rateLimit.retryAfter ? { 'Retry-After': String(rateLimit.retryAfter) } : {} }
      );
    }

    const body = await request.json();
    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const email = rawEmail.toLowerCase();

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await NewsletterSubscriber.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: true, message: 'You are already subscribed.', alreadySubscribed: true },
        { status: 200 }
      );
    }

    await NewsletterSubscriber.create({ email, source: 'footer' });

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
