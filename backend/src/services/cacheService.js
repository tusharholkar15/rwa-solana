const redis = require("../config/redis");
const logger = require("../config/logger");

/**
 * High-performance Cache Service
 * Wraps Redis with automated stats, error handling, and a 'wrap' pattern for cache-aside.
 */
class CacheService {
  constructor() {
    this.redis = redis;
  }

  /**
   * Universal 'Cache-Aside' Wrapper
   * @param {string} key Cache key
   * @param {number} ttl Seconds to live
   * @param {Function} fetchFn Function to call if cache misses
   */
  async wrap(key, ttl, fetchFn) {
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      const data = await fetchFn();
      if (data !== undefined && data !== null) {
        await this.redis.set(key, JSON.stringify(data), "EX", ttl);
      }
      return data;
    } catch (err) {
      logger.error({ key, error: err.message }, "[CacheService] Wrap failure, falling back to fetchFn");
      return fetchFn();
    }
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      return await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      logger.error({ key, error: err.message }, "[CacheService] Set failed");
      return false;
    }
  }

  async get(key) {
    try {
      const result = await this.redis.get(key);
      return result ? JSON.parse(result) : null;
    } catch (err) {
      logger.error({ key, error: err.message }, "[CacheService] Get failed");
      return null;
    }
  }

  async del(key) {
    try {
      return await this.redis.del(key);
    } catch (err) {
      logger.error({ key, error: err.message }, "[CacheService] Del failed");
      return 0;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        return await this.redis.del(...keys);
      }
      return 0;
    } catch (err) {
      logger.error({ pattern, error: err.message }, "[CacheService] InvalidatePattern failed");
      return 0;
    }
  }
}

module.exports = new CacheService();
