import rateLimit from 'express-rate-limit';
import { getRedisForRateLimit } from '../config/redis.js';

// Build Redis stores synchronously at import time (top-level await) so limiters are constructed with correct store from the beginning.
// If Redis unavailable, store remains undefined -> MemoryStore (fail-safe, never disables). No new connection per request.
let redisApiStore;
let redisAuthStore;
let redisWebhookStore;
try {
  const redisClient = await getRedisForRateLimit();
  if (redisClient) {
    const { RedisStore } = await import('rate-limit-redis');
    redisApiStore = new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix: 'rl:api:' });
    redisAuthStore = new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix: 'rl:auth:' });
    redisWebhookStore = new RedisStore({ sendCommand: (...args) => redisClient.call(...args), prefix: 'rl:webhook:' });
  }
} catch {
  // Redis unavailable -> remain on MemoryStore (secure fallback)
}

// Standard rate limiter for generic API requests
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  store: redisApiStore,
});

// Stricter rate limiter for authentication routes (login, register, forgot-password)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // limit each IP to 15 login/auth attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again in an hour'
  },
  store: redisAuthStore,
});

// Webhook rate limiter - strict to prevent flooding and replay abuse
export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // limit each IP to 30 webhook calls per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many webhook requests, please try again later'
  },
  store: redisWebhookStore,
});
