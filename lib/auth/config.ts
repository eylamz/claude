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
          const user = await User.findOne({ email: credentials.email.toLowerCase() }).select('+password');

          if (!user) {
            throw new Error('No user found with this email');
          }

          // Compare password
          const isPasswordValid = await user.comparePassword(credentials.password);

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          // Check if email is verified (optional requirement)
          // You can remove this if you want to allow unverified users
          // if (!user.emailVerified) {
          //   throw new Error('Please verify your email before logging in');
          // }

          // Return user object for JWT token including preferences
          return {
            id: (user._id as any).toString(),
            email: user.email,
            name: user.fullName,
            role: user.role,
            preferences: {
              language: user.preferences?.language || 'en',
              colorMode: user.preferences?.colorMode || 'system',
            },
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw error;
        }
      },
    }),
  ],

  // Session strategy
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production',
  },

  // Secret for encrypting JWT
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production',

  // Callbacks
  callbacks: {
    /**
     * Add user role and preferences to JWT token
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

