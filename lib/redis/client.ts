/**
 * Redis client configuration for Upstash
 */

interface RedisConfig {
  url: string;
  token: string;
}

interface RedisResponse {
  result: any;
  error?: string;
}

/**
 * Get Redis configuration from environment variables
 */
function getRedisConfig(): RedisConfig {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
  }

  return { url, token };
}

/**
 * Create Redis REST API request
 */
async function redisRequest(
  command: string,
  args: (string | number)[] = [],
  retries: number = 3
): Promise<RedisResponse> {
  const config = getRedisConfig();

  const body = JSON.stringify([command, ...args]);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body,
      });

      if (!response.ok) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`Redis request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (attempt === retries) {
        console.error('Redis request failed after retries:', error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error('Redis request failed after all retries');
}

/**
 * Redis client interface
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  del(key: string | string[]): Promise<number>;
  exists(key: string | string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string | string[]): Promise<number>;
  sadd(key: string, members: string | string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, members: string | string[]): Promise<number>;
  lpush(key: string, values: string | string[]): Promise<number>;
  rpush(key: string, values: string | string[]): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
}

/**
 * Create Redis client instance
 */
export function createRedisClient(): RedisClient {
  return {
    // Basic operations
    async get(key: string): Promise<string | null> {
      const result = await redisRequest('GET', [key]);
      return result.result;
    },

    async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
      if (options?.ex) {
        await redisRequest('SET', [key, value, 'EX', options.ex]);
      } else {
        await redisRequest('SET', [key, value]);
      }
    },

    async del(key: string | string[]): Promise<number> {
      const keys = Array.isArray(key) ? key : [key];
      const result = await redisRequest('DEL', keys);
      return result.result;
    },

    async exists(key: string | string[]): Promise<number> {
      const keys = Array.isArray(key) ? key : [key];
      const result = await redisRequest('EXISTS', keys);
      return result.result;
    },

    async expire(key: string, seconds: number): Promise<void> {
      await redisRequest('EXPIRE', [key, seconds]);
    },

    async ttl(key: string): Promise<number> {
      const result = await redisRequest('TTL', [key]);
      return result.result;
    },

    async keys(pattern: string): Promise<string[]> {
      const result = await redisRequest('KEYS', [pattern]);
      return result.result || [];
    },

    // Number operations
    async incr(key: string): Promise<number> {
      const result = await redisRequest('INCR', [key]);
      return result.result;
    },

    async decr(key: string): Promise<number> {
      const result = await redisRequest('DECR', [key]);
      return result.result;
    },

    // Hash operations
    async hget(key: string, field: string): Promise<string | null> {
      const result = await redisRequest('HGET', [key, field]);
      return result.result;
    },

    async hset(key: string, field: string, value: string): Promise<number> {
      const result = await redisRequest('HSET', [key, field, value]);
      return result.result;
    },

    async hgetall(key: string): Promise<Record<string, string>> {
      const result = await redisRequest('HGETALL', [key]);
      return result.result || {};
    },

    async hdel(key: string, field: string | string[]): Promise<number> {
      const fields = Array.isArray(field) ? field : [field];
      const result = await redisRequest('HDEL', [key, ...fields]);
      return result.result;
    },

    // Set operations
    async sadd(key: string, members: string | string[]): Promise<number> {
      const values = Array.isArray(members) ? members : [members];
      const result = await redisRequest('SADD', [key, ...values]);
      return result.result;
    },

    async smembers(key: string): Promise<string[]> {
      const result = await redisRequest('SMEMBERS', [key]);
      return result.result || [];
    },

    async srem(key: string, members: string | string[]): Promise<number> {
      const values = Array.isArray(members) ? members : [members];
      const result = await redisRequest('SREM', [key, ...values]);
      return result.result;
    },

    // List operations
    async lpush(key: string, values: string | string[]): Promise<number> {
      const vals = Array.isArray(values) ? values : [values];
      const result = await redisRequest('LPUSH', [key, ...vals]);
      return result.result;
    },

    async rpush(key: string, values: string | string[]): Promise<number> {
      const vals = Array.isArray(values) ? values : [values];
      const result = await redisRequest('RPUSH', [key, ...vals]);
      return result.result;
    },

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
      const result = await redisRequest('LRANGE', [key, start.toString(), stop.toString()]);
      return result.result || [];
    },

    async llen(key: string): Promise<number> {
      const result = await redisRequest('LLEN', [key]);
      return result.result;
    },
  };
}

/**
 * Singleton Redis client instance
 */
let redisClientInstance: RedisClient | null = null;

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClient {
  if (!redisClientInstance) {
    redisClientInstance = createRedisClient();
  }
  return redisClientInstance;
}

/**
 * Health check for Redis connection
 */
export async function redisHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  details?: any;
}> {
  try {
    const client = getRedisClient();
    const result = await client.get('health:check');
    
    // If health key doesn't exist, set it
    if (result === null) {
      await client.set('health:check', 'ok', { ex: 60 });
    }
    
    return {
      status: 'healthy',
      message: 'Redis connection is active',
    };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Close Redis client connection
 */
export function closeRedisClient(): void {
  redisClientInstance = null;
}

