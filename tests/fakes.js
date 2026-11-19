/** In-memory fakes with the same interface as the PostgreSQL repository and Redis cache. */

function createFakeRepo() {
  const links = new Map(); // code -> link
  const clicks = []; // { linkId, clickedAt }
  let nextId = 1;

  return {
    links,
    clicks,
    async create({ code, url, expiresAt }) {
      if (links.has(code)) return null;
      const link = { id: nextId++, code, url, createdAt: new Date(), expiresAt };
      links.set(code, link);
      return link;
    },
    async findByCode(code) {
      return links.get(code) || null;
    },
    async recordClick(linkId, { referrer, userAgent }) {
      clicks.push({ linkId, referrer, userAgent, clickedAt: new Date() });
    },
    async getStats(linkId) {
      const own = clicks.filter((c) => c.linkId === linkId);
      const byDay = {};
      for (const c of own) {
        const day = c.clickedAt.toISOString().slice(0, 10);
        byDay[day] = (byDay[day] || 0) + 1;
      }
      return {
        clicks: own.length,
        lastClickAt: own.length ? own[own.length - 1].clickedAt : null,
        clicksByDay: Object.entries(byDay).map(([day, count]) => ({ day, count })),
      };
    },
    async deleteByCode(code) {
      return links.delete(code);
    },
  };
}

function createFakeCache() {
  const store = new Map();
  return {
    store,
    async getJson(key) {
      return store.has(key) ? JSON.parse(store.get(key)) : null;
    },
    async setJson(key, value) {
      store.set(key, JSON.stringify(value));
    },
    async del(key) {
      store.delete(key);
    },
    async incrementWithExpiry(key) {
      const count = (store.get(key) || 0) + 1;
      store.set(key, count);
      return count;
    },
    async ping() {
      return true;
    },
  };
}

module.exports = { createFakeRepo, createFakeCache };
