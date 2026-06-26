# Architecture

## Overview

SCP Docs is a two-part application:

- **Frontend** — Vue 3 SPA served via Cloudflare Pages at `scp-docs.scp.lat`
- **Backend** — Hono API on Cloudflare Workers at `api.scp.lat` with D1 database and Durable Objects

The frontend handles all UI rendering and routing. The backend handles user authentication, profile management, and wiki crawling via Durable Objects.

## Frontend Architecture

### Technology Stack

| Technology | Purpose |
| ---------- | ------- |
| Vue 3.5 | UI framework with `<script setup>` and Composition API |
| TypeScript 6.0 | Type safety |
| Vite 8.1 | Build tool and dev server (port 8085) |
| Vue Router 4.6 | Client-side routing (HTML5 history mode) |
| Pinia 3.0 | State management |
| vue-i18n 11.4 | Internationalization (English + Chinese) |
| Vitest 4.1 | Testing (happy-dom environment) |

### Directory Structure

```
src/
  main.ts              # App bootstrap: Pinia, Router, i18n, auth init
  App.vue              # Root component: layout shell
  i18n.ts              # vue-i18n setup

  views/               # Page-level components (route targets)
    HomeView.vue       # Homepage: Hero, StatsGrid, RecentEntries
    CatalogView.vue    # SCP catalog with search + class filtering
    EntryView.vue      # Single SCP entry detail page
    DocumentsView.vue  # Foundation documents grid with modal reader
    AboutView.vue      # About page (Foundation, classification system)
    LoginView.vue      # Login form
    RegisterView.vue   # Registration form
    ProfileView.vue    # User profile with codename/password editing
    NotFoundView.vue   # 404 page with glitch animation

  components/
    common/            # Reusable UI
      Badge.vue        # Color-coded classification badge
      Card.vue         # Generic card with hover effect
      ClassBar.vue     # Object class colored dot indicator
      ErrorBoundary.vue # Vue error boundary with retry
    home/              # Homepage sections
      HeroSection.vue  # Animated hero with grid background
      RecentEntries.vue # Grid of recent SCP entries
      StatsGrid.vue    # Statistics dashboard
    layout/            # App shell
      AppHeader.vue    # Fixed header: logo, search, lang, theme, auth
      AppSidebar.vue   # Sidebar nav (desktop) + bottom nav (mobile)
      AppFooter.vue    # Footer with Foundation branding
      SearchModal.vue  # Command-palette search (Ctrl+K)

  stores/              # Pinia stores
    auth.ts            # User session, JWT token, login/logout/register
    search.ts          # Search query state for SearchModal

  composables/         # Vue composables
    useLocale.ts       # Locale toggle (en/zh), persists to localStorage
    useTheme.ts        # Dark/light theme toggle, persists to localStorage

  services/            # API client layer
    api.ts             # HTTP client: request(), apiGet(), apiPost(), apiPut()
    response.ts        # Normalizes backend JSON into ApiResult<T>
    errors.ts          # ErrorCode enum + i18n error resolution

  data/                # Static mock data
    entries.ts         # 7 hardcoded SCP entries + siteStats
    documents.ts       # 4 hardcoded Foundation documents

  locales/             # i18n translation files
    en.ts              # English translations
    zh.ts              # Chinese translations

  types/               # TypeScript interfaces
    index.ts           # ScpEntry, Document, SiteStats, ObjectClass

  styles/              # CSS design system
    variables.css      # Design tokens (colors, spacing, typography, etc.)
    base.css           # Global resets and base styles

  router/              # Vue Router configuration
    index.ts           # 9 routes with auth guards
```

### Routing

Routes are defined in `src/router/index.ts`. All routes are lazy-loaded via dynamic `import()`.

| Path | Component | Auth Guard |
| ---- | --------- | ---------- |
| `/` | HomeView | None |
| `/catalog` | CatalogView | None |
| `/entry/:id` | EntryView | None |
| `/documents` | DocumentsView | None |
| `/about` | AboutView | None |
| `/login` | LoginView | `requiresGuest` |
| `/register` | RegisterView | `requiresGuest` |
| `/profile` | ProfileView | `requiresAuth` |
| `/:pathMatch(.*)*` | NotFoundView | None |

**Guard behavior:**

- `requiresAuth: true` — Redirects to `/login` if not authenticated
- `requiresGuest: true` — Redirects to `/home` if already authenticated

**Additional features:**

- Title management via `meta.titleKey` + i18n translations
- Chunk-load error recovery (auto-reload on stale deployment)

### State Management

Two Pinia stores:

**`auth.ts`** — User session management

- State: `user`, `token`, `loading`, `error`, `errorCode`
- Actions: `register()`, `login()`, `fetchProfile()`, `updateProfile()`, `logout()`, `init()`
- Token persisted in `localStorage` under key `scp-auth-token`
- On app startup, `init()` reads stored token and validates via `GET /api/auth/me`

**`search.ts`** — Search state for the SearchModal

- State: `query`, filtering logic for entries and documents

### API Client Layer

`src/services/` provides a typed HTTP client:

- **`api.ts`** — Core HTTP functions: `request()`, `apiGet()`, `apiPost()`, `apiPut()`. Targets `https://api.scp.lat`.
- **`response.ts`** — Normalizes backend JSON into `ApiResult<T>` (either `{ ok: true, data }` or `{ ok: false, code, error }`)
- **`errors.ts`** — `ErrorCode` enum mapping HTTP status codes to i18n error keys

