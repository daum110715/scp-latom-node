# Architecture

## Overview

SCP Docs is a three-part application:

- **Frontend** — Vue 3 SPA served via Cloudflare Pages at `scp-docs.scp.lat`
- **Backend** — Hono API on Cloudflare Workers at `api.scp.lat` with D1 database and Durable Objects
- **Admin Dashboard** — Separate Vue 3 SPA at `admin.scp.lat` for administrative functions

The frontend handles all UI rendering and routing. The backend handles user authentication, profile management, wiki crawling, AI chat, proposals, bookmarks, history, and reports via Durable Objects. The admin dashboard provides management interfaces for users, entries, proposals, and system settings.

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
| Tailwind CSS 4.3 | Utility-first CSS (via `@tailwindcss/vite`) |
| VitePWA | Service worker and offline support |
| Vitest 4.1 | Testing (happy-dom environment) |

### Directory Structure

```
src/
  main.ts              # App bootstrap: Pinia, Router, i18n, auth init, log flusher
  App.vue              # Root component: desktop/mobile layout switching
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
    ActivityView.vue   # Unified bookmarks + browsing history
    ProposalsView.vue  # Community proposals list
    ProposalDetailView.vue # Single proposal detail with voting
    NotFoundView.vue   # 404 page with glitch animation
    mobile/            # Mobile-specific view variants
      MobileHomeView.vue
      MobileCatalogView.vue
      MobileEntryView.vue
      MobileDocumentsView.vue
      MobileAboutView.vue
      MobileLoginView.vue
      MobileRegisterView.vue
      MobileProfileView.vue
      MobileActivityView.vue
      MobileProposalsView.vue
      MobileProposalDetailView.vue
      MobileNotFoundView.vue

  components/
    DeviceView.vue     # Route-level wrapper: renders desktop or mobile component
    common/            # Reusable UI
      Badge.vue        # Color-coded classification badge
      Card.vue         # Generic card with hover effect
      ClassBar.vue     # Object class colored dot indicator
      ErrorBoundary.vue # Vue error boundary with retry
      BackToTop.vue    # Scroll-to-top button
      ReportDialog.vue # Dialog for reporting entry issues
    home/              # Homepage sections
      HeroSection.vue  # Animated hero with grid background
      RecentEntries.vue # Grid of recent SCP entries (from crawler API)
      StatsGrid.vue    # Statistics dashboard
    layout/            # App shell (desktop)
      AppHeader.vue    # Fixed header: logo, search, lang, theme, auth
      AppSidebar.vue   # Sidebar nav with system info
      AppFooter.vue    # Footer with Foundation branding
      SearchModal.vue  # Command-palette search (Ctrl+K)
    mobile/            # Mobile-specific components
      MobileLayout.vue # Mobile shell with bottom navigation
      MobileHeader.vue # Mobile top header
      MobileNav.vue    # Bottom tab navigation (5 tabs)
      MobileSearchModal.vue # Full-screen mobile search
      MobileAiChatPanel.vue # Mobile AI chat panel
    ai/                # AI chat components
      AiChatPanel.vue  # Desktop AI chat panel
      AiConversationList.vue # Conversation list sidebar
      AiMessageBubble.vue # Individual message bubble

  stores/              # Pinia stores
    auth.ts            # User session, JWT token, login/logout/register
    search.ts          # Search query state for SearchModal
    crawler.ts         # Crawler entries, language switching, pagination, class filtering
    proposals.ts       # Proposals CRUD, voting, pagination, daily limits
    userActivity.ts    # Unified bookmarks + browsing history
    bookmarks.ts       # Re-export shim (backward compatibility)
    history.ts         # Re-export shim (backward compatibility)

  composables/         # Vue composables
    useLocale.ts       # Locale toggle (en/zh), persists to localStorage
    useTheme.ts        # Dark/light theme toggle, persists to localStorage
    useDevice.ts       # Responsive device detection (mobile/tablet/desktop)
    useSidebar.ts      # Sidebar collapsed state, persists to localStorage
    useEntryProtocol.ts # Auto/manual rotation protocol for catalog page

  services/            # API client layer
    config.ts          # Centralized API URL: https://api.scp.lat/api
    api.ts             # HTTP client: apiGet(), apiPost(), apiPut(), apiDelete(), apiStream()
    response.ts        # Normalizes backend JSON into ApiResult<T>
    errors.ts          # ErrorCode enum + i18n error resolution
    logger.ts          # Client-side logger with buffered server transmission
    ai.ts              # AI chat service (streaming SSE, conversations)
    crawler.ts         # Crawler API (entries, status, series, content)
    proposals.ts       # Proposals API (list, fetch, create, vote)
    userActivity.ts    # Unified bookmarks + history API
    bookmarks.ts       # Re-export shim
    history.ts         # Re-export shim
    reports.ts         # Entry reports API (submit, list, check)
    download.ts        # Generate standalone HTML for SCP entries

  data/                # Static data
    entries.ts         # Empty array (entries now fetched from crawler API)
    documents.ts       # 8 static Foundation documents with metadata

  locales/             # i18n translation files
    en.ts              # English translations (955 lines, includes full document content)
    zh.ts              # Chinese translations (954 lines)

  types/               # TypeScript interfaces
    index.ts           # ScpEntry, Document, SiteStats, ObjectClass

  styles/              # CSS design system
    variables.css      # Design tokens (colors, spacing, typography, etc.)
    base.css           # Global resets, transitions, animations
    tailwind.css       # Tailwind CSS v4 import
    mobile.css         # Mobile-specific CSS overrides

  router/              # Vue Router configuration
    index.ts           # 12 routes with auth guards + DeviceView wrapper
```

