const config = {
  port: Number(process.env.PORT) || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgres://shortener:shortener@localhost:5432/shortener',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS) || 3600,
  rateLimit: {
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 60,
    maxRequests: Number(process.env.RATE_LIMIT_MAX) || 10,
  },
};

module.exports = config;
