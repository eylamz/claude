import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import User from '@/lib/models/User';
import { connectDB, isDBConnected } from '@/lib/db/mongodb';

/**
 * MongoDB client for NextAuth adapter
 */
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

/**
 * NextAuth configuration
 */
export const authOptions: NextAuthOptions = {
  // Use MongoDB adapter for session management
  adapter: MongoDBAdapter(clientPromise),

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
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production',
  },

  // Secret for encrypting JWT
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production',

  // Callbacks
  callbacks: {
    /**
     * Add user role and preferences to JWT token
     * Also handles rememberMe functionality for session duration
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
        if ((session.user as any).preferences) {
          token.preferences = (session.user as any).preferences;
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
    signIn: '/en/login',
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

