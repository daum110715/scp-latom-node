# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SCP Docs is a themed documentation/intranet portal for the SCP Foundation universe. It consists of three parts:

1. **Frontend** (root) — Vue 3 + TypeScript SPA with Vite
2. **Backend API** (`worker/`) — Hono framework on Cloudflare Workers with D1 database
3. **Admin Dashboard** (`admin/`) — Separate Vue 3 SPA for administrative functions

The frontend is at `scp-docs.scp.lat`, the API at `api.scp.lat`, and the admin dashboard at `admin.scp.lat`.

## Development Commands

### Frontend (root directory)
```bash
npm run dev        # Start dev server on port 8085
npm run build      # Type-check with vue-tsc + build with Vite
npm run preview    # Preview production build
npm test           # Run tests (vitest run)
npm run test:watch # Run tests in watch mode
npm run typecheck  # Type-check only (vue-tsc -b --noEmit)
```

### Backend (worker/ directory)
```bash
cd worker
npm run dev             # Start Wrangler dev server
npm run deploy          # Deploy to Cloudflare Workers
npm run test            # Run tests (vitest run)
npm run typecheck       # Type-check only (tsc --noEmit)
npm run db:schema       # Apply schema to remote D1 database
npm run db:schema:local # Apply schema to local D1 database
```

### Admin Dashboard (admin/ directory)
```bash
cd admin
npm run dev        # Start dev server
npm run build      # Build for production
npm run typecheck  # Type-check only
```

### Full CI Pipeline (local)
```bash
make ci            # Run typecheck + test + build (same as GitHub Actions)
make test          # Run all tests (frontend + backend)
make typecheck     # Type-check both projects
make build         # Build frontend
make coverage      # Run tests with coverage
make help          # Show all available targets
```

## CI/CD

### GitHub Actions
- **`.github/workflows/ci.yml`** — Runs on push/PR to `main`: type-check, test, and build for both frontend and backend
- **`.github/workflows/deploy.yml`** — Runs on push to `main` (or manual trigger): deploys frontend to Cloudflare Pages and backend to Cloudflare Workers

### Required Secrets
Set these in GitHub repo settings → Secrets and variables → Actions:
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Pages and Workers permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID

## Testing

Tests use **Vitest** with `happy-dom` for the frontend. Test files live in `__tests__/` directories next to the code they test.

### Frontend test coverage (15 files)
- `src/components/common/__tests__/` — UI components (Badge, Card, ClassBar)
- `src/composables/__tests__/` — Vue composables (useLocale, useTheme)
- `src/data/__tests__/` — Static data integrity (documents, entries)
- `src/locales/__tests__/` — i18n key parity between en/zh
- `src/services/__tests__/` — API client, response normalization, logger
- `src/stores/__tests__/` — Pinia stores (auth, search)
- `src/views/__tests__/` — Page views (LoginView, RegisterView)

### Backend test coverage (10 files)
- `worker/src/__tests__/` — CORS and health check
- `worker/src/do/__tests__/` — Durable Objects (ai-chat, ai-queue, parser, scp-crawler)
- `worker/src/middleware/__tests__/` — Request logger middleware
- `worker/src/routes/__tests__/` — API routes (auth, ai, crawler, logs)
- `worker/src/tools/__tests__/` — AI tool executor
- `worker/src/utils/__tests__/` — Utilities (jwt, password, logger, glm-client)

## Architecture

### Frontend Structure

- **`src/views/`** — Page components with desktop and mobile variants:
  - HomeView, CatalogView, EntryView, DocumentsView, AboutView, LoginView, RegisterView, ProfileView, NotFoundView
  - ActivityView (unified bookmarks + history), ProposalsView, ProposalDetailView
  - Mobile variants in `src/views/mobile/` (MobileHomeView, MobileCatalogView, etc.)
- **`src/components/`** — Organized by domain:
  - `common/` — Reusable UI (Badge, Card, ClassBar, ErrorBoundary, BackToTop, ReportDialog)
  - `home/` — Homepage sections (HeroSection, RecentEntries, StatsGrid)
  - `layout/` — App shell (AppHeader, AppSidebar, AppFooter, SearchModal)
  - `mobile/` — Mobile-specific (MobileLayout, MobileHeader, MobileNav, MobileSearchModal, MobileAiChatPanel)
  - `ai/` — AI chat components (AiChatPanel, AiConversationList, AiMessageBubble)
- **`src/stores/`** — Pinia stores:
  - `auth.ts` — User authentication state, JWT token management
  - `search.ts` — Command-palette search state
  - `crawler.ts` — Crawler entries, language switching, pagination, class filtering
  - `proposals.ts` — Proposals CRUD, voting, pagination, daily limits
  - `userActivity.ts` — Unified bookmarks + browsing history
  - `bookmarks.ts` / `history.ts` — Re-export shims for backward compatibility
- **`src/services/`** — API client layer:
  - `config.ts` — Centralized API URL configuration
  - `api.ts` — HTTP client (apiGet, apiPost, apiPut, apiDelete, apiStream)
  - `response.ts` — Response normalization into ApiResult<T>
  - `errors.ts` — SCP-themed error codes with i18n resolution
  - `logger.ts` — Client-side logger with buffered server transmission
  - `ai.ts` — AI chat service (streaming SSE, conversations)
  - `crawler.ts` — Crawler API (entries, status, series, content)
  - `proposals.ts` — Proposals API (list, fetch, create, vote)
  - `userActivity.ts` — Unified bookmarks + history API
  - `reports.ts` — Entry reports API
  - `download.ts` — Generate standalone HTML for SCP entries
