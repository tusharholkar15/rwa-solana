const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") ? 0 : 10,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
  },
});

// ─── Performance Auditing Wrapper ──────────────────────────
const stats = {
  hits: 0,
  misses: 0,
  keysSet: 0,
  keysDeleted: 0,
  startTime: Date.now(),
};

const originalGet = redis.get.bind(redis);
const originalSet = redis.set.bind(redis);
const originalDel = redis.del.bind(redis);
const originalKeys = redis.keys.bind(redis);

redis.get = async (...args) => {
  try {
    const result = await originalGet(...args);
    if (result) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    return result;
  } catch (e) {
    console.error(`[Redis Get Error] ${e.message}`);
    return null;
  }
};

redis.set = async (...args) => {
  try {
    stats.keysSet++;
    return await originalSet(...args);
  } catch (e) {
    console.error(`[Redis Set Error] ${e.message}`);
    return null;
  }
};

redis.del = async (...args) => {
  try {
    stats.keysDeleted++;
    return await originalDel(...args);
  } catch (e) {
    console.error(`[Redis Del Error] ${e.message}`);
    return null;
  }
};

redis.keys = async (...args) => {
  try {
    return await originalKeys(...args) || [];
  } catch (e) {
    console.error(`[Redis Keys Error] ${e.message}`);
    return [];
  }
};

redis.getStats = () => ({
  ...stats,
  uptime: Math.floor((Date.now() - stats.startTime) / 1000),
  hitRate: stats.hits + stats.misses === 0 
    ? 0 
    : (stats.hits / (stats.hits + stats.misses)).toFixed(4),
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redis;
