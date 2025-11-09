import { DefaultSession } from 'next-auth';

/**
 * Extend NextAuth session types with custom fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      email: string;
      preferences?: {
        language: 'en' | 'he';
        colorMode: 'light' | 'dark' | 'system';
      };
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
    preferences?: {
      language: 'en' | 'he';
      colorMode: 'light' | 'dark' | 'system';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    email: string;
    preferences?: {
      language: 'en' | 'he';
      colorMode: 'light' | 'dark' | 'system';
    };
  }
}

