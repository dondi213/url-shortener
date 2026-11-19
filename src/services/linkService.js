const { generateCode } = require('../utils/code');
const { HttpError } = require('../utils/errors');

const MAX_CODE_ATTEMPTS = 5;
const cacheKey = (code) => `link:${code}`;

/**
 * Business logic. Receives its dependencies (repository + cache) instead of importing them,
 * which keeps it easy to test.
 */
function createLinkService({ repo, cache, cacheTtlSeconds }) {
  async function create({ url, alias, expiresAt }) {
    if (alias) {
      const link = await repo.create({ code: alias, url, expiresAt });
      if (!link) throw new HttpError(409, 'Alias already in use');
      return link;
    }

    // Random codes can collide (very rarely): retry with a new one.
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const link = await repo.create({ code: generateCode(), url, expiresAt });
      if (link) return link;
    }
    throw new HttpError(503, 'Could not generate a unique code, try again');
  }

  /** Cache-aside: read from Redis first, fall back to PostgreSQL and store the result. */
  async function resolve(code) {
    let link = await cache.getJson(cacheKey(code));
    if (!link) {
      link = await repo.findByCode(code);
      if (!link) throw new HttpError(404, 'Link not found');
      await cache.setJson(cacheKey(code), link, cacheTtlSeconds);
    }

    if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
      throw new HttpError(410, 'Link has expired');
    }
    return link;
  }

  async function registerClick(link, { referrer, userAgent }) {
    await repo.recordClick(link.id, { referrer, userAgent });
  }

  async function stats(code) {
    const link = await repo.findByCode(code);
    if (!link) throw new HttpError(404, 'Link not found');
    return { ...link, ...(await repo.getStats(link.id)) };
  }

  async function remove(code) {
    const deleted = await repo.deleteByCode(code);
    if (!deleted) throw new HttpError(404, 'Link not found');
    await cache.del(cacheKey(code)); // keep cache consistent with the DB
  }

  return { create, resolve, registerClick, stats, remove };
}

module.exports = { createLinkService };
