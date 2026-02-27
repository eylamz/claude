import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import User from '@/lib/models/User';

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

type SessionUser = NonNullable<Session['user']> & {
  id: string;
  role?: string;
};

/**
 * Get the current session or null if unauthenticated.
 */
export const getOptionalSession = async (): Promise<Session | null> => {
  return getServerSession(authOptions);
};

/**
 * Require an authenticated user. Throws AuthError(401) when missing.
 */
export const requireUser = async (): Promise<SessionUser> => {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.id) {
    throw new AuthError('Unauthorized', 401);
  }

  return session.user as SessionUser;
};

/**
 * Require an authenticated admin user.
 * Verifies both the session and the latest role from MongoDB.
 * Throws AuthError(401) when unauthenticated and AuthError(403) when not admin.
 */
export const requireAdmin = async (): Promise<SessionUser> => {
  const user = await requireUser();

  const dbUser = await User.findById(user.id).select('role').lean();
  if (!dbUser || dbUser.role !== 'admin') {
    throw new AuthError('Forbidden', 403);
  }

  return {
    ...user,
    role: dbUser.role,
  };
};

