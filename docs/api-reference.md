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
