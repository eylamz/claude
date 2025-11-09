# Database Connection Management

## Overview

This directory contains utilities for connecting to MongoDB using Mongoose with TypeScript support, connection pooling, error handling, and serverless optimization.

## Features

✅ **Mongoose Connection Pooling**
- Automatic connection management
- Environment-specific pool sizes
- Serverless-friendly caching

✅ **TypeScript Support**
- Full type definitions
- Type-safe connection state
- IntelliSense support

✅ **Error Handling & Retry Logic**
- Automatic retry with exponential backoff
- Maximum retry attempts (3)
- Detailed error messages

✅ **Environment-Based Configuration**
- Development: Smaller pool, detailed logging
- Production: Larger pool, optimized for scale
- Test: Minimal pool, buffering enabled

✅ **Connection Caching**
- Prevents multiple connections in serverless
- Connection reuse across requests
- Automatic reconnection handling

✅ **Health Checks**
- Connection status monitoring
- API route integration
- Detailed connection information

## File Structure

```
lib/db/
├── mongodb.ts      # Main MongoDB connection utility
├── redis.ts        # Redis connection utility
└── README.md       # This file
```

## Usage

### Basic Connection

```typescript
import { connectDB, isDBConnected } from '@/lib/db/mongodb';
import User from '@/lib/models/User';

// In an API route or server component
export async function GET() {
  // Connect to database
  if (!isDBConnected()) {
    await connectDB();
  }

  // Use models
  const users = await User.find();
  
  return Response.json(users);
}
```

### Connection Status Check

```typescript
import { getConnectionStatus } from '@/lib/db/mongodb';

export async function GET() {
  const status = getConnectionStatus();
  
  return Response.json({
    connected: status.isConnected,
    state: status.readyStateText,
    host: status.host,
    database: status.name,
  });
}
```

### Health Check API Route

```typescript
// app/api/health/db/route.ts
import { healthCheck } from '@/lib/db/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const health = await healthCheck();
  
  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 503,
  });
}
```

### Detailed Connection Information

```typescript
import { getConnectionInfo } from '@/lib/db/mongodb';

export async function GET() {
  const info = getConnectionInfo();
  
  return Response.json({
    models: info.models,
    collections: info.collections,
    database: info.db,
  });
}
```

### Force Reconnection

