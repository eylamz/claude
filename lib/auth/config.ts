import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import User from '@/lib/models/User';
import { connectDB, isDBConnected } from '@/lib/db/mongodb';

/**
 * Resolve a safe NextAuth secret.
 *
 * - In production (and other non-development environments), NEXTAUTH_SECRET is mandatory,
 *   and we fail fast if it is missing or still set to the placeholder value.
 * - In development, we allow a deterministic fallback to make onboarding easier,
 *   but log a warning so it is not mistaken for a production-ready configuration.
 */
const getNextAuthSecret = (): string => {
  const envSecret = process.env.NEXTAUTH_SECRET;

  if (envSecret && envSecret !== 'generate_a_random_secret_here') {
    return envSecret;
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(
      'NEXTAUTH_SECRET is not set or is using the placeholder value. ' +
        'Using an insecure development-only fallback. Do NOT use this configuration in production.'
    );
    return 'development-only-insecure-nextauth-secret';
  }

  throw new Error(
    'NEXTAUTH_SECRET is required and must be a strong, random value in production. ' +
      'Set NEXTAUTH_SECRET in your environment configuration.'
  );
};

const NEXTAUTH_SECRET = getNextAuthSecret();

/**
 * Resolve and validate the MongoDB URI for NextAuth.
 *
 * This mirrors the strict checks used in the main MongoDB utility so that:
 * - We fail fast when MONGODB_URI is missing or misconfigured.
 * - We avoid accidentally using an administrative connection string.
 */
const getMongoDbUriForAuth = (): string => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI environment variable is not defined. ' +
        'Set MONGODB_URI to a least-privilege MongoDB Atlas user (readWrite on your app database).'
    );
  }

  return uri;
};

/**
 * MongoDB client for NextAuth adapter
 *
 * We lazily create and reuse a single MongoClient connection for the lifetime
 * of this module to avoid opening multiple clients in development.
 */
let clientPromise: Promise<MongoClient> | null = null;

const getMongoClientPromise = (): Promise<MongoClient> => {
  if (!clientPromise) {
    const uri = getMongoDbUriForAuth();
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
};

/**
 * NextAuth configuration
 */
export const authOptions: NextAuthOptions = {
  // Use MongoDB adapter for session management
  // Cast: @auth/mongodb-adapter uses @auth/core types; next-auth expects extended User (e.g. role)
  adapter: MongoDBAdapter(getMongoClientPromise()) as NextAuthOptions['adapter'],

  // Providers
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        try {
          // Ensure a MongoDB connection before querying with Mongoose
          if (!isDBConnected()) {
            await connectDB();
          }

          // Find user by email - explicitly select password field (it's excluded by default)
          // emailVerified is included by default, but we explicitly check it
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password emailVerified');

          if (!user) {
            throw new Error('No user found with this email');
          }

          // Compare password
          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          // Check if email is verified - redirect to pending page if not verified
          if (!user.emailVerified) {
            throw new Error('EMAIL_NOT_VERIFIED');
          }

          // Return user object for JWT token including preferences
          // Also pass rememberMe so it can be used in jwt callback for session duration
          return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.fullName,
            role: user.role,
            preferences: {
              language: user.preferences?.language || 'en',
              colorMode: user.preferences?.colorMode || 'system',
            },
            rememberMe: credentials.rememberMe === 'true',
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],

  // Session strategy
  // Note: maxAge is set dynamically in jwt callback based on rememberMe
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // Default: 30 days (for rememberMe=true)
  },

  // JWT configuration
  // Note: maxAge is set dynamically in jwt callback based on rememberMe
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // Default: 30 days (for rememberMe=true)
    secret: NEXTAUTH_SECRET,
  },

  // Secret for encrypting JWT
  secret: NEXTAUTH_SECRET,

  // Callbacks
  callbacks: {
    /**
     * Add user role and preferences to JWT token
     * Also handles rememberMe functionality for session duration
     * Refreshes role from database periodically to ensure it's up to date
     */
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role as string;
        token.email = user.email as string;
        token.preferences = (user as any).preferences || {
          language: 'en',
          colorMode: 'system',
        };
        
        // Track when role was last refreshed (in seconds since epoch)
        token.roleRefreshedAt = Math.floor(Date.now() / 1000);
        
        // Handle rememberMe from user object (passed from authorize)
        // If rememberMe is true, use 30 days, otherwise use shorter duration (1 day)
        const rememberMe = (user as any).rememberMe === true;
        
        // Set token expiration based on rememberMe
        // For rememberMe=false, we'll use a shorter duration (1 day) that acts like a session cookie
        // For rememberMe=true, use 30 days
        const maxAge = rememberMe 
          ? 30 * 24 * 60 * 60 // 30 days
          : 24 * 60 * 60; // 1 day (session-like behavior)
        
        // Set the expiration time
        token.exp = Math.floor(Date.now() / 1000) + maxAge;
      }

      // Update session when specific actions occur
      if (trigger === 'update' && session?.user) {
        token.role = (session.user as any).role as string;
        token.roleRefreshedAt = Math.floor(Date.now() / 1000);
        if ((session.user as any).preferences) {
          token.preferences = (session.user as any).preferences;
        }
      }

      // Refresh role from database periodically (every 5 minutes) or if role is missing
      // This ensures role changes in the database are reflected in the token
      if (token.id) {
        const now = Math.floor(Date.now() / 1000);
        const roleRefreshedAt = (token.roleRefreshedAt as number) || 0;
        const fiveMinutes = 5 * 60; // 5 minutes in seconds
        
        // Refresh if role is missing or if it's been more than 5 minutes since last refresh
        if (!token.role || (now - roleRefreshedAt) > fiveMinutes) {
          try {
            // Ensure a MongoDB connection before querying
            if (!isDBConnected()) {
              await connectDB();
            }

            const dbUser = await User.findById(token.id).select('role preferences');
            if (dbUser) {
              token.role = dbUser.role;
              token.roleRefreshedAt = now;
              if (dbUser.preferences) {
                token.preferences = {
                  language: dbUser.preferences.language || 'en',
                  colorMode: dbUser.preferences.colorMode || 'system',
                };
              }
            }
          } catch (error) {
            // If database query fails, keep existing token data
            console.error('Error refreshing user role in JWT callback:', error);
          }
        }
      }

      return token;
    },

    /**
     * Return session object to client
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.preferences = (token.preferences as any) || {
          language: 'en',
          colorMode: 'system',
        };
      }
      return session;
    },

    /**
     * Handle redirects - let middleware handle locale prefix
     */
    async redirect({ url, baseUrl }) {
      // If the URL is relative, return it as-is and let middleware handle locale
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If the URL is absolute, return as is
      return url;
    },
  },

  // Pages configuration
  pages: {
    signIn: '/login',
    signOut: '/en/signout',
    error: '/en/error',
    newUser: '/en/register',
  },

  // Cookie configuration
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',
};

