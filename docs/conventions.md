# Code Conventions

This document describes the coding standards and conventions used in the SCP Docs project. Following these conventions ensures consistency across the codebase.

## TypeScript

### General

- Strict mode is enabled (`tsconfig.json`: `strict: true`)
- Use TypeScript for all new files (`.ts` for logic, `.vue` for components)
- Prefer `interface` over `type` for object shapes
- Use `enum` for finite sets of named values (see `ErrorCode` in `src/services/errors.ts`)

### Path Aliases

`@` is aliased to `src/` in both Vite and TypeScript:

```ts
import { useAuthStore } from '@/stores/auth'
import type { ScpEntry } from '@/types'
```

## Vue Components

### Script Setup

All components use `<script setup lang="ts">`:

```vue
<script setup lang="ts">
// Component logic here
</script>
```

### Composition API

- Use composables for shared logic (`useLocale`, `useTheme`)
- Use Pinia stores for global state (`auth`, `search`)
- Prefer `ref()` over `reactive()` for primitives
- Use `computed()` for derived values

### Component Organization

Single-file components (`.vue`) follow this order:

1. `<template>`
2. `<script setup lang="ts">`
3. `<style scoped>`

### Naming Conventions

| Category       | Convention                   | Example                    |
| -------------- | ---------------------------- | -------------------------- |
| Components     | PascalCase                   | `Badge.vue`, `AppHeader.vue` |
| Composables    | camelCase with `use` prefix  | `useLocale.ts`             |
| Stores         | camelCase                    | `auth.ts`, `search.ts`     |
| Views          | PascalCase with `View` suffix | `HomeView.vue`            |
| CSS classes    | kebab-case                   | `.entry-card`, `.stat-grid` |

## CSS

### Custom Properties

Use CSS custom properties from `variables.css` for all colors, spacing, and typography. Never hardcode values that exist as tokens:

```css
/* Correct */
.card {
  color: var(--text-primary);
  padding: var(--space-md);
  border-radius: var(--radius-md);
}

/* Avoid */
.card {
  color: #e8e8ec;
  padding: 16px;
  border-radius: 10px;
}
```

See the [Design System](design-system.md) for the full token reference.

### Scoped Styles

Use `<style scoped>` for component-specific styles. Global styles go in `src/styles/base.css`.

### Responsive Design

Use the `--pad-page` token for responsive page padding:

```css
.page {
  padding: 0 var(--pad-page);
}
```

Prefer `clamp()` and CSS functions over media queries where possible.

## Project Structure

### Frontend (root)

| Directory         | Purpose                              |
| ----------------- | ------------------------------------ |
| `src/views/`      | Page-level components (one per route) |
| `src/components/` | Shared components, organized by domain |
| `src/stores/`     | Pinia stores (auth, search)          |
| `src/composables/`| Vue composables (useLocale, useTheme) |
| `src/data/`       | Static mock data                     |
| `src/services/`   | API client layer                     |
| `src/locales/`    | i18n translation files               |
| `src/types/`      | TypeScript interfaces                |
| `src/styles/`     | CSS tokens and base styles           |
| `src/router/`     | Vue Router configuration             |

### Backend (`worker/`)

| Directory           | Purpose                          |
| ------------------- | -------------------------------- |
| `src/index.ts`      | Hono app entry, CORS, routes    |
| `src/routes/`       | API routes (one file per resource) |
| `src/middleware/`    | Middleware (JWT auth)            |
| `src/utils/`        | Utilities (JWT, password hashing) |
| `src/types.ts`      | TypeScript interfaces            |

## Testing Conventions

### File Placement

Tests are in `__tests__/` directories adjacent to the code they test:

```
src/stores/auth.ts           → src/stores/__tests__/auth.test.ts
src/components/common/Badge.vue → src/components/common/__tests__/Badge.test.ts
worker/src/utils/jwt.ts      → worker/src/utils/__tests__/jwt.test.ts
```

### Naming

- Test files: `*.test.ts`
- Test descriptions: describe expected behavior (e.g., "should reject invalid codenames")

### Mocking

- Mock API calls in store tests
- Mock D1 database in backend tests
- Use `createPinia()` for store isolation in component tests

## Git Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Scopes:** `frontend`, `backend`, `auth`, `i18n`, `ui`, `api`, `docs`

**Examples:**

```
feat(auth): add profile editing endpoint
fix(cors): handle wildcard subdomain matching
docs: add architecture documentation
test(auth): add login flow unit tests
```

### Branch Naming

```
feat/description
fix/description
docs/description
refactor/description
```
