import type {
  D1Database,
  DurableObjectNamespace,
  DurableObjectId,
  DurableObjectState,
} from '@cloudflare/workers-types'
import type { Logger } from './utils/logger'
import type { Env } from './types'

/**
 * Creates a minimal mock D1Database with fluent `prepare().bind().first/all/run` chain.
 * Only the methods commonly used in tests are stubbed; missing D1 methods (exec, withSession, dump)
 * are intentionally omitted for test brevity.
 */
export function createMockD1Database(): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({}),
      }),
    }),
    batch: async () => [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as D1Database
}

/**
 * Creates a mock DurableObjectNamespace with optional overrides for idFromName and get.
 */
export function createMockNamespace(overrides?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idFromName?: (...args: any[]) => any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get?: (...args: any[]) => any
}): DurableObjectNamespace {
  return {
    idFromName: overrides?.idFromName ?? (() => createMockDurableObjectId()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: overrides?.get ?? (() => ({ fetch: async () => new Response() }) as any),
    newUniqueId: () => createMockDurableObjectId(),
    namespaceId: createMockDurableObjectId(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jurisdiction: () => undefined as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as DurableObjectNamespace
}

/**
 * Creates a mock DurableObjectId. Since DurableObjectId is a branded opaque type,
 * we assign a string value and cast.
 */
export function createMockDurableObjectId(id = 'mock-id'): DurableObjectId {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.assign(id, {}) as any as DurableObjectId
}

/**
 * Creates a mock DurableObjectState with minimal storage support.
 */
export function createMockDurableObjectState(
  storageOverrides?: Record<string, unknown>,
): DurableObjectState {
  const store = new Map<string, unknown>(Object.entries(storageOverrides ?? {}))
  return {
    storage: {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: unknown) => store.set(key, value),
      delete: async (key: string) => store.delete(key),
      setAlarm: async () => {},
      getAlarm: async () => null,
    },
    id: createMockDurableObjectId(),
    blockConcurrencyWhile: async (fn: () => Promise<void>) => fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as DurableObjectState
}

/**
 * Creates a mock Logger that satisfies the Logger type.
 */
export function createMockLogger(): Logger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    child: () => createMockLogger(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Logger
}

/**
 * Creates a minimal Env object suitable for tests that don't use
 * every Env field. Override individual fields as needed.
 */
export function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: createMockD1Database(),
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: createMockNamespace(),
    SCP_CN_CRAWLER: createMockNamespace(),
    AI_CHAT_DO: createMockNamespace(),
    AI_QUEUE_DO: createMockNamespace(),
    GLM_API_KEY: 'test-glm-key',
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as Env
}
