import { getRedisClient, type RedisClient } from './client';
import { Cart } from './cart';

/**
 * Session interface
 */
export interface UserSession {
  userId: string;
  email: string;
  role: string;
  ip?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  cart?: Cart;
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  userId?: string;
  createdAt: string;
  lastActivity: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Session Manager
 */
export class SessionManager {
  private redis: RedisClient;
  private sessionTTL: number; // 7 days in seconds

  constructor() {
    this.redis = getRedisClient();
    this.sessionTTL = 7 * 24 * 60 * 60; // 7 days
  }

  /**
   * Create or update session
   */
  async setSession(
    sessionId: string,
    data: Partial<UserSession>
  ): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    
    // Get existing session or create new
    const existing = await this.redis.get(sessionKey);
    let session: UserSession;

    if (existing) {
      session = JSON.parse(existing);
      // Update fields
      Object.assign(session, data);
      session.lastActivity = new Date().toISOString();
    } else {
      session = {
        userId: data.userId || '',
        email: data.email || '',
        role: data.role || 'user',
        ip: data.ip,
        userAgent: data.userAgent,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }

    await this.redis.set(sessionKey, JSON.stringify(session), { ex: this.sessionTTL });
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    const sessionKey = `session:${sessionId}`;
    const data = await this.redis.get(sessionKey);

    if (!data) return null;

    try {
      const session = JSON.parse(data) as UserSession;
      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.redis.set(sessionKey, JSON.stringify(session), { ex: this.sessionTTL });
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessionKey = `session:${sessionId}`;
    await this.redis.del(sessionKey);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionMetadata[]> {
    const pattern = `session:*`;
    const keys = await this.redis.keys(pattern);
    const sessions: SessionMetadata[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const session = JSON.parse(data) as UserSession;
          if (session.userId === userId) {
            sessions.push({
              sessionId: key.replace('session:', ''),
              userId: session.userId,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity,
              ip: session.ip,
              userAgent: session.userAgent,
            });
          }
        } catch {
          // Ignore invalid sessions
        }
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Delete all user sessions
   */
  async deleteUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    const keys = sessions.map(s => `session:${s.sessionId}`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  /**
   * Track cart abandonment
   */
  async trackCartAbandonment(
    sessionId: string,
    cartData: Cart
  ): Promise<void> {
    const key = `abandoned_cart:${sessionId}`;
    const data = {
      cart: cartData,
      timestamp: new Date().toISOString(),
    };

    // Store for 30 days
    await this.redis.set(key, JSON.stringify(data), { ex: 30 * 24 * 60 * 60 });
  }

  /**
   * Get abandoned cart
   */
  async getAbandonedCart(sessionId: string): Promise<Cart | null> {
    const key = `abandoned_cart:${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      const result = JSON.parse(data);
      return result.cart;
    } catch {
      return null;
    }
  }

  /**
   * Clear abandoned cart
   */
  async clearAbandonedCart(sessionId: string): Promise<void> {
    const key = `abandoned_cart:${sessionId}`;
    await this.redis.del(key);
  }
}

/**
 * Rate Limiter
 */
export class RateLimiter {
  private redis: RedisClient;
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.redis = getRedisClient();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();

    try {
      // Get current count
      const countStr = await this.redis.get(key);
      const count = countStr ? parseInt(countStr, 10) : 0;

      if (count >= this.maxRequests) {
        // Get TTL to calculate reset time
        const ttl = await this.redis.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + (ttl * 1000),
        };
      }

      // Increment counter or set initial value
      if (count === 0) {
        await this.redis.set(key, '1', { ex: Math.floor(this.windowMs / 1000) });
        return {
          allowed: true,
          remaining: this.maxRequests - 1,
          resetTime: now + this.windowMs,
        };
      } else {
        await this.redis.incr(key);
        return {
          allowed: true,
          remaining: this.maxRequests - count - 1,
          resetTime: now + Math.floor(this.windowMs / 1000) * 1000,
        };
      }
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow request on error
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = `ratelimit:${identifier}`;
    await this.redis.del(key);
  }
}

/**
 * Singleton instances
 */
let sessionManagerInstance: SessionManager | null = null;
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get session manager instance
 */
export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager();
  }
  return sessionManagerInstance;
}

/**
 * Get rate limiter instance
 */
export function getRateLimiter(windowMs?: number, maxRequests?: number): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(windowMs, maxRequests);
  }
  return rateLimiterInstance;
}