### Routing

Routes are defined in `src/router/index.ts`. All routes use a `DeviceView` wrapper component that renders either desktop or mobile versions based on screen width. All routes are lazy-loaded via dynamic `import()`.

| Path | Component | Auth Guard |
| ---- | --------- | ---------- |
| `/` | HomeView | None |
| `/catalog` | CatalogView | None |
| `/entry/:lang/:scpNumber` | EntryView | None |
| `/documents` | DocumentsView | None |
| `/proposals` | ProposalsView | `requiresAuth` |
| `/proposals/:id` | ProposalDetailView | `requiresAuth` |
| `/activity` | ActivityView | `requiresAuth` |
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

Seven Pinia stores:

**`auth.ts`** — User session management

- State: `user`, `token`, `loading`, `error`, `errorCode`
- Actions: `register()`, `login()`, `fetchProfile()`, `updateProfile()`, `logout()`, `init()`
- Token persisted in `localStorage` under key `scp-auth-token`
- On app startup, `init()` reads stored token and validates via `GET /api/auth/me`

**`search.ts`** — Search state for the SearchModal

- State: `query`, filtering logic for entries and documents

**`crawler.ts`** — Crawler entries from backend API

- State: entries, language (en/cn), pagination, class filtering
- Actions: `fetchEntries()`, `setLanguage()`, `setClass()`, `setPage()`

**`proposals.ts`** — Community proposals

- State: proposals, pagination, daily limits
- Actions: `fetchProposals()`, `createProposal()`, `vote()`, `fetchProposal()`

**`userActivity.ts`** — Unified bookmarks + browsing history

- State: bookmarks, history, active tab
- Actions: `fetchBookmarks()`, `addBookmark()`, `removeBookmark()`, `fetchHistory()`, `recordHistory()`, `deleteHistory()`, `clearHistory()`

**`bookmarks.ts`** / **`history.ts`** — Backward-compatibility shims that re-export from `userActivity.ts`

### API Client Layer

`src/services/` provides a typed HTTP client:

- **`config.ts`** — Centralized API URL: `https://api.scp.lat/api`
- **`api.ts`** — Core HTTP functions: `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`, `apiStream()`. Auto-injects auth token, logs slow/error responses.
- **`response.ts`** — Normalizes backend JSON into `ApiResult<T>` (either `{ ok: true, data }` or `{ ok: false, code, error }`)
- **`errors.ts`** — `ErrorCode` enum mapping HTTP status codes to i18n error keys
- **`logger.ts`** — Client-side logger with buffered server transmission. Warn/error logs batched and POSTed to `/api/logs` every 30s.

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
| Cloudflare Durable Objects | Stateful crawler and AI chat instances |
| jose 6.0 | JWT handling (HS256) |
| PBKDF2 | Password hashing (Web Crypto API) |
| ZhipuAI GLM | AI chat backend with tool calling |
| Wrangler 4.86 | Development and deployment CLI |
| Vitest 4.1 | Testing |

### Directory Structure

