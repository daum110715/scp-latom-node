# SCP Docs — Latom Node

A themed documentation and intranet portal for the SCP Foundation universe. Built with Vue 3 + TypeScript on the frontend and Hono on Cloudflare Workers for the backend API.

## Features

- **SCP Entry Catalog** — Browse and search SCP objects with filtering by containment class (Safe, Euclid, Keter, Thaumiel, Apollyon, Neutralized)
- **Document Library** — Foundation protocols, research papers, incident reports, and directives with classification levels
- **Full-Text Search** — Command-palette search (Ctrl+K) across all entries and documents with keyboard navigation
- **User Authentication** — Register, login, and profile management with JWT-based sessions
- **Internationalization** — English and Chinese (zh) with automatic browser language detection
- **Dark & Light Themes** — Toggle between themes with persistent preference
- **Responsive Layout** — Desktop sidebar navigation, mobile bottom navigation
- **SCP-Themed Design** — Custom CSS design system with classification levels and clearance system

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
│   ├── views/                  # Page components (Home, Catalog, Entry, Documents, etc.)
│   ├── components/
│   │   ├── common/             # Reusable UI (Badge, Card, ClassBar, ErrorBoundary)
│   │   ├── home/               # Homepage sections (Hero, Stats, RecentEntries)
│   │   └── layout/             # App shell (Header, Sidebar, Footer, SearchModal)
│   ├── stores/                 # Pinia state management (auth, search)
│   ├── composables/            # Vue composables (useLocale, useTheme)
│   ├── services/               # API client layer
│   ├── data/                   # Static SCP entries and documents
│   ├── locales/                # i18n translations (en, zh)
│   ├── types/                  # TypeScript interfaces
│   ├── styles/                 # CSS design tokens and base styles
│   └── router/                 # Vue Router configuration
├── worker/                     # Backend source
│   └── src/
│       ├── routes/             # API endpoints (auth)
│       ├── middleware/          # JWT authentication middleware
│       └── utils/              # JWT and password utilities
├── docs/                       # Documentation
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
| Backend | [Hono](https://hono.dev/) | Web framework for edge |
| Backend | [Cloudflare Workers](https://workers.cloudflare.com/) | Serverless runtime |
| Backend | [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite database |
| Backend | [jose](https://github.com/panva/jose) | JWT handling |
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
