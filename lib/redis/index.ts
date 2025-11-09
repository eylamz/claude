/**
 * Redis module exports
 */

// Client
export { createRedisClient, getRedisClient, closeRedisClient, redisHealthCheck } from './client';
export type { RedisClient } from './client';

// Cart
export { CartManager, getCartManager } from './cart';
export type { Cart, CartItem } from './cart';

// Session
export { SessionManager, getSessionManager, RateLimiter, getRateLimiter } from './session';
export type { UserSession, SessionMetadata, RateLimitEntry } from './session';

