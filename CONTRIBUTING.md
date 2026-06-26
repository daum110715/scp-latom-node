# Contributing to SCP Docs

Thank you for your interest in contributing to SCP Docs! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/scp-docs.git
   cd scp-docs
   ```
3. **Install** dependencies:
   ```bash
   make install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feat/your-feature
   ```

## Development Workflow

### Frontend (root directory)

```bash
npm run dev        # Start dev server on http://localhost:8085
npm run test       # Run tests
npm run build      # Type-check + build
```

### Backend (`worker/` directory)

```bash
cd worker
npm run dev              # Start Wrangler dev server
npm run test             # Run tests
npm run deploy           # Deploy to Cloudflare Workers
npm run db:schema:local  # Apply schema to local D1 database
```

### Run All Checks

```bash
make ci            # typecheck + test + build
make test          # Run all tests
make typecheck     # Type-check only
```

## Making Changes

### Branch Naming

Use descriptive branch names with a type prefix:

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes
- `refactor/description` — Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Examples:**

```
feat(auth): add profile editing endpoint
fix(cors): handle wildcard subdomain matching
docs: add architecture documentation
test(auth): add login flow unit tests
```

### Code Style

- Vue 3 `<script setup>` with Composition API
- TypeScript strict mode
- CSS custom properties from `variables.css` for all styling
- No external CSS frameworks

See [Code Conventions](docs/conventions.md) for the full style guide.

### Adding a New Page

1. Create view in `src/views/` (e.g., `MyNewView.vue`)
2. Add route in `src/router/index.ts`:
   ```ts
   {
     path: '/my-new',
     name: 'my-new',
     component: () => import('@/views/MyNewView.vue'),
     meta: { titleKey: 'nav.myNew' },
   }
   ```
3. Add i18n keys to both `src/locales/en.ts` and `src/locales/zh.ts`
4. Add navigation link in `AppSidebar.vue` if needed
5. Add tests in `src/views/__tests__/`

### Adding a New API Endpoint

1. Add route in `worker/src/routes/` (create new file if needed):
   ```ts
   import { Hono } from 'hono'
   import { authMiddleware } from '../middleware/auth'
   import type { Env } from '../types'

   const resource = new Hono<{ Bindings: Env }>()

   resource.get('/', authMiddleware, async (c) => {
     // ...
   })

   export default resource
   ```
2. Mount the route in `worker/src/index.ts`
3. Add types in `worker/src/types.ts` if needed
4. Add tests in `worker/src/routes/__tests__/`
5. Update `docs/api-reference.md`

### Adding i18n Translations

1. Add keys to `src/locales/en.ts` (English is the source of truth)
2. Add corresponding keys to `src/locales/zh.ts`
3. Use in components: `$t('namespace.key')` or `t('namespace.key')` via `useI18n()`

See [Internationalization Guide](docs/i18n.md) for details.

## Testing

- **Frontend:** `npm run test` (Vitest + happy-dom)
- **Backend:** `cd worker && npm run test` (Vitest)
- **Coverage:** `make coverage`

See [Testing Guide](docs/testing.md) for the full guide, including patterns for writing component, store, and API tests.

## Pull Request Process

1. Ensure `make ci` passes locally
2. Update documentation if behavior changed
3. Update `CHANGELOG.md` under `[Unreleased]`
4. Open PR against `main`
5. CI must pass (frontend + backend jobs)
6. Require at least one review

## Reporting Bugs

Use [GitHub Issues](https://github.com/scp-docs/scp-docs/issues). Include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (browser, OS, Node.js version)

## Suggesting Features

Open a GitHub Issue with the `enhancement` label. Describe:

- The use case (what problem does it solve?)
- Proposed solution
- Alternatives considered

## Security Vulnerabilities

**Do NOT open a public Issue for security vulnerabilities.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.
