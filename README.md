# URL Shortener

A URL shortener API with click statistics, built with **Node.js**, **Express**, **PostgreSQL** and **Redis**.

## Features

- Short links with random base62 codes or a **custom alias**
- Optional **expiration** (`410 Gone` after it expires)
- **302 redirects** that record every click (date, referrer, user agent)
- **Statistics** per link: total clicks, last click, clicks per day (SQL `GROUP BY`)
- **Redis cache** (cache-aside) so popular links don't hit the database on every redirect
- **Rate limiting** backed by Redis (shared across instances), with `429` and `Retry-After`
- Input validation and a centralized error handler
- **Dependency injection**: the app receives its repository and cache, so tests run with in-memory fakes (no database needed)
- Docker Compose (API + PostgreSQL + Redis), CI with GitHub Actions, graceful shutdown

## Tech stack

Node.js 22 · Express 5 · PostgreSQL 16 (`pg`) · Redis 7 (`ioredis`) · Jest · Supertest · ESLint · Docker

## Architecture

```
Request ─► Express routes (app.js)
              │  validation.js, rateLimit.js
              ▼
         linkService.js  ── business logic
           │        │
           ▼        ▼
  linkRepository   redisCache
   (PostgreSQL)     (Redis)
```

Redirect flow: look in Redis → if missing, read PostgreSQL and cache it → check expiration → record the click → `302`.

## Getting started

```bash
docker compose up --build
```

The API runs at http://localhost:3000.

Without Docker (you need PostgreSQL and Redis running):

```bash
cp .env.example .env    # then export the variables or use a tool like dotenv
npm install
npm run migrate
npm run dev
```

## Tests

```bash
npm test        # Jest + coverage (no database needed)
npm run lint
```

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/links` | Create a short link `{ url, alias?, expiresInDays? }` (rate limited) |
| GET | `/:code` | Redirect to the original URL |
| GET | `/api/links/:code/stats` | Click statistics |
| DELETE | `/api/links/:code` | Delete a link (and clear its cache entry) |
| GET | `/health` | Health check |

### Example

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/dondi213", "alias": "jose", "expiresInDays": 30}'

curl -i http://localhost:3000/jose            # 302 Location: https://github.com/dondi213
curl http://localhost:3000/api/links/jose/stats
```

## Design decisions

- **`ON CONFLICT DO NOTHING`** detects taken codes atomically in the database, instead of "check then insert" (which has a race condition).
- **Cache invalidation on delete**: deleting a link also removes it from Redis so it stops redirecting immediately.
- **Fixed-window rate limit in Redis** (`INCR` + `EXPIRE` in one `MULTI`): simple, and works with several API instances.
- **Only `http`/`https` URLs are accepted**, which blocks `javascript:` links.