```typescript
import { forceReconnect } from '@/lib/db/mongodb';

// Manually trigger reconnection
export async function POST() {
  try {
    await forceReconnect();
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## API Reference

### Functions

#### `connectDB(): Promise<typeof mongoose>`
Connects to MongoDB with caching and retry logic.

**Returns:** Mongoose instance

**Example:**
```typescript
const mongoose = await connectDB();
```

#### `disconnectDB(): Promise<void>`
Disconnects from MongoDB gracefully.

**Example:**
```typescript
await disconnectDB();
```

#### `isDBConnected(): boolean`
Checks if database is currently connected.

**Returns:** `true` if connected, `false` otherwise

**Example:**
```typescript
if (isDBConnected()) {
  // Proceed with database operations
}
```

#### `getConnectionStatus(): ConnectionState`
Gets current connection status and details.

**Returns:**
```typescript
{
  isConnected: boolean;
  readyState: number;
  readyStateText: string;
  host?: string;
  name?: string;
  port?: number;
  user?: string;
}
```

**Example:**
```typescript
const status = getConnectionStatus();
console.log(status.isConnected); // true/false
console.log(status.readyStateText); // 'connected' | 'disconnected' | etc.
```

#### `getConnectionInfo()`
Gets detailed connection information including models and collections.

**Returns:**
```typescript
{
  ...connectionStatus,
  models: string[];
  collections: string[];
  db: {
    databaseName: string;
    server: string;
    readyState: number;
  };
}
```

#### `healthCheck(): Promise<HealthCheckResult>`
Performs a health check on the database connection.

**Returns:**
```typescript
{
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  details: ConnectionState;
}
```

**Example:**
```typescript
const health = await healthCheck();
// health.status: 'healthy'
// health.message: 'MongoDB connection is active'
```

#### `forceReconnect(): Promise<void>`
Forces a reconnection to the database.

**Example:**
```typescript
try {
  await forceReconnect();
  console.log('Reconnected successfully');
} catch (error) {
  console.error('Reconnection failed:', error);
}
```

#### `getConnection(): typeof mongoose.connection`
Gets the native Mongoose connection object.

**Example:**
```typescript
const connection = getConnection();
// Access connection.db, connection.collections, etc.
```

#### `cleanup(): Promise<void>`
Cleanup function for graceful shutdown.

**Example:**
```typescript
// In a cleanup handler
process.on('exit', async () => {
  await cleanup();
});
```

### Exports

- **`mongoose`**: Direct Mongoose instance
- **`db`**: Alias for `mongoose`
- **`default`**: Default export is `connectDB` function

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/myapp
# Or for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Connection Pool Sizes

Environment-specific pool configurations:

- **Development:**
  - Max Pool: 10
  - Min Pool: 2
  
- **Production:**
  - Max Pool: 20
  - Min Pool: 5
  
- **Test:**
  - Max Pool: 5
  - Min Pool: 1

### Connection Options

- **Timeout:** 30 seconds for connection
- **Socket Timeout:** 45 seconds
- **Server Selection:** 5 seconds
- **Retry Logic:** Enabled for both reads and writes
- **Buffer Commands:** Disabled for serverless

## Connection States

MongoDB connection can be in one of these states:

1. **disconnected (0)**: Not connected
2. **connected (1)**: Successfully connected
3. **connecting (2)**: Connection in progress
4. **disconnecting (3)**: Disconnection in progress

## Error Handling

### Retry Logic

The connection utility implements automatic retry with exponential backoff:

- Maximum attempts: 3
- Initial delay: 1 second
- Exponential backoff: delay * attempt number

### Error Types

```typescript
try {
  await connectDB();
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error
    console.error('Connection failed:', error.message);
  }
}
```

## Serverless Considerations

### Connection Caching

The utility implements connection caching to prevent multiple connections in serverless environments:

```typescript
// First call
await connectDB(); // Establishes connection

// Subsequent calls
await connectDB(); // Reuses existing connection
```

### Event Listeners

The utility automatically sets up event listeners for:
- Connection events
- Error events
- Disconnection events
- Reconnection events
- Graceful shutdown (SIGINT, SIGTERM)

## Best Practices

1. **Always check connection status** before database operations
2. **Use connection caching** in serverless environments
3. **Handle errors gracefully** with try-catch blocks
4. **Use health checks** for monitoring
5. **Call `disconnectDB()`** in cleanup handlers
6. **Monitor connection state** in production
7. **Use environment-specific** configurations

## Testing

```typescript
import { connectDB, disconnectDB, getConnectionStatus } from '@/lib/db/mongodb';

describe('MongoDB Connection', () => {
  beforeEach(async () => {
    await connectDB();
  });

  afterEach(async () => {
    await disconnectDB();
  });

  it('should connect successfully', () => {
    const status = getConnectionStatus();
    expect(status.isConnected).toBe(true);
  });
});
```

## Troubleshooting

### Connection Failed
- Check `MONGODB_URI` environment variable
- Verify network connectivity
- Check firewall rules
- Review connection logs

### Slow Queries
- Review pool size settings
- Check network latency
- Monitor connection status
- Consider using indexes

### Serverless Timeouts
- Ensure `bufferCommands: false`
- Use connection caching
- Implement proper timeout handling
- Consider connection pooling limits

## Production Deployment

### Railway
1. Add `MONGODB_URI` to environment variables
2. Deploy application
3. Monitor connection logs
4. Set up health check monitoring

### Vercel
1. Add `MONGODB_URI` to project settings
2. Enable serverless functions
3. Monitor connection status
4. Set up alerts for connection failures

## Example API Routes

### Health Check Route

```typescript
// app/api/health/route.ts
import { healthCheck } from '@/lib/db/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const health = await healthCheck();
  return NextResponse.json(health);
}
```

### Status Route

```typescript
// app/api/status/route.ts
import { getConnectionStatus } from '@/lib/db/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const status = getConnectionStatus();
  return NextResponse.json(status);
}
```

## Related Files

- `lib/models/User.ts` - User model example
- `lib/models/Product.ts` - Product model example
- `app/api/` - API routes using database
