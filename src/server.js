const Redis = require('ioredis');
const config = require('./config');
const pool = require('./db/pool');
const migrate = require('./migrate');
const { createApp } = require('./app');
const { createLinkRepository } = require('./repositories/linkRepository');
const { createRedisCache } = require('./cache/redisCache');

async function main() {
  await migrate();

  const redis = new Redis(config.redisUrl);
  const app = createApp({
    repo: createLinkRepository(pool),
    cache: createRedisCache(redis),
    config,
  });

  const server = app.listen(config.port, () => {
    console.log(`URL shortener listening on port ${config.port}`);
  });

  // Graceful shutdown: finish in-flight requests, then close connections.
  const shutdown = () => {
    server.close(async () => {
      await Promise.allSettled([pool.end(), redis.quit()]);
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
