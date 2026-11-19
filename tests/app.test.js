const request = require('supertest');
const { createApp } = require('../src/app');
const { createFakeRepo, createFakeCache } = require('./fakes');

const testConfig = {
  baseUrl: 'http://sho.rt',
  cacheTtlSeconds: 60,
  rateLimit: { windowSeconds: 60, maxRequests: 3 },
};

let repo;
let cache;
let app;

beforeEach(() => {
  repo = createFakeRepo();
  cache = createFakeCache();
  app = createApp({ repo, cache, config: testConfig });
});

const createLink = (body) => request(app).post('/api/links').send(body);

describe('POST /api/links', () => {
  test('creates a link with a random 7-char code', async () => {
    const res = await createLink({ url: 'https://example.com/a/very/long/path' });

    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[0-9a-zA-Z]{7}$/);
    expect(res.body.shortUrl).toBe(`http://sho.rt/${res.body.code}`);
    expect(res.body.expiresAt).toBeNull();
  });

  test('accepts a custom alias and expiration', async () => {
    const res = await createLink({ url: 'https://example.com', alias: 'my-link', expiresInDays: 7 });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('my-link');
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('rejects a duplicated alias with 409', async () => {
    await createLink({ url: 'https://example.com', alias: 'taken' });
    const res = await createLink({ url: 'https://other.com', alias: 'taken' });
    expect(res.status).toBe(409);
  });

  test.each([
    [{ url: 'not-a-url' }],
    [{ url: 'ftp://example.com' }],
    [{ url: 'javascript:alert(1)' }],
    [{}],
    [{ url: 'https://example.com', alias: 'a' }],
    [{ url: 'https://example.com', alias: 'api' }],
    [{ url: 'https://example.com', expiresInDays: 0 }],
    [{ url: 'https://example.com', expiresInDays: 'ten' }],
  ])('rejects invalid input %j with 400', async (body) => {
    const res = await createLink(body);
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Content-Type', 'application/json')
      .send('{"url": ');
    expect(res.status).toBe(400);
  });

  test('applies rate limiting (429 after the limit)', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await createLink({ url: 'https://example.com' })).status).toBe(201);
    }
    const res = await createLink({ url: 'https://example.com' });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('60');
  });
});

describe('GET /:code', () => {
  test('redirects with 302 and records the click', async () => {
    await createLink({ url: 'https://example.com', alias: 'go' });

    const res = await request(app).get('/go').set('User-Agent', 'jest');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
    expect(repo.clicks).toHaveLength(1);
    expect(repo.clicks[0].userAgent).toBe('jest');
  });

  test('stores the link in the cache after the first visit', async () => {
    await createLink({ url: 'https://example.com', alias: 'cached' });
    await request(app).get('/cached');
    expect(cache.store.has('link:cached')).toBe(true);
  });

  test('returns 404 for an unknown code', async () => {
    expect((await request(app).get('/nope123')).status).toBe(404);
  });

  test('returns 410 for an expired link', async () => {
    await repo.create({ code: 'old', url: 'https://example.com', expiresAt: new Date(Date.now() - 1000) });
    expect((await request(app).get('/old')).status).toBe(410);
  });
});

describe('stats and delete', () => {
  test('returns click statistics', async () => {
    await createLink({ url: 'https://example.com', alias: 'stats' });
    await request(app).get('/stats');
    await request(app).get('/stats');

    const res = await request(app).get('/api/links/stats/stats');

    expect(res.status).toBe(200);
    expect(res.body.clicks).toBe(2);
    expect(res.body.clicksByDay).toEqual([{ day: expect.any(String), count: 2 }]);
  });

  test('stats for an unknown code returns 404', async () => {
    expect((await request(app).get('/api/links/nope/stats')).status).toBe(404);
  });

  test('deletes a link and clears it from the cache', async () => {
    await createLink({ url: 'https://example.com', alias: 'bye' });
    await request(app).get('/bye'); // fills the cache

    expect((await request(app).delete('/api/links/bye')).status).toBe(204);
    expect(cache.store.has('link:bye')).toBe(false);
    expect((await request(app).get('/bye')).status).toBe(404);
  });

  test('deleting an unknown link returns 404', async () => {
    expect((await request(app).delete('/api/links/nope')).status).toBe(404);
  });
});

test('GET /health', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
