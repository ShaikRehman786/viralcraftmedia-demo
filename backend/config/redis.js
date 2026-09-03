import { config } from './env.js';

let redisClient = null;
let redisAvailable = false;
let initAttempted = false;

// Safe logger - never log REDIS_URL or credentials
function logRedis(msg) {
  console.log(`[Redis] ${msg}`);
}
function logRedisWarn(msg) {
  console.warn(`[Redis] ${msg}`);
}
function logRedisError(msg) {
  console.error(`[Redis] ${msg}`);
}

/**
 * Centralized Redis client - single connection, lazy init, graceful fallback
 * If REDIS_URL not set or connection fails, CRM continues via MongoDB
 */
async function getRedisClient() {
  if (redisClient && redisAvailable) return redisClient;
  if (initAttempted && !redisClient) return null;

  const redisUrl = config.redisUrl;
  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    initAttempted = true;
    try {
      const { default: Redis } = await import('ioredis');
      const isTls = redisUrl.startsWith('rediss://');
      redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
        reconnectOnError(err) {
          const msg = err.message || '';
          if (msg.includes('READONLY')) return true;
          return false;
        },
        tls: isTls ? {} : undefined,
        enableOfflineQueue: false,
        connectTimeout: 3000,
      });

      redisClient.on('connect', () => logRedis('Connecting...'));
      redisClient.on('ready', () => {
        redisAvailable = true;
        logRedis('Ready');
      });
      redisClient.on('error', (err) => {
        redisAvailable = false;
        logRedisWarn(`Error: ${err.message}`);
      });
      redisClient.on('close', () => {
        redisAvailable = false;
      });
      redisClient.on('end', () => {
        redisAvailable = false;
      });

      await redisClient.connect().catch((err) => {
        logRedisWarn(`Connection failed: ${err.message} - falling back to MongoDB`);
        redisAvailable = false;
        return null;
      });

      if (redisClient.status === 'ready') {
        redisAvailable = true;
      }
    } catch (err) {
      logRedisWarn(`Init failed: ${err.message} - continuing without Redis`);
      redisClient = null;
      redisAvailable = false;
    }
  }

  return redisAvailable ? redisClient : null;
}

export function isRedisAvailable() {
  return redisAvailable && redisClient && redisClient.status === 'ready';
}

export async function safeGet(key) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function safeSet(key, value, ttlSeconds) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export async function safeDel(patternOrKey) {
  try {
    const client = await getRedisClient();
    if (!client) return 0;
    // Support pattern deletion via SCAN (avoid KEYS)
    if (patternOrKey.includes('*')) {
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', patternOrKey, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) {
          await client.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
      return deleted;
    }
    return await client.del(patternOrKey);
  } catch {
    return 0;
  }
}

export async function safeIncr(key, ttlSeconds) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const val = await client.incr(key);
    if (val === 1 && ttlSeconds) {
      await client.expire(key, ttlSeconds);
    }
    return val;
  } catch {
    return null;
  }
}

// Graceful shutdown
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {}
    redisClient = null;
    redisAvailable = false;
  }
}

// For rate-limit-redis store
export async function getRedisForRateLimit() {
  const client = await getRedisClient();
  return isRedisAvailable() ? client : null;
}

export default {
  getRedisClient,
  isRedisAvailable,
  safeGet,
  safeSet,
  safeDel,
  safeIncr,
  closeRedis,
  getRedisForRateLimit,
};
