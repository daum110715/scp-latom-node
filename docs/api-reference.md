# API Reference

Base URL: `https://api.scp.lat`

All endpoints under `/api/*` return JSON with the following shape:

```jsonc
// Success
{ "success": true, /* ...data */ }

// Error
{ "success": false, "error": "message" }
```

## Authentication

### POST `/api/auth/register`

Create a new user account.

**Request body:**

```json
{
  "codename": "string",
  "password": "string"
}
```

**Validation:**

- `codename`: 3-32 characters, alphanumeric and underscore only (`/^[a-zA-Z0-9_]{3,32}$/`)
- `password`: 8-128 characters

**Response `201`:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "codename": "agent_smith",
    "role": "personnel",
    "clearance": 1,
    "created_at": "2026-06-26T00:00:00"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid codename or password format |
| 409 | Codename already taken |
| 500 | Registration failed (database error) |

---

### POST `/api/auth/login`

Authenticate an existing user.

**Request body:**

```json
{
  "codename": "string",
  "password": "string"
}
```

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "codename": "agent_smith",
    "role": "personnel",
    "clearance": 1,
    "created_at": "2026-06-26T00:00:00"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing codename or password |
| 401 | Invalid credentials |

---

### GET `/api/auth/me`

Get the current user's profile. Requires authentication.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "codename": "agent_smith",
    "role": "personnel",
    "clearance": 1,
    "created_at": "2026-06-26T00:00:00"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 401 | Missing or invalid token |
| 404 | User not found |

---

### PUT `/api/auth/profile`

Update the current user's profile. Requires authentication.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Request body (all fields optional):**

```json
{
  "codename": "string",
  "password": "string",
  "newPassword": "string"
}
```

**Behavior:**

- To change **codename**: provide `codename`
- To change **password**: provide `password` (current) and `newPassword`
- Both can be changed in a single request

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "codename": "new_codename",
    "role": "personnel",
    "clearance": 1,
    "created_at": "2026-06-26T00:00:00"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Validation error (codename format, password length, missing current password) |
| 401 | Current password incorrect |
| 404 | User not found |
| 409 | Codename already taken |
| 500 | Update failed (database error) |

---

## Crawler

The crawler system uses [Durable Objects](https://developers.cloudflare.com/durable-objects/) to crawl the SCP Foundation wiki index pages. Two separate DO instances handle the English and Chinese wikis independently.

### GET `/api/crawler/status`

Get crawl status for both languages. No authentication required.

**Response `200`:**

```json
{
  "success": true,
  "en": {
    "status": "idle",
    "lastCrawl": 1719400000000,
    "totalEntries": 7999
  },
  "cn": {
    "status": "idle",
    "lastCrawl": 1719400000000,
    "totalEntries": 5200
  }
}
```

---

### GET `/api/crawler/:lang/status`

Get crawl status for a specific language. No authentication required. Includes incremental crawl progress.

**Parameters:**

- `lang` — Language code: `en` or `cn`

**Response `200`:**

```json
{
  "success": true,
  "language": "en",
  "state": {
    "status": "idle",
    "lastCrawl": 1719400000000,
    "totalEntries": 7999
  },
  "incremental": {
    "nextSeries": 3,
    "seriesLastCrawl": {
      "1": 1719400000000,
      "2": 1719400000000
    }
  }
}
```

The `incremental` field shows which series will be crawled next (0-based index) and when each series was last updated. The alarm cycles through all 8 series over 8 days.

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid language (must be `en` or `cn`) |

---

### GET `/api/crawler/:lang/entries`

Get crawled entries with optional filtering and pagination. No authentication required.

**Parameters:**

- `lang` — Language code: `en` or `cn`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `class` | string | — | Filter by object class (Safe, Euclid, Keter, etc.) |
| `q` | string | — | Search by SCP number or name |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max: 200) |

**Response `200`:**

