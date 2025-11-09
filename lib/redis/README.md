# Redis with Upstash Setup

This directory contains Redis configuration and utilities for session and cart management using Upstash Redis REST API.

## Overview

- **Upstash Redis REST API** - No connection pooling needed, serverless-friendly
- **Cart Management** - Full CRUD operations for shopping carts
- **Session Management** - User session tracking and management
- **Rate Limiting** - API rate limiting with sliding window
- **Cart Abandonment Tracking** - Track abandoned carts for recovery

## File Structure

```
lib/redis/
├── client.ts          # Redis client configuration
├── cart.ts            # Cart management functions
├── session.ts         # Session management and rate limiting
├── index.ts           # Module exports
└── README.md          # This file
```

## Environment Variables

Add these to your `.env.local`:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## Quick Start

### 1. Initialize Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Redis database
3. Copy the REST URL and Token
4. Add to `.env.local`

### 2. Basic Usage

```typescript
import { getRedisClient } from '@/lib/redis';

const redis = getRedisClient();

// Set a value
await redis.set('key', 'value', { ex: 3600 }); // Expires in 1 hour

// Get a value
const value = await redis.get('key');

// Delete a value
await redis.del('key');
```

## Cart Management

### Getting Cart

```typescript
import { getCartManager } from '@/lib/redis';

const cartManager = getCartManager();

// Get user cart
const cart = await cartManager.getCart(userId);

// Get session cart
const cart = await cartManager.getCart(undefined, sessionId);
```

### Adding Items

```typescript
const cart = await cartManager.addToCart(
  {
    productId: 'prod_123',
    variantId: 'var_456',
    colorHex: '#FF0000',
    size: 'M',
    quantity: 2,
    price: 29.99,
    name: 'Product Name',
    image: 'https://example.com/image.jpg',
  },
  userId,
  sessionId
);
```

### Updating Quantities

```typescript
const cart = await cartManager.updateQuantity(
  'prod_123',
  3, // New quantity
  userId,
  sessionId,
  { variantId: 'var_456', colorHex: '#FF0000', size: 'M' }
);
```

### Removing Items

```typescript
const cart = await cartManager.removeFromCart(
  'prod_123',
  userId,
  sessionId,
  { variantId: 'var_456', colorHex: '#FF0000', size: 'M' }
);
```

### Clearing Cart

```typescript
await cartManager.clearCart(userId, sessionId);
```

### Merging Guest Cart

```typescript
const mergedCart = await cartManager.mergeGuestCart(sessionId, userId);
```

## Session Management

### Setting Session

```typescript
import { getSessionManager } from '@/lib/redis';

const sessionManager = getSessionManager();

await sessionManager.setSession(sessionId, {
  userId: 'user_123',
  email: 'user@example.com',
  role: 'user',
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});
```

### Getting Session

```typescript
const session = await sessionManager.getSession(sessionId);
```

### Getting User Sessions

```typescript
const sessions = await sessionManager.getUserSessions(userId);
// Returns all active sessions for a user
```

### Deleting Session

```typescript
await sessionManager.deleteSession(sessionId);
```

## Rate Limiting

### Creating Rate Limiter

```typescript
import { getRateLimiter } from '@/lib/redis';

// Allow 10 requests per minute
const rateLimiter = getRateLimiter(60000, 10);
```

### Checking Rate Limit

```typescript
const result = await rateLimiter.isAllowed(identifier);

if (!result.allowed) {
  return new Response('Too many requests', { status: 429 });
}

// Use result.remaining to show remaining requests
```

### API Route Example

```typescript
// app/api/example/route.ts
import { getRateLimiter } from '@/lib/redis';

export async function POST(request: Request) {
  const rateLimiter = getRateLimiter(60000, 10); // 10 requests/min
  
  // Get identifier (IP, user ID, etc.)
  const identifier = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const result = await rateLimiter.isAllowed(identifier);
  
  if (!result.allowed) {
    return Response.json(
      { error: 'Too many requests', resetTime: result.resetTime },
      { status: 429 }
    );
  }
  
  // Process request
  
  return Response.json({ data: 'success', remaining: result.remaining });
}
```

## Cart Abandonment Tracking

### Track Abandoned Cart

```typescript
import { getSessionManager } from '@/lib/redis';
import { getCartManager } from '@/lib/redis';

const sessionManager = getSessionManager();
const cartManager = getCartManager();

// Get user's cart
const cart = await cartManager.getCart(userId);

if (cart && cart.items.length > 0) {
  // Track as abandoned
  await sessionManager.trackCartAbandonment(sessionId, cart);
}
```

### Get Abandoned Cart

```typescript
const abandonedCart = await sessionManager.getAbandonedCart(sessionId);
```

### Clear Abandoned Cart

```typescript
await sessionManager.clearAbandonedCart(sessionId);
```

