import Redis from 'ioredis';

const redisClient =
  process.env.REDIS_URL && process.env.NODE_ENV === 'production'
    ? new Redis(process.env.REDIS_URL)
    : undefined;

export { redisClient };