```json
{
  "success": true,
  "language": "en",
  "entries": [
    {
      "scpNumber": 999,
      "name": "\"Tickle Monster\"",
      "objectClass": "Safe",
      "url": "https://scp-wiki.wikidot.com/scp-999",
      "series": 1
    }
  ],
  "total": 1234,
  "page": 1,
  "limit": 50,
  "totalPages": 25,
  "state": {
    "status": "idle",
    "lastCrawl": 1719400000000,
    "totalEntries": 7999
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid language |
| 503 | Durable Object unavailable |

---

### GET `/api/crawler/:lang/series/:n`

Get entries for a specific series (1-8). No authentication required.

**Parameters:**

- `lang` — Language code: `en` or `cn`
- `n` — Series number (1-8). Series 1 = SCP-001 to SCP-999, Series 2 = SCP-1000 to SCP-1999, etc.

**Response `200`:**

```json
{
  "success": true,
  "language": "en",
  "series": 1,
  "entries": [ ... ],
  "total": 999
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid language or series number |

---

### POST `/api/crawler/:lang/crawl`

Trigger a new crawl for a specific language. No authentication required. Returns immediately while the crawl runs in the background.

**Parameters:**

- `lang` — Language code: `en` or `cn`

**Response `200`:**

```json
{
  "success": true,
  "language": "en",
  "message": "Crawl triggered",
  "state": {
    "status": "crawling",
    "lastCrawl": 0,
    "totalEntries": 0
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid language |
| 409 | Crawl already in progress |
| 503 | Durable Object unavailable |

---

### Crawler Data Types

#### `CrawlEntry`

```ts
interface CrawlEntry {
  scpNumber: number      // SCP designation number (e.g., 173)
  name: string           // Entry name (e.g., "The Sculpture")
  objectClass: string    // Object class (Safe, Euclid, Keter, etc.)
  url: string            // Full URL to wiki page
  series: number         // Series number (1-8)
}
```

#### `CrawlState`

```ts
interface CrawlState {
  status: 'idle' | 'crawling' | 'error'
  lastCrawl: number      // Unix timestamp (ms) of last successful crawl
  totalEntries: number   // Total entries in cache
  error?: string         // Error message (only when status is 'error')
}
```

#### Incremental Crawl Info

Returned by `GET /api/crawler/:lang/status`:

```ts
interface IncrementalInfo {
  nextSeries: number                    // Next series index to crawl (0-based)
  seriesLastCrawl: Record<number, number> // Series number → last crawl timestamp (ms)
}
```

The incremental system crawls 1 series page per alarm cycle (every 24 hours). All 8 series are refreshed over 8 days. Manual triggers (`POST /api/crawler/:lang/crawl`) always perform a full crawl of all series.

---

## Health Check

### GET `/api/health`

Service health check. No authentication required.

**Response `200`:**

```json
{
  "success": true,
  "status": "ok",
  "service": "scp-latom-node-api",
  "timestamp": "2026-06-26T00:00:00.000Z"
}
```

---

## Data Types

### `UserPublic`

Returned by all authenticated endpoints. Excludes the password hash.

```ts
interface UserPublic {
  id: number
  codename: string
  role: string
  clearance: number
  created_at?: string
}
```

### JWT Payload

Decoded from the `token` returned by login/register endpoints.

```ts
interface JwtPayload {
  sub: number        // user ID
  codename: string
  role: string
  clearance: number
  exp: number        // expiry timestamp (24h from issuance)
}
```

**Details:**

- Algorithm: HS256 (via jose library)
- Expiry: 24 hours
- Signing secret: `JWT_SECRET` environment variable in `wrangler.toml`

---

## Error Codes

The frontend maps HTTP status codes to themed SCP error codes:

| HTTP Status | Error Code | Description |
| ----------- | ---------- | ----------- |
| 400 | `ERR-400-REQUEST` | Bad request |
| 401 | `ERR-401-CLEARANCE` | Unauthorized |
| 403 | `ERR-403-ACCESS` | Forbidden |
| 404 | `ERR-404-RESOURCE` | Not found |
| 409 | `ERR-409-CONFLICT` | Conflict (e.g., duplicate codename) |
| 429 | `ERR-429-THROTTLE` | Rate limited |
| 500 | `ERR-500-SYSTEM` | Internal server error |
| 502/503/504 | `ERR-503-MAINTENANCE` | Service unavailable |

These codes are resolved to i18n-translated messages via `src/services/errors.ts`. See the [i18n Guide](i18n.md) for translation details.
