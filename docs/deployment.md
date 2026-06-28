# Deployment Guide

## Overview

The application deploys in three parts:

- **Frontend** — Cloudflare Pages (static SPA)
- **Backend** — Cloudflare Workers + D1 database + Durable Objects
- **Admin Dashboard** — Cloudflare Pages (separate static SPA)

Deployment is automated via GitHub Actions on push to `main`.

## Prerequisites

- Cloudflare account with Workers, Pages, and D1 enabled
- Cloudflare API Token with permissions for Workers, Pages, and D1
- GitHub repository secrets configured:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

## Automated Deployment

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR to `main`:

1. **Frontend job:** typecheck → test → build (uploads `dist/` artifact)
2. **Backend job:** typecheck → test

Both jobs run in parallel. All checks must pass before deployment.

### Deploy Pipeline (`.github/workflows/deploy.yml`)

Runs on push to `main` (and manual dispatch):

1. **Deploy frontend:** build → `wrangler pages deploy dist/`
2. **Deploy backend** (after frontend): `wrangler deploy` → `d1 execute schema.sql`

**Concurrency:** Deployments complete sequentially (no cancel-in-progress).

## Manual Deployment

### Frontend

```bash
npm run build
npx wrangler pages deploy dist/ --project-name=scp-docs --branch=main
```

### Admin Dashboard

```bash
cd admin
npm run build
npx wrangler pages deploy dist/ --project-name=scp-docs-admin --branch=main
```

### Backend

```bash
cd worker
npm run deploy
```

### Database Schema

```bash
cd worker
npm run db:schema        # Apply to remote D1 database
npm run db:schema:local  # Apply to local D1 (for development)
```

## Environment Variables

### Backend (`worker/wrangler.toml` `[vars]`)

| Variable | Description |
| -------- | ----------- |
| `JWT_SECRET` | Secret key for JWT signing. **MUST be changed from the default before production.** |
| `CORS_ORIGINS` | Comma-separated list of allowed origins. Supports wildcard subdomains (e.g., `https://*.scp.lat`). |
| `GLM_API_KEY` | ZhipuAI API key for AI chat functionality. |

### Durable Objects

Configured in `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "scp-latom-node"
database_id = "<your-database-id>"

[[durable_objects.bindings]]
name = "SCP_EN_CRAWLER"
class_name = "ScpCrawlerDo"
script_name = "scp-latom-node-api"

[[durable_objects.bindings]]
name = "SCP_CN_CRAWLER"
class_name = "ScpCrawlerDo"
script_name = "scp-latom-node-api"

[[durable_objects.bindings]]
name = "AI_CHAT_DO"
class_name = "AiChatDo"
script_name = "scp-latom-node-api"

[[durable_objects.bindings]]
name = "AI_QUEUE_DO"
class_name = "AiQueueDo"
script_name = "scp-latom-node-api"
```

The database binding is available as `c.env.DB` in route handlers.

## Domain Configuration

| Service | Domain | Platform |
| ------- | ------ | -------- |
| Frontend | `scp-docs.scp.lat` | Cloudflare Pages |
| Backend API | `api.scp.lat` | Cloudflare Workers |
| Admin Dashboard | `admin.scp.lat` | Cloudflare Pages |

The `CORS_ORIGINS` variable must include all frontend domains. Default configuration:

```
https://node.scp.lat,https://api.scp.lat,https://scp-docs.pages.dev,https://*.scp-docs.pages.dev,http://localhost:5173,http://localhost:8085
```

## Local Development

### Frontend

```bash
npm run dev    # Vite dev server on http://localhost:8085
```

### Backend

```bash
cd worker
npm run dev              # Wrangler dev server
npm run db:schema:local  # Initialize local D1 database
```

### Admin Dashboard

```bash
cd admin
npm run dev    # Admin dev server
```

### Full Check

```bash
make ci        # typecheck + test + build
make test      # Run all tests
make typecheck # Type-check only
```

## Production Checklist

Before deploying to production:

1. [ ] Change `JWT_SECRET` in `wrangler.toml` to a strong, unique secret
2. [ ] Set `GLM_API_KEY` for AI chat functionality
3. [ ] Verify `CORS_ORIGINS` only includes your actual domains
4. [ ] Ensure D1 database bindings are correctly configured
5. [ ] Run `make ci` to verify all checks pass
6. [ ] Test authentication flows end-to-end
7. [ ] Verify the database schema is up to date (`npm run db:schema`)
8. [ ] Verify Durable Object bindings are configured