## Health Check

```typescript
import { redisHealthCheck } from '@/lib/redis';

const health = await redisHealthCheck();

console.log(health.status); // 'healthy' | 'unhealthy'
console.log(health.message);
```

## TypeScript Types

### Cart Types

```typescript
interface CartItem {
  productId: string;
  variantId?: string;
  colorHex?: string;
  size?: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  addedAt: string;
}

interface Cart {
  items: CartItem[];
  userId?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  total: number;
  itemCount: number;
}
```

### Session Types

```typescript
interface UserSession {
  userId: string;
  email: string;
  role: string;
  ip?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  cart?: Cart;
}

interface SessionMetadata {
  sessionId: string;
  userId?: string;
  createdAt: string;
  lastActivity: string;
  ip?: string;
  userAgent?: string;
}
```

## Redis Client Methods

### Basic Operations

- `get(key)` - Get value
- `set(key, value, options?)` - Set value with optional expiration
- `del(key)` - Delete key(s)
- `exists(key)` - Check if key exists
- `expire(key, seconds)` - Set expiration
- `ttl(key)` - Get time to live
- `keys(pattern)` - Get keys matching pattern

### Number Operations

- `incr(key)` - Increment number
- `decr(key)` - Decrement number

### Hash Operations

- `hget(key, field)` - Get hash field
- `hset(key, field, value)` - Set hash field
- `hgetall(key)` - Get all hash fields
- `hdel(key, field)` - Delete hash field(s)

### Set Operations

- `sadd(key, member)` - Add set member(s)
- `smembers(key)` - Get all set members
- `srem(key, member)` - Remove set member(s)

### List Operations

- `lpush(key, value)` - Add to left of list
- `rpush(key, value)` - Add to right of list
- `lrange(key, start, stop)` - Get list range
- `llen(key)` - Get list length

## Features

### 1. Connection Pooling
- No pooling needed with REST API
- Serverless-friendly
- Auto-retry on failures

### 2. Error Handling
- Automatic retry logic (3 attempts)
- Exponential backoff
- Graceful degradation

### 3. Expiration Management
- Automatic expiration for carts (7 days)
- Automatic expiration for sessions (7 days)
- TTL tracking

### 4. Cart Merging
- Automatic guest cart merging on login
- Quantity aggregation for duplicate items
- Smart conflict resolution

## Best Practices

### 1. Always Use Identifiers
```typescript
// Good
const cart = await cartManager.getCart(userId);

// Bad (will throw error)
const cart = await cartManager.getCart();
```

### 2. Handle Null Carts
```typescript
const cart = await cartManager.getCart(userId);
const items = cart?.items || [];
const total = cart?.total || 0;
```

### 3. Use Session IDs for Guests
```typescript
const cart = await cartManager.getCart(undefined, sessionId);
```

### 4. Merge Carts on Login
```typescript
// On user login
await cartManager.mergeGuestCart(sessionId, userId);
```

### 5. Track Abandoned Carts
```typescript
// On user leaving checkout
if (cart.items.length > 0) {
  await sessionManager.trackCartAbandonment(sessionId, cart);
}
```

## Performance

- **Upstash REST API** - Low latency globally
- **Caching** - Values are cached efficiently
- **TTL Management** - Automatic cleanup
- **No Connection Pool** - No connection overhead

## Limitations

- REST API has request limits (see Upstash documentation)
- Not suitable for high-frequency operations (>1000 req/s)
- Consider caching for frequently accessed data

## Production Checklist

- [ ] Add `UPSTASH_REDIS_REST_URL` to `.env.local`
- [ ] Add `UPSTASH_REDIS_REST_TOKEN` to `.env.local`
- [ ] Test cart operations
- [ ] Test session management
- [ ] Test rate limiting
- [ ] Monitor Upstash dashboard for usage
- [ ] Set up alerts for high usage
- [ ] Configure backup schedules
- [ ] Test abandoned cart recovery

## Related Files

- `lib/db/mongodb.ts` - MongoDB connection
- `lib/models/User.ts` - User model
- `lib/models/Product.ts` - Product model
- `lib/auth/config.ts` - NextAuth configuration

## Troubleshooting

### Issue: "UPSTASH_REDIS_REST_URL not found"
**Solution**: Add environment variables to `.env.local`

### Issue: Rate limiting too strict
**Solution**: Adjust `windowMs` and `maxRequests` in rate limiter

### Issue: Carts expiring too quickly
**Solution**: Increase `cartTTL` in CartManager (default: 7 days)

### Issue: Sessions not persisting
**Solution**: Check session TTL and ensure it's being set

## Support

- [Upstash Documentation](https://docs.upstash.com/)
- [Redis Commands](https://redis.io/commands)
- [Upstash Dashboard](https://console.upstash.com/)

