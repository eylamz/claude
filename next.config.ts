import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // In development, Next.js React Refresh (HMR) uses eval(); allow it only then.
      process.env.NODE_ENV === 'development'
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://maps.googleapis.com"
        : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://maps.googleapis.com",
      "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com https://maps.googleapis.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://placehold.co https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://*.google.com",
      "frame-src 'self' https://www.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // Use system TLS certs so Turbopack can fetch Google Fonts during build
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    qualities: [60, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
