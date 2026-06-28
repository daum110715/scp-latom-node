# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Community proposals system with voting, daily limits, and admin moderation
- Bookmarks and browsing history with unified activity page
- Entry reporting system for content issues
- AI chat assistant with GLM (ZhipuAI) integration and tool calling
- Tag system with categories (object class, anomaly type, group of interest, narrative format, theme)
- Admin dashboard (separate Vue 3 SPA) for user, entry, proposal, and tag management
- Crawler Durable Objects for English and Chinese SCP Wiki crawling
- Client-side logging with buffered server transmission
- Entry content download as standalone HTML
- Responsive mobile views for all pages
- Durable Objects for AI chat and queue management

### Changed

- Entries are now fetched from the crawler API instead of static mock data
- Unified bookmarks and history into a single userActivity store
- Updated all documentation to reflect current project architecture

## [0.1.0] - 2026-06-26

### Added

- Vue 3 + TypeScript frontend with Vite
- SCP entry catalog with object class filtering (Safe, Euclid, Keter, Thaumiel, Apollyon, Neutralized)
- Foundation document library with classification levels
- Full-text search across entries and documents (Ctrl+K command palette)
- User authentication (register, login, profile management) via Hono/Cloudflare Workers API
- JWT-based session management with jose library (HS256, 24h expiry)
- PBKDF2 password hashing (SHA-256, 100,000 iterations)
- Cloudflare D1 database for user storage
- Internationalization: English and Chinese (zh) with vue-i18n
- Dark and light theme toggle with CSS custom properties
- Responsive layout with sidebar navigation (desktop) and bottom navigation (mobile)
- SCP-themed UI design system with classification levels and clearance system
- Error boundary component with SCP-themed error codes
- Vitest test suite for frontend (15 test files) and backend (15 test files)
- CI pipeline (GitHub Actions): type-check, test, build
- Deployment pipeline: Cloudflare Pages (frontend) + Cloudflare Workers (backend)
- Makefile for common development tasks
- CORS configuration with wildcard subdomain support
- Chunk-load failure recovery (auto-reload on stale deployment)

[Unreleased]: https://github.com/scp-docs/scp-docs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/scp-docs/scp-docs/releases/tag/v0.1.0
