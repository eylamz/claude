# NextAuth.js Setup

This directory contains NextAuth.js configuration with MongoDB adapter, credentials provider, and role-based access control.

## Overview

NextAuth.js is configured with:
- **Credentials Provider** - Email/password authentication
- **MongoDB Adapter** - Session management with MongoDB
- **JWT Strategy** - Includes user role in JWT token
- **Role-based Access Control** - Admin/user permissions
- **Secure Cookies** - Production-ready cookie configuration

## File Structure

```
lib/auth/
├── config.ts          # NextAuth configuration
└── README.md          # This file

app/api/auth/
└── [...nextauth]/
    └── route.ts       # NextAuth API route handler

components/providers/
├── session-provider.tsx  # SessionProvider wrapper
└── index.ts             # Exports

types/
└── next-auth.d.ts     # TypeScript type extensions

middleware.ts          # Auth middleware with protected routes
```

## Environment Variables

Add these variables to your `.env.local`:

```env
# MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secret-key-here

# NextAuth URL
NEXTAUTH_URL=http://localhost:3000
```

## Configuration

### Auth Configuration (`lib/auth/config.ts`)

The configuration includes:

- **MongoDB Adapter**: Automatically creates `accounts`, `sessions`, and `verification_tokens` collections
- **Credentials Provider**: Email/password authentication
- **JWT Strategy**: 30-day session with role in token
- **Session Callbacks**: Includes user role in session
- **Cookie Security**: Secure, HTTP-only cookies in production
- **Custom Pages**: `/auth/signin`, `/auth/register`, etc.

### API Route (`app/api/auth/[...nextauth]/route.ts`)

This route handles all NextAuth endpoints:
- `/api/auth/signin`
- `/api/auth/signout`
- `/api/auth/session`
- `/api/auth/csrf`
- And more...

### Session Provider (`components/providers/session-provider.tsx`)

Wrap your app with this provider to enable session access:

```tsx
import { SessionProvider } from '@/components/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Middleware (`middleware.ts`)

Protected routes:
- `/account/*` - Requires authentication
- `/admin/*` - Requires admin role
- `/[locale]/admin/*` - Requires admin role for each locale

Public routes:
- `/` - Home page
- `/auth/*` - Auth pages (signin, register, etc.)

## Usage Examples

### Server Components

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <p>Role: {session.user.role}</p>
    </div>
  );
}
```

### Client Components

```tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <button onClick={() => signIn()}>Sign In</button>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Client Hooks

```tsx
'use client';

import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <div>
      <p>User: {session.user.name}</p>
      <p>Email: {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <p>ID: {session.user.id}</p>
    </div>
  );
}
```

### Protected API Routes

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ data: 'Protected data' });
}
```

### Admin-Only API Routes

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin-only logic here
  return NextResponse.json({ success: true });
}
```

## Role-Based Access Control

### Check if User is Admin

```tsx
const isAdmin = session?.user.role === 'admin';
```

### Check if User is Editor or Admin

```tsx
const canEdit = ['editor', 'admin'].includes(session?.user.role || '');
```

### Role Guards in Components

```tsx
export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return <div>Admin content</div>;
}
```

## Middleware Protection

The middleware automatically protects routes based on the configuration in `middleware.ts`.

### How It Works

1. **Public Routes**: Accessible without authentication
   - `/', '/auth/*`

2. **Protected Routes**: Require authentication
   - `/account/*`
   - `/admin/*`
   - `/[locale]/admin/*`

3. **Admin Routes**: Require admin role
   - `/admin/*`
   - `/[locale]/admin/*`

### Customizing Middleware

To add more protected routes, update the middleware configuration:

```typescript
const protectedRoutes = ['/account', '/orders', '/checkout'];

// In the middleware callback
const isProtected = protectedRoutes.some(route => 
  pathname.startsWith(route)
);

if (isProtected && !token) {
  // Redirect to sign in
}
```

## Database Collections

NextAuth.js with MongoDB adapter creates these collections:

### `accounts`
Stores OAuth account connections.

### `sessions`
Stores active user sessions.

### `verification_tokens`
Stores email verification tokens.

### `users` (Custom)
Your existing user collection with authentication data.

## Security Features

### 1. Secure Cookies in Production
```typescript
cookies: {
  sessionToken: {
    options: {
      httpOnly: true,
      sameSite: 'none',
      secure: true, // Only in production
    },
  },
}
```

### 2. Session Management
- **Max Age**: 30 days
- **JWT Secret**: From environment variables
- **Auto-refresh**: Handled by NextAuth.js

### 3. Password Security
- Uses bcrypt hashing (handled by User model)
- Minimum 6 characters
- Not stored in sessions

### 4. Role Verification
- Roles stored in JWT token
- Middleware checks roles before allowing access
- Server-side role validation in API routes

## Troubleshooting

### Issue: "NextAuth URL not configured"
**Solution**: Add `NEXTAUTH_URL` to `.env.local`

### Issue: "Secret not configured"
**Solution**: Generate a secret:
```bash
openssl rand -base64 32
```

### Issue: MongoDB connection fails
**Solution**: Check `MONGODB_URI` in `.env.local` and ensure MongoDB is accessible.

### Issue: Sessions not persisting
**Solution**: Check cookie settings and ensure cookies are enabled in browser.

### Issue: Middleware not working
**Solution**: Ensure `middleware.ts` is in the root of the project, not in `app/`.

## Best Practices

### 1. Always Validate Roles Server-Side
```tsx
const session = await getServerSession(authOptions);
if (session.user.role !== 'admin') {
  throw new Error('Forbidden');
}
```

### 2. Use Loading States
```tsx
const { status } = useSession();
if (status === 'loading') {
  return <Loading />;
}
```

### 3. Handle Unauthenticated State
```tsx
if (!session) {
  redirect('/auth/signin');
}
```

### 4. Protect Sensitive Data
```tsx
// Don't expose sensitive data in client components
// Only pass what's necessary
```

### 5. Use TypeScript Types
```tsx
import { Session } from 'next-auth';

interface ExtendedSession extends Session {
  user: {
    id: string;
    role: string;
  };
}
```

## Testing

### Test Authentication Flow

```tsx
// Test sign in
const result = await signIn('credentials', {
  email: 'test@example.com',
  password: 'password',
});

// Test session
const session = await getServerSession(authOptions);
expect(session?.user.email).toBe('test@example.com');
```

### Test Role-Based Access

```tsx
// As regular user
const session = await getServerSession(authOptions);
expect(session?.user.role).toBe('user');

// Try to access admin route
const response = await fetch('/admin');
expect(response.status).toBe(403);
```

## Migration Notes

If migrating from existing authentication:

1. **Install dependencies**
   ```bash
   npm install next-auth @next-auth/mongodb-adapter
   ```

2. **Add environment variables** to `.env.local`

3. **Update User model** to include bcrypt password hashing

4. **Create auth pages** or use default ones

5. **Test authentication flow**

## Related Files

- `lib/models/User.ts` - User model with authentication
- `lib/utils/password.ts` - Password utilities
- `middleware.ts` - Auth middleware
- `app/[locale]/(auth)/` - Auth pages (to be created)

## Next Steps

1. Create auth pages:
   - Sign in page
   - Register page
   - Sign out page
   - Error page

2. Add email verification (optional)
3. Add password reset functionality
4. Add OAuth providers (Google, GitHub, etc.)
5. Add MFA (Multi-Factor Authentication)

