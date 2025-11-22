# Required Dependencies

## Cart System Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "zustand": "^4.4.7",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## Installation Command

```bash
npm install zustand lucide-react
```

## Optional Backend Dependencies

### For Redis Integration (Upstash)

```bash
npm install @upstash/redis
```

### For Prisma Database

```bash
npm install @prisma/client
npm install -D prisma
```

### For Authentication (NextAuth.js)

```bash
npm install next-auth
```

## Environment Variables

Create a `.env.local` file with:

```env
# Redis (if using Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Database (if using Prisma)
DATABASE_URL=your_database_url

# NextAuth (if using)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
```

## Tailwind Configuration

Ensure your `tailwind.config.js` includes:

```js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './stores/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Add custom animations if needed
      animation: {
        'spin': 'spin 1s linear infinite',
        'in': 'in 0.2s ease-out',
      },
      keyframes: {
        in: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
```

## TypeScript Configuration

Ensure your `tsconfig.json` has path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/stores/*": ["./stores/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

## Middleware Setup (Optional)

If you need to protect cart API routes:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add authentication checks for /api/cart/* routes
  if (request.nextUrl.pathname.startsWith('/api/cart')) {
    // Check for auth token/session
    // Return 401 if not authenticated
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/cart/:path*'],
};
```

## Import Aliases Used

All components use these import patterns:

- `@/stores/cartStore` - Cart state management
- `@/components/cart/*` - Cart components
- `@/components/shop/*` - Product components
- `@/lib/cart-utils` - Utility functions

Make sure your Next.js project is configured to resolve these paths.