```
worker/src/
  index.ts             # Hono app entry: CORS, health check, route mounting, 404, error handler
  types.ts             # TypeScript interfaces: Env, User, CrawlEntry, Proposal, Bookmark, etc.
  routes/
    auth.ts            # Auth endpoints: register, login, me, profile
    crawler.ts         # Crawler endpoints: status, entries, series, entry content
    history.ts         # Browsing history: GET/POST/DELETE
    proposals.ts       # Proposals: GET/POST, voting
    bookmarks.ts       # Bookmarks: GET/POST/DELETE
    reports.ts         # Entry reports: POST, GET check/list
    logs.ts            # Client log ingestion
    ai.ts              # AI chat: POST chat (streaming), GET/PUT/DELETE conversations, POST regenerate
    tags.ts            # Tag categories and tags
    admin/
      index.ts         # Mounts all admin sub-routes under adminMiddleware
      dashboard.ts     # GET /stats — admin statistics
      users.ts         # User management (list, detail, update role/clearance)
      entries.ts       # SCP entry management
      proposals.ts     # Proposal management (approve/reject)
      logs.ts          # System log viewing
      settings.ts      # System settings
      tags.ts          # Tag management (CRUD categories and tags)
  middleware/
    auth.ts            # JWT Bearer token verification
    admin.ts           # Admin role verification (403 for non-admin)
    logger.ts          # Request logging middleware
  utils/
    jwt.ts             # JWT sign/verify using jose (HS256, 24h expiry)
    password.ts        # PBKDF2 password hashing (100k iterations, SHA-256)
    logger.ts          # Server-side structured logger with D1 persistence
    glm-client.ts      # GLM (ZhipuAI) API client for AI chat
  do/
    scp-crawler.ts     # Durable Object class for wiki crawling (EN + CN)
    ai-chat.ts         # Durable Object for AI chat conversations
    ai-queue.ts        # Durable Object serial queue for AI tasks
    http-client.ts     # HTTP client utilities for crawling
    parser.ts          # HTML parser for SCP wiki index pages
  tools/
    definitions.ts     # MCP-style tool definitions for AI chat
    executor.ts        # Tool execution logic (queries D1)
```

### Database Schema

12 tables in Cloudflare D1 (`scp-latom-node`):

```sql
-- Core tables
users              -- User accounts (codename, password, role, clearance)
scp_entries        -- Crawled SCP entries (number, name, class, URL, language, series)
crawl_state        -- Crawler state per language (status, last_crawl, cursor)

-- User activity
browsing_history   -- User browsing history (user_id, scp_number, language, viewed_at)
bookmarks          -- User bookmarks (user_id, scp_number, language, created_at)
proposals          -- Community proposals (user_id, title, content, status, votes)
proposal_votes     -- Proposal votes (proposal_id, user_id, vote)

-- Content management
entry_reports      -- Entry issue reports (user_id, scp_number, reason, status)
tag_categories     -- Tag category definitions (name, description, color)
tags               -- Individual tags (category_id, name, slug)
entry_tags         -- Entry-tag associations (scp_number, tag_id)

-- System
system_logs        -- Application logs (level, message, context, timestamp)
ai_conversations   -- AI chat conversations (user_id, title, messages JSON)
```

Includes seed data for 5 tag categories and 41 tags (object classes, anomaly types, groups of interest, narrative formats, themes).

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

### Durable Objects — AI Chat

The AI chat system uses two Durable Object types:

- **`AiChatDo`** — Manages individual AI chat conversations using the GLM (ZhipuAI) API. Supports tool calling for querying SCP entries from the database.
- **`AiQueueDo`** — Serial queue for AI conversation tasks to prevent concurrent processing.

The AI chat integrates MCP-style tools that allow the AI to query SCP entries, search by object class, and retrieve specific entry details from the D1 database.

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

### Unauthenticated User (Static Content + Crawler Data)

```
Browser → Cloudflare Pages → Vue SPA → crawler API for entries, static data for documents
```

SCP entries are fetched from the crawler API (`/api/crawler/:lang/entries`). Documents are served from the frontend's static TypeScript data files.

### Authenticated User

```
Browser → Vue SPA → src/services/api.ts → https://api.scp.lat/api/* → Hono Worker → D1 Database
```

1. User submits login/register form
2. Frontend store (`auth.ts`) calls `apiPost()` from `src/services/api.ts`
3. Request goes to `api.scp.lat` with credentials
4. Hono middleware validates CORS, extracts JWT (for protected routes)
5. Route handler validates input, queries D1, returns response
6. Frontend stores JWT in localStorage, updates Pinia state

### AI Chat Flow

```
Browser → Vue SPA → src/services/ai.ts → POST /api/ai/chat → AiQueueDo → AiChatDo → GLM API
```

1. User sends message in AI chat panel
2. Frontend opens SSE stream to `/api/ai/chat`
3. Request is queued in `AiQueueDo` for serial processing
4. `AiChatDo` sends message to GLM API with tool definitions
5. GLM may invoke tools (query SCP entries) — tools are executed against D1
6. Response streams back to frontend via SSE

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
