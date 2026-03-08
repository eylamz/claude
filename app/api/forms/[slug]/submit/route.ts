import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import Form from '@/lib/models/Form';
import FormSubmission from '@/lib/models/FormSubmission';
import crypto from 'crypto';
import { RateLimiter } from '@/lib/redis';

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Generate user fingerprint from IP and User-Agent
 */
function generateFingerprint(ip: string, userAgent: string): string {
  const combined = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Hash sensitive data
 */
function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Rate limiter: protect against form spam per IP+form
const formSubmitRateLimiter = new RateLimiter(60000, 10);

export async function POST(
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

    // Check if form is visible
    if (!form.isVisible()) {
      return NextResponse.json({ error: 'Form is not available' }, { status: 404 });
    }

    // Get client information
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const fingerprint = generateFingerprint(ip, userAgent);

    // Rate limiting per IP + form
    const rate = await formSubmitRateLimiter.isAllowed(
      `form-submit:${slug}:${ip}`
    );
    if (!rate.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rate.resetTime - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: 'Too many submissions',
          message: 'Form submission rate limit exceeded. Please try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfterSeconds.toString(),
          },
        }
      );
    }

    // Check for duplicate submission
    const existingSubmission = await FormSubmission.findByFingerprint(new mongoose.Types.ObjectId(String(form._id)), fingerprint);
    if (existingSubmission) {
      return NextResponse.json(
        { error: 'You have already submitted this form', submitted: true },
        { status: 409 }
      );
    }

    // Get request body
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Answers are required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = form.fields.filter((field) => field.required);
    const answeredFieldIds = new Set(answers.map((a: any) => a.fieldId));

    for (const field of requiredFields) {
      if (!answeredFieldIds.has(field.id)) {
        const fieldLabel = field.label.en || field.label.he || field.id;
        return NextResponse.json(
          { error: `Required field "${fieldLabel}" is missing` },
          { status: 400 }
        );
      }
    }

    // Validate and format answers
    const formattedAnswers = answers.map((answer: any) => {
      const field = form.fields.find((f) => f.id === answer.fieldId);
      if (!field) {
        throw new Error(`Field ${answer.fieldId} not found in form`);
      }

      return {
        fieldId: answer.fieldId,
        question: field.label,
        answer: answer.answer,
        fieldType: field.type,
      };
    });

    // Create submission
    const submission = new FormSubmission({
      formId: form._id,
      formSlug: form.slug,
      answers: formattedAnswers,
      userFingerprint: fingerprint,
      ipAddress: hashData(ip),
      userAgent: hashData(userAgent),
    });

    await submission.save();

    // Increment form submissions count
    await form.incrementSubmissions();

    return NextResponse.json({
      success: true,
      submissionId: String(submission._id),
    });
  } catch (error: any) {
    console.error('Submit form error:', error);

    // Handle duplicate key error (shouldn't happen due to pre-check, but just in case)
    if (error.code === 11000 || error.name === 'MongoServerError') {
      return NextResponse.json(
        { error: 'You have already submitted this form', submitted: true },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    );
  }
}
