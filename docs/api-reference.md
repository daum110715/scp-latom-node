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

Get crawl status for both languages with class distribution. No authentication required.

**Response `200`:**

```json
{
  "success": true,
  "en": { "status": "idle", "lastCrawl": 1719400000000, "totalEntries": 7999 },
  "cn": { "status": "idle", "lastCrawl": 1719400000000, "totalEntries": 5200 },
  "enClassDistribution": { "Safe": 2500, "Euclid": 3000, "Keter": 1500 },
  "cnClassDistribution": { "Safe": 1800, "Euclid": 2000, "Keter": 1000 }
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

### GET `/api/crawler/:lang/entry/:scpNumber`

Get the full content of a specific SCP entry. No authentication required.

**Parameters:**

- `lang` — Language code: `en` or `cn`
- `scpNumber` — SCP designation number (e.g., 173)

**Response `200`:**

If content is cached in D1, returns it immediately. Otherwise triggers a background fetch and returns a pending status. The client should poll until status is `"cached"` or `"fetched"`.

```json
{
  "success": true,
  "status": "cached",
  "content": { ... }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid language or SCP number |

---

### POST `/api/crawler/:lang/crawl`

Trigger a new crawl for a specific language. No authentication required. Returns immediately while the crawl runs in the background.

**Parameters:**

- `lang` — Language code: `en` or `cn`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `limit` | number | 0 | Max entries to collect (0 = unlimited) |

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

## History

All history endpoints require authentication.

### GET `/api/history`

Get the user's browsing history with pagination.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max: 200) |
| `lang` | string | — | Filter by language (`en` or `cn`) |

**Response `200`:**

```json
{
  "success": true,
  "entries": [
    {
      "id": 1,
      "user_id": 1,
      "language": "en",
      "scp_number": 173,
      "name": "The Sculpture",
      "object_class": "Euclid",
      "visited_at": "2026-06-26T00:00:00"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

### POST `/api/history`

Record a browsing history entry.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body:**

```json
{
  "language": "en",
  "scpNumber": 173,
  "name": "The Sculpture",
  "objectClass": "Euclid"
}
```

**Response `200`:**

```json
{ "success": true }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid parameters |

---

### DELETE `/api/history/:id`

Delete a specific history entry.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{ "success": true }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid id |
| 404 | Entry not found |

---

### DELETE `/api/history`

Clear all browsing history for the current user.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{ "success": true }
```

---

## Bookmarks

All bookmark endpoints require authentication.

### GET `/api/bookmarks`

Get all bookmarks for the current user.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{
  "success": true,
  "bookmarks": [
    {
      "scpNumber": 173,
      "language": "en",
      "name": "The Sculpture",
      "objectClass": "Euclid",
      "createdAt": "2026-06-26T00:00:00"
    }
  ]
}
```

---

### GET `/api/bookmarks/:lang/:scpNumber`

Check if an entry is bookmarked.

**Headers:** `Authorization: Bearer <jwt-token>`

**Parameters:**

- `lang` — Language code: `en` or `cn`
- `scpNumber` — SCP designation number

**Response `200`:**

```json
{ "success": true, "bookmarked": true }
```

---

### POST `/api/bookmarks/:lang/:scpNumber`

Add a bookmark.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `201`:**

```json
{ "success": true, "message": "Bookmark added" }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 409 | Entry already bookmarked |

---

### DELETE `/api/bookmarks/:lang/:scpNumber`

Remove a bookmark.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{ "success": true, "message": "Bookmark removed" }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Bookmark not found |

---

## Proposals

GET endpoints are public (optional auth for `userVote`). POST endpoints require authentication.

### GET `/api/proposals`

List proposals with optional filtering.

**Headers (optional):** `Authorization: Bearer <jwt-token>`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 50) |
| `status` | string | `"open"` | Filter by status (`open`, `approved`, `rejected`) |
| `category` | string | — | Filter by category (`protocol`, `research`, `containment`, `general`) |

**Response `200`:**

```json
{
  "success": true,
  "proposals": [
    {
      "id": 1,
      "title": "New containment protocol",
      "content": "Proposal content...",
      "category": "protocol",
      "status": "open",
      "authorCodename": "agent_smith",
      "votesFor": 5,
      "votesAgainst": 2,
      "votesAbstain": 1,
      "userVote": "for",
      "createdAt": "2026-06-26T00:00:00",
      "updatedAt": "2026-06-26T00:00:00"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "dailyUsed": 1,
  "dailyLimit": 2
}
```

---

### GET `/api/proposals/:id`

Get a single proposal by ID.

**Headers (optional):** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{
  "success": true,
  "proposal": {
    "id": 1,
    "title": "New containment protocol",
    "content": "Proposal content...",
    "category": "protocol",
    "status": "open",
    "authorCodename": "agent_smith",
    "votesFor": 5,
    "votesAgainst": 2,
    "votesAbstain": 1,
    "userVote": null,
    "createdAt": "2026-06-26T00:00:00",
    "updatedAt": "2026-06-26T00:00:00"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Invalid proposal ID |
| 404 | Proposal not found |

---

### POST `/api/proposals`

Create a new proposal. Limited to 2 proposals per day per user.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body:**

```json
{
  "title": "New containment protocol",
  "content": "Detailed proposal content...",
  "category": "protocol"
}
```

**Validation:**

- `title`: 5-200 characters
- `content`: 20-10,000 characters
- `category`: one of `protocol`, `research`, `containment`, `general` (default: `general`)

**Response `201`:**

```json
{
  "success": true,
  "proposal": {
    "id": 1,
    "title": "New containment protocol",
    "content": "Detailed proposal content...",
    "category": "protocol",
    "status": "open",
    "authorCodename": "agent_smith",
    "votesFor": 0,
    "votesAgainst": 0,
    "votesAbstain": 0,
    "userVote": null,
    "createdAt": "2026-06-26T00:00:00",
    "updatedAt": "2026-06-26T00:00:00"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Validation error |
| 429 | Daily limit reached (2 proposals per day) |

---

### POST `/api/proposals/:id/vote`

Vote on a proposal. Votes cannot be changed once cast.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body:**

```json
{ "vote": "for" }
```

`vote` must be one of: `for`, `against`, `abstain`

**Response `200`:**

```json
{
  "success": true,
  "message": "Vote recorded",
  "votesFor": 6,
  "votesAgainst": 2,
  "votesAbstain": 1,
  "userVote": "for"
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 400 | Voting is closed for this proposal |
| 409 | Already voted (votes cannot be changed) |

---

## Reports

All report endpoints require authentication.

### POST `/api/reports`

Submit an entry report.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body:**

```json
{
  "scpNumber": 173,
  "language": "en",
  "reportType": "content_error",
  "description": "The description contains a typo..."
}
```

**Validation:**

- `reportType`: one of `content_error`, `display_issue`, `special_handling`, `other`
- `description`: 10-2000 characters
- Max 3 reports per entry per user

**Response `201`:**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": 1,
    "scpNumber": 173,
    "language": "en",
    "reportType": "content_error",
    "description": "The description contains a typo...",
    "status": "pending",
    "createdAt": "2026-06-26T00:00:00"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | SCP entry not found |
| 409 | Already submitted this type of report for this entry |
| 429 | Max reports (3) reached for this entry |

---

### GET `/api/reports`

List the current user's reports.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 50) |

**Response `200`:**

```json
{
  "success": true,
  "reports": [
    {
      "id": 1,
      "scpNumber": 173,
      "language": "en",
      "reportType": "content_error",
      "description": "The description contains a typo...",
      "status": "pending",
      "createdAt": "2026-06-26T00:00:00",
      "name": "The Sculpture",
      "objectClass": "Euclid"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET `/api/reports/:id`

Get a specific report by ID.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{
  "success": true,
  "report": {
    "id": 1,
    "scpNumber": 173,
    "language": "en",
    "reportType": "content_error",
    "description": "The description contains a typo...",
    "status": "resolved",
    "adminNote": "Fixed in revision 42",
    "createdAt": "2026-06-26T00:00:00",
    "updatedAt": "2026-06-27T00:00:00",
    "name": "The Sculpture",
    "objectClass": "Euclid"
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Report not found |

---

### GET `/api/reports/check/:lang/:scpNumber`

Check existing reports for an entry.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{
  "success": true,
  "hasReports": true,
  "reports": [
    { "id": 1, "reportType": "content_error", "status": "pending" }
  ],
  "count": 1,
  "maxReports": 3
}
```

---

## AI Chat

All AI chat endpoints require authentication.

### POST `/api/ai/chat`

Send a message to the AI assistant. Supports streaming via SSE.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body:**

```json
{
  "message": "Tell me about SCP-173",
  "conversationId": "uuid-string",
  "systemPrompt": "You are an SCP Foundation assistant",
  "title": "SCP-173 Discussion",
  "stream": true
}
```

**Validation:**

- `message`: max 4000 characters
- `conversationId`: optional (creates new conversation if omitted)
- `stream`: optional, defaults to `false`

**Response (non-streaming) `200`:**

```json
{
  "success": true,
  "conversationId": "uuid-string",
  "message": { ... },
  "title": "SCP-173 Discussion"
}
```

**Response (streaming):** Returns `text/event-stream` SSE response.

**Errors:**

| Status | Condition |
| ------ | --------- |
| 502 | GLM API error |

---

### GET `/api/ai/conversations`

List the user's AI conversations.

**Headers:** `Authorization: Bearer <jwt-token>`

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 50) |

**Response `200`:**

```json
{
  "success": true,
  "conversations": [
    {
      "id": "uuid-string",
      "user_id": 1,
      "title": "SCP-173 Discussion",
      "system_prompt": "...",
      "message_count": 4,
      "last_message_at": "2026-06-26T00:00:00"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### GET `/api/ai/conversations/:id`

Get a conversation with all messages.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{
  "success": true,
  "conversation": {
    "id": "uuid-string",
    "user_id": 1,
    "title": "SCP-173 Discussion",
    "system_prompt": "...",
    "message_count": 4,
    "last_message_at": "2026-06-26T00:00:00",
    "messages": [ ... ]
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Conversation not found |

---

### PUT `/api/ai/conversations/:id`

Update conversation title or system prompt.

**Headers:** `Authorization: Bearer <jwt-token>`

**Request body (all fields optional):**

```json
{
  "title": "New title",
  "systemPrompt": "New system prompt"
}
```

**Response `200`:**

```json
{ "success": true }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Conversation not found |

---

### DELETE `/api/ai/conversations/:id`

Delete a conversation.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{ "success": true }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Conversation not found |

---

### POST `/api/ai/conversations/:id/regenerate`

Regenerate the last AI response in a conversation.

**Headers:** `Authorization: Bearer <jwt-token>`

**Response `200`:**

```json
{ "success": true, "message": { ... } }
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Conversation not found |
| 502 | GLM API error |

---

## Tags

All tag endpoints are public (no authentication required).

### GET `/api/tags`

Get all tag categories with their tags.

**Response `200`:**

```json
{
  "success": true,
  "categories": [
    {
      "id": "object-class",
      "name": "对象等级",
      "nameEn": "Object Class",
      "description": "SCP object classification",
      "sortOrder": 1,
      "tags": [
        {
          "id": "safe",
          "categoryId": "object-class",
          "name": "Safe",
          "nameZh": "安全",
          "description": "...",
          "aiKeywords": ["safe class"],
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

---

### GET `/api/tags/categories`

Get all tag categories (without tags).

**Response `200`:**

```json
{
  "success": true,
  "categories": [
    {
      "id": "object-class",
      "name": "对象等级",
      "nameEn": "Object Class",
      "description": "SCP object classification",
      "sortOrder": 1
    }
  ]
}
```

---

### GET `/api/tags/categories/:id`

Get a single category with its tags.

**Response `200`:**

```json
{
  "success": true,
  "category": {
    "id": "object-class",
    "name": "对象等级",
    "nameEn": "Object Class",
    "description": "SCP object classification",
    "sortOrder": 1,
    "tags": [ ... ]
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Category not found |

---

### GET `/api/tags/search`

Search tags by name.

**Query parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `q` | string | **Required.** Search query |

**Response `200`:**

```json
{
  "success": true,
  "tags": [ ... ],
  "total": 3
}
```

---

### GET `/api/tags/:id`

Get a single tag by ID.

**Response `200`:**

```json
{
  "success": true,
  "tag": {
    "id": "safe",
    "categoryId": "object-class",
    "name": "Safe",
    "nameZh": "安全",
    "description": "...",
    "aiKeywords": ["safe class"],
    "sortOrder": 1
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Tag not found |

---

### GET `/api/tags/:id/entries`

Get entries associated with a tag.

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 100) |
| `language` | string | — | Filter by language (`en` or `cn`) |

**Response `200`:**

```json
{
  "success": true,
  "entries": [
    {
      "scpNumber": 173,
      "language": "en",
      "name": "The Sculpture",
      "objectClass": "Euclid",
      "taggedAt": "2026-06-26T00:00:00"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | Tag not found |

---

### GET `/api/tags/entry/:scpNumber`

Get all tags for a specific SCP entry.

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `language` | string | `"en"` | Language code |

**Response `200`:**

```json
{
  "success": true,
  "scpNumber": 173,
  "language": "en",
  "tags": [
    {
      "id": "euclid",
      "categoryId": "object-class",
      "name": "Euclid",
      "nameZh": "Euclid",
      "description": "...",
      "aiKeywords": [],
      "sortOrder": 2
    }
  ],
  "grouped": {
    "object-class": [ ... ],
    "anomaly-type": [ ... ]
  }
}
```

---

## Logs

### POST `/api/logs`

Ingest client-side log entries. No authentication required (optional Bearer token for user tracking).

**Request body:**

```json
{
  "logs": [
    {
      "level": "warn",
      "message": "Slow API response",
      "context": { "duration": 3500, "endpoint": "/api/crawler/en/entries" },
      "timestamp": "2026-06-26T00:00:00.000Z",
      "path": "/catalog"
    }
  ]
}
```

**Validation:**

- Max 50 entries per request
- Only `warn` and `error` entries are persisted to D1; `debug`/`info` are silently discarded
- Message max 2000 characters

**Response `200`:**

```json
{ "success": true, "received": 5, "persisted": 2 }
```

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

## Admin

All admin endpoints require admin authentication (`adminMiddleware`). Returns 401 for missing/invalid token, 403 for non-admin users.

### Dashboard

#### GET `/api/admin/stats`

Get admin dashboard statistics.

**Response `200`:**

```json
{
  "success": true,
  "stats": {
    "totalUsers": 150,
    "entriesByLanguage": [
      { "language": "en", "count": 7999 },
      { "language": "cn", "count": 5200 }
    ],
    "entriesByClass": [
      { "object_class": "Safe", "count": 2500 },
      { "object_class": "Euclid", "count": 3000 }
    ],
    "proposalsByStatus": [
      { "status": "open", "count": 10 },
      { "status": "approved", "count": 5 }
    ],
    "recentActivity": {
      "newUsersToday": 3,
      "newProposalsToday": 1,
      "newVotesToday": 12,
      "errorsLast24h": 2
    },
    "logErrorRate": { "total": 1000, "errors": 5, "rate": 0.5 }
  }
}
```

---

### Users

#### GET `/api/admin/users`

List users with filtering and sorting.

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max: 100) |
| `q` | string | — | Search by codename |
| `role` | string | — | Filter by role |
| `sort` | string | `created_at` | Sort field (`codename`, `created_at`, `clearance`, `role`) |
| `order` | string | `desc` | Sort order (`asc`, `desc`) |

**Response `200`:**

```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "codename": "agent_smith",
      "role": "personnel",
      "clearance": 1,
      "created_at": "2026-06-26T00:00:00",
      "updated_at": "2026-06-26T00:00:00"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

#### GET `/api/admin/users/:id`

Get user details with activity counts.

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "codename": "agent_smith",
    "role": "personnel",
    "clearance": 1,
    "created_at": "2026-06-26T00:00:00",
    "updated_at": "2026-06-26T00:00:00",
    "historyCount": 42,
    "bookmarkCount": 5,
    "proposalCount": 3,
    "voteCount": 10
  }
}
```

**Errors:**

| Status | Condition |
| ------ | --------- |
| 404 | User not found |

---

#### GET `/api/admin/users/:id/history`

Get a user's browsing history.

**Query parameters:** `page` (default 1), `limit` (default 50, max 100)

---

#### GET `/api/admin/users/:id/bookmarks`

Get a user's bookmarks.

---

#### PUT `/api/admin/users/:id/role`

Update a user's role.

**Request body:** `{ "role": "string" }` (1-32 characters)

---

#### PUT `/api/admin/users/:id/clearance`

Update a user's clearance level.

**Request body:** `{ "clearance": 3 }` (integer 0-5)

---

#### PUT `/api/admin/users/:id/ban`

Ban a user. Cannot ban admin users.

---

#### PUT `/api/admin/users/:id/unban`

Unban a user.

---

#### DELETE `/api/admin/users/:id`

Delete a user. Cannot delete admin users. Cascade deletes: history, bookmarks, votes, proposals.

---

### Entries

#### GET `/api/admin/entries`

List SCP entries with filtering.

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max: 200) |
| `q` | string | — | Search by SCP number or name |
| `language` | string | — | Filter by language |
| `object_class` | string | — | Filter by class |
| `series` | number | — | Filter by series (1-8) |
| `hasContent` | string | — | Filter by content status (`true`/`false`) |

---

#### GET `/api/admin/entries/:id`

Get entry details.

---

#### PUT `/api/admin/entries/:id`

Update entry name or class.

**Request body:** `{ "name?": "string", "object_class?": "Safe" }`

---

#### DELETE `/api/admin/entries/:id`

Delete an entry.

---

#### POST `/api/admin/entries/:id/refetch`

Clear entry content and trigger a background re-fetch from the wiki.

---

#### POST `/api/admin/entries/crawl/:lang`

Trigger a crawl for a specific language (admin version with limit support).

---

#### GET `/api/admin/entries/crawl/status`

Get crawl status for both languages.

---

### Proposals (Admin)

#### GET `/api/admin/proposals`

List proposals with admin filtering.

**Query parameters:** `page`, `limit`, `status`, `category`, `userId`

---

#### GET `/api/admin/proposals/:id`

Get proposal details including full voter list.

**Response includes:** `voters: [{ vote, created_at, codename }]`

---

#### PUT `/api/admin/proposals/:id/status`

Update proposal status.

**Request body:** `{ "status": "approved" }` (one of `open`, `approved`, `rejected`)

---

#### DELETE `/api/admin/proposals/:id`

Delete a proposal. Cascade deletes votes.

---

### Logs (Admin)

#### GET `/api/admin/logs`

List system logs with filtering.

**Query parameters:** `page`, `limit`, `level`, `source`, `category`, `userId`, `q`, `from`, `to`, `sort`, `order`

---

#### GET `/api/admin/logs/stats`

Get log statistics (by level, source, category, error rate).

---

#### GET `/api/admin/logs/:id`

Get a specific log entry.

---

#### DELETE `/api/admin/logs/cleanup`

Delete logs older than N days.

**Query parameters:** `days` (default 30, min 1)

---

### Settings (Admin)

#### GET `/api/admin/settings`

Get system settings and database statistics.

**Response includes:** table row counts, CORS config, log level, crawl states, totals.

---

### Tags (Admin)

#### GET `/api/admin/tags/stats`

Get tag statistics (categories, tags, entry-tag counts, top tags by usage).

---

#### POST `/api/admin/tags/categories`

Create a tag category.

**Request body:** `{ "id": "string", "name": "string", "name_en": "string", "description?": "string", "sort_order?": 0 }`

---

#### PUT `/api/admin/tags/categories/:id`

Update a tag category.

---

#### DELETE `/api/admin/tags/categories/:id`

Delete a category. Cascade deletes tags and entry-tag associations.

---

#### POST `/api/admin/tags`

Create a tag.

**Request body:** `{ "id": "string", "category_id": "string", "name": "string", "name_zh": "string", "description?": "string", "ai_keywords?": ["keyword"], "sort_order?": 0 }`

---

#### PUT `/api/admin/tags/:id`

Update a tag.

---

#### DELETE `/api/admin/tags/:id`

Delete a tag. Cascade deletes entry-tag associations.

---

#### POST `/api/admin/tags/entry/:scpNumber`

Assign tags to an entry.

**Request body:** `{ "tag_ids": ["tag1", "tag2"], "language": "en" }`

---

#### DELETE `/api/admin/tags/entry/:scpNumber/:tagId`

Remove a tag from an entry.

**Query parameters:** `language` (default `"en"`)

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

### CrawlEntry

```ts
interface CrawlEntry {
  scpNumber: number      // SCP designation number (e.g., 173)
  name: string           // Entry name (e.g., "The Sculpture")
  objectClass: string    // Object class (Safe, Euclid, Keter, etc.)
  url: string            // Full URL to wiki page
  series: number         // Series number (1-8)
}
```

### TagPublic

```ts
interface TagPublic {
  id: string
  categoryId: string
  name: string
  nameZh: string
  description: string
  aiKeywords: string[]
  sortOrder: number
}
```

### TagCategoryPublic

```ts
interface TagCategoryPublic {
  id: string
  name: string
  nameEn: string
  description: string
  sortOrder: number
  tags?: TagPublic[]
}
```

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
