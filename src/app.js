const express = require('express');
const { createLinkService } = require('./services/linkService');
const { validateCreateLink } = require('./validation');
const { rateLimit } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * Builds the Express app from its dependencies (dependency injection).
 * server.js passes real PostgreSQL/Redis; tests pass in-memory fakes.
 */
function createApp({ repo, cache, config }) {
  const app = express();
  const links = createLinkService({ repo, cache, cacheTtlSeconds: config.cacheTtlSeconds });

  app.set('trust proxy', 1); // correct client IP behind a load balancer
  app.use(express.json({ limit: '10kb' }));

  const toResponse = (link) => ({
    code: link.code,
    shortUrl: `${config.baseUrl}/${link.code}`,
    url: link.url,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  });

  app.get('/health', async (req, res) => {
    const cacheOk = await cache.ping().catch(() => false);
    res.status(cacheOk ? 200 : 503).json({ status: cacheOk ? 'ok' : 'degraded', cache: cacheOk });
  });

  app.post(
    '/api/links',
    rateLimit({ cache, ...config.rateLimit }),
    async (req, res) => {
      const data = validateCreateLink(req.body);
      const link = await links.create(data);
      res.status(201).json(toResponse(link));
    },
  );

  app.get('/api/links/:code/stats', async (req, res) => {
    const stats = await links.stats(req.params.code);
    res.json({
      ...toResponse(stats),
      clicks: stats.clicks,
      lastClickAt: stats.lastClickAt,
      clicksByDay: stats.clicksByDay,
    });
  });

  app.delete('/api/links/:code', async (req, res) => {
    await links.remove(req.params.code);
    res.status(204).end();
  });

  app.get('/:code', async (req, res) => {
    const link = await links.resolve(req.params.code);
    await links.registerClick(link, {
      referrer: req.get('referer') || null,
      userAgent: req.get('user-agent') || null,
    });
    res.redirect(302, link.url);
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
