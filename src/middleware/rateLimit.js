/**
 * Fixed-window rate limiter backed by Redis, so the limit is shared by every API instance.
 */
function rateLimit({ cache, windowSeconds, maxRequests, prefix = 'ratelimit' }) {
  return async (req, res, next) => {
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `${prefix}:${req.ip}:${window}`;
    const count = await cache.incrementWithExpiry(key, windowSeconds);

    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));

    if (count > maxRequests) {
      res.set('Retry-After', String(windowSeconds));
      return res.status(429).json({ error: 'Too many requests, try again later' });
    }
    return next();
  };
}

module.exports = { rateLimit };
