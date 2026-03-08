import { NextResponse } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>();

  // Collect all explicitly configured site URLs and add their origins
  const possibleUrls = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ].filter(Boolean) as string[];

  for (const rawUrl of possibleUrls) {
    try {
      const url = new URL(rawUrl);
      origins.add(url.origin);
    } catch {
      // Ignore invalid configured URL values
    }
  }

  // Sensible defaults for local development
  origins.add('http://localhost:3000');
  origins.add('http://127.0.0.1:3000');

  return origins;
};

/**
 * Basic CSRF protection for cookie-authenticated API routes.
 *
 * - Allows safe methods (GET/HEAD/OPTIONS) without checks.
 * - For unsafe methods (POST/PUT/PATCH/DELETE), requires Origin or Referer
 *   to match the allowed origin list (derived from NEXTAUTH_URL / NEXT_PUBLIC_SITE_URL).
 *
 * Returns a NextResponse with 403 status when the request fails validation,
 * or null when the request is allowed to proceed.
 */
export const validateCsrf = (
  request: Request
): NextResponse | null => {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const headerValue = origin || referer;

  if (!headerValue) {
    return new NextResponse(
      JSON.stringify({ error: 'Missing Origin/Referer header' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const url = new URL(headerValue);
    if (!allowedOrigins.has(url.origin)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid origin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid Origin/Referer header' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return null;
};

