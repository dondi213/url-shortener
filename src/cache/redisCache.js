/**
 * Thin wrapper over Redis. Same interface as the in-memory fake used in tests.
 */
function createRedisCache(redis) {
  return {
    async getJson(key) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },

    async setJson(key, value, ttlSeconds) {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    },

    async del(key) {
      await redis.del(key);
    },

    /** Increments a counter and sets its expiry on first use. Returns the new count. */
    async incrementWithExpiry(key, ttlSeconds) {
      const results = await redis.multi().incr(key).expire(key, ttlSeconds, 'NX').exec();
      return results[0][1];
    },

    async ping() {
      return (await redis.ping()) === 'PONG';
    },
  };
}

module.exports = { createRedisCache };
