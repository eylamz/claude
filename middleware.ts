import createMiddleware from 'next-intl/middleware';
import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signout',
  '/register',
  '/signin',
  '/error',
];

// Protected routes that require authentication (but not admin)
const protectedRoutes = [
  '/account',
];

// Check if a route is public (includes routes under (public) folder)
function isPublicRoute(pathname: string): boolean {
  // Root localized pages are public
  if (pathname === '/en' || pathname === '/he') {
    return true;
  }

  // Root page is public
  if (pathname === '/') {
    return true;
  }

  // Paths WITHOUT a locale prefix (e.g. /events, /guides) — allow so intl middleware can redirect to /en/events etc. using browser locale
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const hasLocalePrefix = firstSegment && locales.includes(firstSegment as (typeof locales)[number]);
  if (!hasLocalePrefix && pathname.length > 1) {
    return true;
  }

  // Auth pages are public
  if (
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/signin') ||
    pathname.includes('/signout') ||
    pathname.includes('/forgot-password') ||
    pathname.includes('/reset-password')
  ) {
    return true;
  }

  // Check for localized public routes
  const matchesPublicRoute = publicRoutes.some((route) => {
    if (route === '/') {
      // Root route - check if it's exactly /en or /he or /
      return pathname === route || pathname === '/en' || pathname === '/he';
    }
    // Other public routes
    return (
      pathname === route ||
      pathname.startsWith(`/en${route}`) ||
      pathname.startsWith(`/he${route}`)
    );
  });

  if (matchesPublicRoute) {
    return true;
  }

  // Routes under (public) folder are public:
  // shop, skateparks, trainers, guides, events, cart, checkout, search, about, growth-lab
  // Plus footer/header links: contact, terms, cookies, accessibility, community
  const publicPathPatterns = [
    /^\/[a-z]{2}\/shop/,
    /^\/[a-z]{2}\/skateparks/,
    /^\/[a-z]{2}\/trainers/,
    /^\/[a-z]{2}\/guides/,
    /^\/[a-z]{2}\/events/,
    /^\/[a-z]{2}\/cart/,
    /^\/[a-z]{2}\/checkout/,
    /^\/[a-z]{2}\/search/,
    /^\/[a-z]{2}\/about$/,
    // Growth Lab root and all its subpaths (e.g. surveys) are public
    /^\/[a-z]{2}\/growth-lab/,
    // Footer & HeaderNav page links
    /^\/[a-z]{2}\/contact/,
    /^\/[a-z]{2}\/terms/,
    /^\/[a-z]{2}\/cookies/,
    /^\/[a-z]{2}\/accessibility/,
    /^\/[a-z]{2}\/community/,
  ];

  return publicPathPatterns.some((pattern) => pattern.test(pathname));
}

// Check if a route requires admin role
function isAdminRoute(pathname: string): boolean {
  return (
    pathname.includes('/admin') ||
    pathname.match(/^\/[a-z]{2}\/admin/) !== null ||
    pathname === '/admin'
  );
}

// Check if a route requires authentication (but not admin)
function isProtectedRoute(pathname: string): boolean {
  // 1) Explicit protected routes (e.g. /account) and their localized variants
  const matchesExplicitProtected = protectedRoutes.some((route) => {
    return (
      pathname === route ||
      pathname.startsWith(`/en${route}`) ||
      pathname.startsWith(`/he${route}`)
    );
  });

  if (matchesExplicitProtected) {
    return true;
  }

  // 2) Any route under the localized (protected) segment is treated as protected by convention:
  //    /en/(protected)/... or /he/(protected)/...
  const protectedGroupPattern = /^\/(en|he)\/\(protected\)\//;
  return protectedGroupPattern.test(pathname);
}

// Auth middleware configuration
// Pass same cookie name as auth config so middleware finds the session on HTTPS
// (getToken defaults to __Secure-next-auth.session-token on HTTPS, but we use next-auth.session-token)
export default withAuth(
  function onSuccess(req: NextRequest) {
    // Get the token from the request
    const token = (req as any).nextauth.token;

    // Get the pathname
    const pathname = req.nextUrl.pathname;

    // Check if the path requires admin role
    if (isAdminRoute(pathname) && token?.role !== 'admin') {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Pass locale from URL to the request so root layout can set html[lang]
    const localeFromPath = pathname.split('/').filter(Boolean)[0];
    const requestHeaders = new Headers(req.headers);
    if (localeFromPath && locales.includes(localeFromPath as any)) {
      requestHeaders.set('x-next-intl-locale', localeFromPath);
    }
    const modifiedRequest = new NextRequest(req.url, { headers: requestHeaders });

    // Continue with i18n middleware
    return intlMiddleware(modifiedRequest);
  },
  {
    callbacks: {
      authorized: ({
        token,
        req,
      }: {
        token: {
          role?: string;
        } | null;
        req: NextRequest;
      }) => {
        const pathname = req.nextUrl.pathname;

        // Allow public routes (no authentication required)
        if (isPublicRoute(pathname)) {
          return true;
        }

        // Admin routes: allow any authenticated user; onSuccess redirects non-admins to /
        // (avoids redirect-to-login when cookie name or token.role differs in middleware)
        if (isAdminRoute(pathname)) {
          return !!token;
        }

        // Check protected routes (require authentication but not admin)
        if (isProtectedRoute(pathname)) {
          return !!token;
        }

        // Has locale but matches no known public/protected/admin pattern — allow so Next.js can serve 404
        return true;
      },
    },
    // Use same cookie name as lib/auth/config so middleware finds the session (e.g. on HTTPS)
    cookies: {
      sessionToken: { name: 'next-auth.session-token' },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  // Match all paths except API routes, Next.js internals, static files, etc.
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, etc. (static files)
     * - *.* files (all files with extensions)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\..*).*)',
  ],
};

