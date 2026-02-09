import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/mongodb';
import Event from '@/lib/models/Event';
import EventSignup from '@/lib/models/EventSignup';
import { sendEmail } from '@/lib/email/send';

/**
 * Event Signup API Route
 * 
 * POST /api/events/[slug]/signup
 * 
 * Handles event registration with validation, capacity checks, and email confirmation
 */

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limit by IP
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 5; // 5 requests per minute per IP
  
  const key = ip;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * Clean up old rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

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
 * Validate reCAPTCHA token (if enabled)
 */
async function validateCaptcha(token: string | null): Promise<boolean> {
  if (!token) {
    // If captcha is required but token is missing
    if (process.env.RECAPTCHA_ENABLED === 'true') {
      return false;
    }
    return true; // Captcha not enabled
  }
  
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      return true; // If no secret key, skip validation
    }
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secretKey}&response=${token}`,
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA validation error:', error);
    return false;
  }
}

/**
 * Validate form data against event schema
 */
function validateFormData(formData: any[], _event: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(formData) || formData.length === 0) {
    errors.push('Form data is required');
    return { valid: false, errors };
  }
  
  // Check for required fields (email is always required)
  const hasEmail = formData.some((field: { type?: string; value?: unknown }) => field.type === 'email' && field.value);
  if (!hasEmail) {
    errors.push('Email address is required');
  }
  
  // Validate email format if present
  const emailField = formData.find((field: { type?: string; value?: unknown }) => field.type === 'email');
  if (emailField?.value && typeof emailField.value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailField.value)) {
      errors.push('Invalid email format');
    }
  }
  
  // Validate phone format if present
  const phoneField = formData.find((field: { type?: string; value?: unknown }) => field.type === 'phone');
  if (phoneField?.value && typeof phoneField.value === 'string') {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phoneField.value)) {
      errors.push('Invalid phone format');
    }
  }
  
  // Check field names are not empty
  for (const field of formData) {
    if (!field.name || !field.type) {
      errors.push('All fields must have a name and type');
      break;
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Generate email confirmation HTML
 */
function generateConfirmationEmail(event: any, confirmationNumber: string, formData: any[]): string {
  const eventTitle = event.title?.en || event.title || 'Event';
  const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const eventTime = event.isAllDay 
    ? 'All Day' 
    : new Date(event.startDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
  const eventLocation = event.location?.name?.en || event.location?.address?.en || 'TBA';
  
  const formFieldsHtml = formData.map((field) => {
    const label = field.label || field.name;
    const value = String(field.value);
    return `
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #333;">${label}:</td>
        <td style="padding: 8px 0; color: #666;">${value}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Event Registration Confirmed</h1>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px;">
            <p style="margin: 0; color: #1e40af; font-weight: bold; font-size: 18px;">
              Confirmation Number: ${confirmationNumber}
            </p>
          </div>
          
          <h2 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Event Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Event:</td>
              <td style="padding: 8px 0; color: #666;">${eventTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Date:</td>
              <td style="padding: 8px 0; color: #666;">${eventDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Time:</td>
              <td style="padding: 8px 0; color: #666;">${eventTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #333;">Location:</td>
              <td style="padding: 8px 0; color: #666;">${eventLocation}</td>
            </tr>
          </table>
          
          <h2 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Your Registration</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            ${formFieldsHtml}
          </table>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px; margin-top: 30px;">
            Thank you for registering! Please save this confirmation number for your records.
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated confirmation email. If you have any questions, please contact the event organizer.
          </p>
        </div>
      </body>
    </html>
  `;
}

/**
 * POST handler for event signup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Rate limiting
    const rateLimit = checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
          },
        }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { formData, captchaToken } = body;
    
    // Validate CAPTCHA if enabled
    const captchaValid = await validateCaptcha(captchaToken || null);
    if (!captchaValid) {
      return NextResponse.json(
        { error: 'CAPTCHA validation failed', message: 'Please complete the CAPTCHA verification' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Find event
    const event = await Event.findBySlug(slug);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', message: 'The event you are trying to sign up for does not exist' },
        { status: 404 }
      );
    }
    
    // Check if event is published
    if (event.status !== 'published') {
      return NextResponse.json(
        { error: 'Event not available', message: 'This event is not currently accepting registrations' },
        { status: 400 }
      );
    }
    
    // Check if registration is required
    if (!event.registrationRequired) {
      return NextResponse.json(
        { error: 'Registration not required', message: 'This event does not require registration' },
        { status: 400 }
      );
    }
    
    // Check if registration has closed (deadline passed)
    if (event.registrationClosesAt && new Date(event.registrationClosesAt) < new Date()) {
      return NextResponse.json(
        { error: 'Registration closed', message: 'The registration deadline has passed' },
        { status: 400 }
      );
    }
    
    // Check if event is past
    if (event.isPast()) {
      return NextResponse.json(
        { error: 'Event has passed', message: 'Registration for this event is no longer available' },
        { status: 400 }
      );
    }
    
    // Validate form data
    const validation = validateFormData(formData, event);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Please check your form data', errors: validation.errors },
        { status: 400 }
      );
    }

    // Require event rules acceptance when signup form has showEventRulesCheckbox
    if (event.signupForm?.showEventRulesCheckbox) {
      const eventRulesAccepted = formData.find((f: any) => f.name === 'eventRulesAccepted');
      if (!eventRulesAccepted || eventRulesAccepted.value !== true) {
        return NextResponse.json(
          { error: 'Event rules required', message: 'You must accept the event rules to register' },
          { status: 400 }
        );
      }
    }
    // Require privacy policy acceptance when signup form has showPrivacyCheckbox
    if (event.signupForm?.showPrivacyCheckbox) {
      const privacyAccepted = formData.find((f: any) => f.name === 'privacyAccepted');
      if (!privacyAccepted || privacyAccepted.value !== true) {
        return NextResponse.json(
          { error: 'Privacy policy required', message: 'You must agree to the privacy policy to register' },
          { status: 400 }
        );
      }
    }
    
    // Extract email from form data
    const emailField = formData.find((field: { type?: string; value?: unknown }) => field.type === 'email');
    const email = emailField?.value as string;
    
    // Get authenticated user if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Check for duplicate registration
    const existingSignup = await EventSignup.findDuplicate(String(event._id), email, ipAddress);
    if (existingSignup) {
      return NextResponse.json(
        {
          error: 'Already registered',
          message: 'You have already registered for this event',
          confirmationNumber: existingSignup.confirmationNumber,
        },
        { status: 409 }
      );
    }
    
    // Check capacity (if defined on event)
    const capacity = (event as { capacity?: number }).capacity;
    if (capacity != null) {
      const currentCount = await EventSignup.countByEventId(String(event._id));
      if (currentCount >= capacity) {
        return NextResponse.json(
          { error: 'Event full', message: 'This event has reached its capacity' },
          { status: 400 }
        );
      }
    }
    
    // Create signup
    const signup = new EventSignup({
      eventId: String(event._id),
      eventSlug: event.slug,
      formData,
      userId: userId || undefined,
      userEmail: email,
      ipAddress,
      userAgent,
      status: 'confirmed',
    });
    
    await signup.save();
    
    // Update event attendance counter
    await Event.findByIdAndUpdate(event._id, {
      $inc: { attendingCount: 1 },
    });
    
    // Send confirmation email
    if (email) {
      try {
        const emailHtml = generateConfirmationEmail(event, signup.confirmationNumber, formData);
        const eventTitle = (event as { content?: { en?: { title?: string }; he?: { title?: string } } }).content?.en?.title || (event as { content?: { en?: { title?: string }; he?: { title?: string } } }).content?.he?.title || 'Event';
    const emailSubject = `Event Registration Confirmation: ${eventTitle}`;
        await sendEmail(email, emailSubject, emailHtml);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Successfully registered for event',
        confirmationNumber: signup.confirmationNumber,
        signup: {
          id: signup._id,
          confirmationNumber: signup.confirmationNumber,
          submittedAt: signup.submittedAt,
          status: signup.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Event signup error:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate registration', message: 'You have already registered for this event' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'An error occurred while processing your registration' },
      { status: 500 }
    );
  }
}


