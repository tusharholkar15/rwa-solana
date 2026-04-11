/**
 * Redis Cache Service Simulator
 * High-performance data caching for AMM pools, governance states, and fast chart loads.
 */

class CacheService {
  constructor() {
    this.store = new Map();
  }

  async set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value: JSON.stringify(value), expiresAt });
    return true;
  }

  async get(key) {
    const record = this.store.get(key);
    if (!record) return null;
    
    if (Date.now() > record.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return JSON.parse(record.value);
  }

  async invalidate(key) {
    this.store.delete(key);
  }
}

module.exports = new CacheService();