### Error Handling

- `ErrorBoundary.vue` wraps the app for render errors
- Global `app.config.errorHandler` and `unhandledrejection` handler in `main.ts`
- All API errors go through the `ErrorCode` system with i18n translation
- Chunk-load failures trigger automatic page reload

## Backend Architecture

### Technology Stack

| Technology | Purpose |
| ---------- | ------- |
| Hono 4.9 | Lightweight web framework for edge |
| Cloudflare Workers | Serverless runtime |
| Cloudflare D1 | SQLite-based database |
| Cloudflare Durable Objects | Stateful crawler instances |
| jose 6.0 | JWT handling (HS256) |
| PBKDF2 | Password hashing (Web Crypto API) |
| Wrangler 4.86 | Development and deployment CLI |
| Vitest 4.1 | Testing |

### Directory Structure

```
worker/src/
  index.ts             # Hono app entry: CORS, health check, route mounting, 404, error handler
  types.ts             # TypeScript interfaces: Env, User, UserPublic, JwtPayload, CrawlEntry, CrawlState
  routes/
    auth.ts            # Auth endpoints: register, login, me, profile
    crawler.ts         # Crawler endpoints: status, entries, series, trigger crawl
  middleware/
    auth.ts            # JWT Bearer token verification
  utils/
    jwt.ts             # JWT sign/verify using jose (HS256, 24h expiry)
    password.ts        # PBKDF2 password hashing (100k iterations, SHA-256)
  do/
    scp-crawler.ts     # Durable Object class for wiki crawling
    parser.ts          # HTML parser for SCP wiki index pages
```

### Database Schema

Single table in Cloudflare D1 (`scp-latom-node`):

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  codename   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'personnel',
  clearance  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_codename ON users(codename);
```

**Password storage format:** `hex(salt).hex(hash)` where salt is 16 bytes and hash is 32 bytes (PBKDF2, SHA-256, 100,000 iterations).

### Durable Objects — Wiki Crawler

The system uses two Durable Object instances to crawl the SCP Foundation wiki index pages:

- **`SCP_EN_CRAWLER`** — Crawls `scp-wiki.wikidot.com` (English)
- **`SCP_CN_CRAWLER`** — Crawls `scp-wiki-cn.wikidot.com` (Chinese)

**How it works:**

1. Each DO is identified by a fixed ID (`scp-en-crawler` / `scp-cn-crawler`) — exactly one instance per language
2. On trigger (`POST /api/crawler/:lang/crawl`), the DO fetches all 8 series pages sequentially (full crawl)
3. An HTML parser (`do/parser.ts`) extracts SCP number, name, object class, and URL from each page
4. Parsed entries are stored in DO storage (persistent across requests)
5. A 24-hour auto-refresh alarm performs **incremental crawling** — 1 series per cycle, rotating through all 8 series over 8 days
6. Cached data is served instantly via `GET /api/crawler/:lang/entries`

**Incremental crawling:** The DO maintains a cursor (`crawl_cursor`) that advances after each alarm cycle. Each alarm crawls only 1 series page, merges the new data into existing entries (by SCP number), and advances the cursor. This spreads the load evenly — a full refresh completes over 8 days. Manual triggers always do a full crawl of all 8 series at once.

**Rate limiting:** 500ms delay between page fetches, max 2 retries per page, exponential backoff on 429 responses.

**Parser:** Uses regex-based HTML parsing (no DOM parser in Workers). Matches `<a href="/scp-XXX">` links and `Object Class: <class>` patterns. Handles variations in HTML structure across different series pages.

See the [API Reference](api-reference.md) for endpoint details.

### CORS Configuration

Dynamic origin validation from `CORS_ORIGINS` environment variable (comma-separated). Supports exact match and wildcard subdomain patterns (e.g., `https://*.scp.lat`).

Allowed methods: GET, POST, PUT, DELETE, OPTIONS
Credentials: enabled
Max-age: 86400 seconds

### API Response Format

All endpoints return:

```jsonc
// Success
{ "success": true, /* ...data */ }

// Error
{ "success": false, "error": "message" }
```

See the [API Reference](api-reference.md) for full endpoint documentation.

## Data Flow

### Unauthenticated User (Static Content)

```
Browser → Cloudflare Pages → Vue SPA → static data from src/data/
```

SCP entries and documents are served entirely from the frontend's static TypeScript data files. No API calls are needed.

### Authenticated User

```
Browser → Vue SPA → src/services/api.ts → https://api.scp.lat/api/auth/* → Hono Worker → D1 Database
```

1. User submits login/register form
2. Frontend store (`auth.ts`) calls `apiPost()` from `src/services/api.ts`
3. Request goes to `api.scp.lat` with credentials
4. Hono middleware validates CORS, extracts JWT (for protected routes)
5. Route handler validates input, queries D1, returns response
6. Frontend stores JWT in localStorage, updates Pinia state

## Build and Deployment Pipeline

```
git push → GitHub Actions
  ├─ CI Pipeline (every push/PR)
  │   ├─ Frontend: typecheck → test → build
  │   └─ Backend: typecheck → test
  └─ Deploy Pipeline (push to main only)
      ├─ Frontend: build → wrangler pages deploy dist/
      └─ Backend: wrangler deploy → d1 execute schema.sql
```

See the [Deployment Guide](deployment.md) for details.
