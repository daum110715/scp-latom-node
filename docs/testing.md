# Testing Guide

The project uses [Vitest](https://vitest.dev/) for both frontend and backend testing. Tests are co-located with source files in `__tests__/` directories.

## Quick Reference

```bash
# Run all tests (frontend + backend)
make test

# Frontend tests only
npm run test
npm run test:watch        # Watch mode

# Backend tests only
cd worker && npm test
cd worker && npm run test:watch

# Tests with coverage
make coverage
```

## Frontend Testing

### Setup

| Tool | Purpose |
| ---- | ------- |
| Vitest | Test runner |
| happy-dom | DOM environment |
| @vue/test-utils | Vue component testing utilities |

Configuration: `vite.config.ts` (test section)
Globals: enabled — `describe`, `it`, `expect` available without import

### Test File Locations (15 files)

Tests are in `__tests__/` directories adjacent to the code they test:

```
src/components/common/__tests__/Badge.test.ts
src/components/common/__tests__/Card.test.ts
src/components/common/__tests__/ClassBar.test.ts
src/composables/__tests__/useLocale.test.ts
src/composables/__tests__/useTheme.test.ts
src/data/__tests__/documents.test.ts
src/data/__tests__/entries.test.ts
src/locales/__tests__/i18n.test.ts
src/services/__tests__/api.test.ts
src/services/__tests__/logger.test.ts
src/services/__tests__/response.test.ts
src/stores/__tests__/auth.test.ts
src/stores/__tests__/search.test.ts
src/views/__tests__/LoginView.test.ts
src/views/__tests__/RegisterView.test.ts
```

### Writing Component Tests

Use `@vue/test-utils` to mount and assert on Vue components:

```ts
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import Badge from '../Badge.vue'

describe('Badge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the label text', () => {
    const wrapper = mount(Badge, {
      props: { label: 'Safe', variant: 'safe' },
    })
    expect(wrapper.text()).toContain('Safe')
  })

  it('applies the correct variant class', () => {
    const wrapper = mount(Badge, {
      props: { label: 'Keter', variant: 'keter' },
    })
    expect(wrapper.classes()).toContain('badge--keter')
  })
})
```

### Writing Store Tests

Create a fresh Pinia instance per test to ensure isolation:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no user', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })
})
```

### Writing Composable Tests

Call composables within a Vue app context:

```ts
import { createApp } from 'vue'
import { useTheme } from '../useTheme'

describe('useTheme', () => {
  it('defaults to dark theme', () => {
    // Test composable behavior
    // ...
  })
})
```

### Coverage

```bash
make coverage
```

Coverage reports: text (terminal), lcov, json-summary
Output directory: `coverage/`

**Exclusions:** `__tests__/`, `main.ts`, `i18n.ts`, `styles/`, `locales/`, `types/`

## Backend Testing

### Setup

| Tool | Purpose |
| ---- | ------- |
| Vitest | Test runner |

Configuration: `worker/vitest.config.ts`
Globals: enabled

### Test File Locations (10 files)

```
worker/src/__tests__/index.test.ts
worker/src/do/__tests__/ai-chat.test.ts
worker/src/do/__tests__/ai-queue.test.ts
worker/src/do/__tests__/parser.test.ts
worker/src/do/__tests__/scp-crawler.test.ts
worker/src/middleware/__tests__/logger.test.ts
worker/src/routes/__tests__/ai.test.ts
worker/src/routes/__tests__/auth.test.ts
worker/src/routes/__tests__/crawler.test.ts
worker/src/routes/__tests__/logs.test.ts
worker/src/tools/__tests__/executor.test.ts
worker/src/utils/__tests__/glm-client.test.ts
worker/src/utils/__tests__/jwt.test.ts
worker/src/utils/__tests__/logger.test.ts
worker/src/utils/__tests__/password.test.ts
```

### Writing API Tests

Import the Hono app directly and use `app.request()` to make HTTP requests:

```ts
import app from '../index'

describe('POST /api/auth/register', () => {
  it('creates a new user with valid input', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codename: 'test_user', password: 'password123' }),
    })

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user.codename).toBe('test_user')
    expect(body.token).toBeDefined()
  })
})
```

### Writing Utility Tests

Test utility functions directly:

```ts
import { hashPassword, verifyPassword } from '../password'

describe('Password Utils', () => {
  it('hashes and verifies passwords correctly', async () => {
    const hashed = await hashPassword('testpassword')
    const valid = await verifyPassword('testpassword', hashed)
    expect(valid).toBe(true)
  })

  it('rejects incorrect passwords', async () => {
    const hashed = await hashPassword('testpassword')
    const valid = await verifyPassword('wrongpassword', hashed)
    expect(valid).toBe(false)
  })
})
```

### Writing Durable Object Tests

Test Durable Objects with mocked storage and state:

```ts
import { ScpCrawlerDo } from '../scp-crawler'

describe('ScpCrawlerDo', () => {
  it('handles crawl requests', async () => {
    // Test DO behavior with mocked env and state
  })
})
```

## CI Integration

Both frontend and backend tests run in the CI pipeline:

- **Frontend job:** typecheck → test → build
- **Backend job:** typecheck → test

Both must pass before deployment. See [Deployment Guide](deployment.md) for pipeline details.

## Best Practices

- **Test behavior, not implementation** — assert on what the code does, not how it does it
- **One assertion per concept** — not literally one `expect`, but one logical point per test
- **Use descriptive test names** — explain the expected behavior (e.g., "should reject codenames with special characters")
- **Mock external dependencies** — API calls, database, localStorage
- **Keep tests fast and independent** — no shared state between tests
- **Use `beforeEach` for setup** — create fresh Pinia instances, clear mocks
