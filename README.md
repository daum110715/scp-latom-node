# SCP Docs — Latom Node

A themed documentation and intranet portal for the SCP Foundation universe. Built with Vue 3 + TypeScript on the frontend, Hono on Cloudflare Workers for the backend API, and a separate admin dashboard.

## Features

- **SCP Entry Catalog** — Browse and search SCP objects with filtering by containment class (Safe, Euclid, Keter, Thaumiel, Apollyon, Neutralized)
- **Document Library** — Foundation protocols, research papers, incident reports, and directives with classification levels
- **Full-Text Search** — Command-palette search (Ctrl+K) across all entries and documents with keyboard navigation
- **User Authentication** — Register, login, and profile management with JWT-based sessions
- **Proposals System** — Community proposals with voting, daily limits, and admin moderation
- **Bookmarks & History** — Save favorite entries and track browsing history
- **Entry Reports** — Report issues on SCP entries for admin review
- **AI Chat** — AI-powered SCP assistant with conversation management and tool integration
- **Tag System** — Categorize entries by object class, anomaly type, group of interest, narrative format, and theme
- **Admin Dashboard** — Separate admin SPA for user management, entry management, proposal moderation, logs, and settings
- **Internationalization** — English and Chinese (zh) with automatic browser language detection
- **Dark & Light Themes** — Toggle between themes with persistent preference
- **Responsive Layout** — Desktop sidebar navigation, mobile bottom navigation with dedicated mobile views
- **SCP-Themed Design** — Custom CSS design system with classification levels and clearance system
- **PWA Support** — Service worker with offline caching via VitePWA

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Frontend

```bash
npm ci
npm run dev        # http://localhost:8085
```

### Backend

```bash
cd worker
npm ci
npm run db:schema:local   # Initialize local D1 database
npm run dev               # Wrangler dev server
```

### Admin Dashboard

```bash
cd admin
npm ci
npm run dev        # Admin dev server
```

### Run All Checks

```bash
make ci            # typecheck + test + build
make test          # Run all tests
make typecheck     # Type-check only
```

## Project Structure

```
scp-docs/
├── src/                        # Frontend source
│   ├── views/                  # Page components (desktop + mobile variants)
│   │   └── mobile/             # Mobile-specific views
│   ├── components/
│   │   ├── common/             # Reusable UI (Badge, Card, ClassBar, ErrorBoundary, ReportDialog)
│   │   ├── home/               # Homepage sections (Hero, Stats, RecentEntries)
│   │   ├── layout/             # App shell (Header, Sidebar, Footer, SearchModal)
│   │   ├── mobile/             # Mobile components (Layout, Header, Nav, Search, AiChat)
│   │   └── ai/                 # AI chat components (Panel, ConversationList, MessageBubble)
│   ├── stores/                 # Pinia state management (auth, search, crawler, proposals, userActivity)
│   ├── composables/            # Vue composables (useLocale, useTheme, useDevice, useSidebar, useEntryProtocol)
│   ├── services/               # API client layer (api, ai, crawler, proposals, userActivity, reports, download)
│   ├── data/                   # Static documents (entries fetched from crawler API)
│   ├── locales/                # i18n translations (en, zh)
│   ├── types/                  # TypeScript interfaces
│   ├── styles/                 # CSS design tokens, base styles, Tailwind, mobile
│   └── router/                 # Vue Router configuration with auth guards
├── worker/                     # Backend source
│   └── src/
│       ├── routes/             # API endpoints (auth, crawler, history, proposals, bookmarks, reports, logs, ai, tags)
│       │   └── admin/          # Admin routes (dashboard, users, entries, proposals, logs, settings, tags)
│       ├── middleware/          # JWT auth, admin role check, request logging
│       ├── do/                 # Durable Objects (scp-crawler, ai-chat, ai-queue, http-client, parser)
│       ├── tools/              # AI tool definitions and executor
│       ├── utils/              # JWT, password, logger, GLM client
│       └── types.ts            # TypeScript interfaces
├── admin/                      # Admin dashboard (separate Vue 3 SPA)
│   ├── views/                  # Admin pages (Dashboard, Users, Entries, Proposals, Logs, Settings)
│   ├── stores/                 # Admin Pinia stores
│   ├── services/               # Admin API client
│   └── components/             # Admin UI components
├── docs/                       # Developer documentation
└── Makefile                    # Development commands
```

## Tech Stack

| Layer | Technology | Purpose |
| ----- | ---------- | ------- |
| Frontend | [Vue 3](https://vuejs.org/) | UI framework with Composition API |
| Frontend | [TypeScript](https://www.typescriptlang.org/) | Type safety |
| Frontend | [Vite](https://vite.dev/) | Build tool and dev server |
| Frontend | [Pinia](https://pinia.vuejs.org/) | State management |
| Frontend | [Vue Router](https://router.vuejs.org/) | Client-side routing |
| Frontend | [vue-i18n](https://vue-i18n.intlify.dev/) | Internationalization |
| Frontend | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first CSS |
| Frontend | [VitePWA](https://vite-pwa-org.netlify.app/) | PWA with service worker |
| Backend | [Hono](https://hono.dev/) | Web framework for edge |
| Backend | [Cloudflare Workers](https://workers.cloudflare.com/) | Serverless runtime |
| Backend | [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite database |
| Backend | [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) | Stateful crawling and AI chat |
| Backend | [jose](https://github.com/panva/jose) | JWT handling |
| Backend | [ZhipuAI GLM](https://open.bigmodel.cn/) | AI chat backend |
| Testing | [Vitest](https://vitest.dev/) | Test runner (frontend + backend) |

## Documentation

| Document | Description |
| -------- | ----------- |
| [Architecture](docs/architecture.md) | System architecture and data flow |
| [API Reference](docs/api-reference.md) | Backend API endpoint documentation |
| [Deployment Guide](docs/deployment.md) | Deploying to Cloudflare |
| [Testing Guide](docs/testing.md) | Running and writing tests |
| [Internationalization](docs/i18n.md) | Adding and managing translations |
| [Design System](docs/design-system.md) | CSS tokens and component conventions |
| [Code Conventions](docs/conventions.md) | Style guide and project conventions |
| [Contributing](CONTRIBUTING.md) | How to contribute |
| [Changelog](CHANGELOG.md) | Version history |
| [Security Policy](SECURITY.md) | Vulnerability reporting |

## License

[MIT](LICENSE)