- **`src/composables/`** — Vue composables:
  - `useLocale.ts` — i18n locale toggle (en/zh)
  - `useTheme.ts` — Dark/light theme toggle
  - `useDevice.ts` — Responsive device detection (mobile/tablet/desktop)
  - `useSidebar.ts` — Sidebar collapsed state
  - `useEntryProtocol.ts` — Auto/manual rotation protocol for catalog page
- **`src/data/`** — Static data:
  - `entries.ts` — Empty array (entries now fetched from crawler API)
  - `documents.ts` — 8 static Foundation documents with metadata
- **`src/locales/`** — i18n translation files (en.ts, zh.ts) with full document content

### Backend Structure (worker/)

- **`src/index.ts`** — Hono app entry point with CORS, request logging, health check, 10 route groups
- **`src/routes/`** — API endpoints:
  - `auth.ts` — Register, login, me, profile
  - `crawler.ts` — Crawler status, entries, series, entry content
  - `history.ts` — Browsing history (GET/POST/DELETE)
  - `proposals.ts` — Proposals (GET/POST) and voting
  - `bookmarks.ts` — Bookmarks (GET/POST/DELETE)
  - `reports.ts` — Entry reports (POST, GET check/list)
  - `logs.ts` — Client log ingestion
  - `ai.ts` — AI chat (streaming, conversations, regenerate)
  - `tags.ts` — Tag categories and tags
  - `admin/` — Admin routes (dashboard, users, entries, proposals, logs, settings, tags)
- **`src/middleware/`** — Middleware:
  - `auth.ts` — JWT Bearer token verification
  - `admin.ts` — Admin role verification (403 for non-admin)
  - `logger.ts` — Request logging
- **`src/do/`** — Durable Objects:
  - `scp-crawler.ts` — Wiki crawler (EN and CN)
  - `ai-chat.ts` — AI chat conversations with GLM API
  - `ai-queue.ts` — Serial queue for AI tasks
  - `http-client.ts` — HTTP client for crawling
  - `parser.ts` — SCP Wiki HTML parser
- **`src/tools/`** — AI tool integration:
  - `definitions.ts` — MCP-style tool definitions
  - `executor.ts` — Tool execution logic
- **`src/utils/`** — Utilities:
  - `jwt.ts` — JWT sign/verify (jose, HS256, 24h expiry)
  - `password.ts` — PBKDF2 password hashing
  - `logger.ts` — Server-side structured logger with D1 persistence
  - `glm-client.ts` — GLM (ZhipuAI) API client
- **`src/types.ts`** — TypeScript interfaces for Env, User, CrawlEntry, Proposal, Bookmark, etc.
- **`schema.sql`** — Database schema (12 tables) with seed data for tags

### Data Model

Key data types defined in `src/types/index.ts`:

- **`ObjectClass`** — `'Safe' | 'Euclid' | 'Keter' | 'Thaumiel' | 'Apollyon' | 'Neutralized'`
- **`ScpEntry`** — SCP objects with number, name, objectClass, summary, containment, description, addenda, tags, date, author
- **`Document`** — Foundation documents (protocol/research/incident/directive) with classification levels (Unclassified through Top Secret)
- **`SiteStats`** — totalEntries, byClass, documents, personnel

### i18n

The app supports English and Chinese (zh) via vue-i18n. Locale is persisted in localStorage under key `scp-locale`. Add new translations to both `src/locales/en.ts` and `src/locales/zh.ts`.

### Routing

Routes are defined in `src/router/index.ts`. All routes use `DeviceView` wrapper to render desktop or mobile variants. Auth guards:
- `requiresAuth: true` — Requires authenticated user (e.g., /profile, /proposals, /activity)
- `requiresGuest: true` — Only for unauthenticated users (e.g., /login, /register)

| Path | Auth | Description |
|------|------|-------------|
| `/` | — | Homepage |
| `/catalog` | — | SCP catalog with filtering |
| `/entry/:lang/:scpNumber` | — | Single SCP entry detail |
| `/documents` | — | Foundation documents |
| `/proposals` | requiresAuth | Community proposals |
| `/proposals/:id` | requiresAuth | Proposal detail |
| `/activity` | requiresAuth | Unified bookmarks + history |
| `/about` | — | About page |
| `/login` | requiresGuest | Login form |
| `/register` | requiresGuest | Registration form |
| `/profile` | requiresAuth | User profile |
| `/:pathMatch(.*)*` | — | 404 page |

### Path Aliases

`@` is aliased to `src/` in both Vite and TypeScript configs.

## Key Technical Details

- Vue 3 with `<script setup>` syntax and Composition API
- Pinia for state management
- Vue Router with HTML5 history mode
- Tailwind CSS v4 (via `@tailwindcss/vite`) alongside custom CSS design system
- Cloudflare Workers + D1 for the backend
- Cloudflare Durable Objects for stateful crawling and AI chat
- Hono framework (not Express) for the API
- jose library for JWT handling
- GLM (ZhipuAI) API for AI chat functionality
- VitePWA for service worker and offline support
- Volar extension recommended for VS Code
