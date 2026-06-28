import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { requestLogger } from '../logger'
import type { Env } from '../../types'

// Mock D1Database
function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
    } as unknown as D1Database,
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    ...overrides,
  } as Env
}

describe('requestLogger middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sets X-Request-Id header on response', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test', undefined, env)
    expect(res.headers.get('X-Request-Id')).toBeDefined()
    expect(res.headers.get('X-Request-Id')!.length).toBeGreaterThan(0)
  })

  it('logs request and response', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/test', (c) => c.json({ ok: true }))

    await app.request('/test', undefined, env)

    // Should have logged request start and response
    expect(console.log).toHaveBeenCalledTimes(2)

    const requestLog = JSON.parse((console.log as any).mock.calls[0][0])
    expect(requestLog.message).toBe('GET /test')
    expect(requestLog.level).toBe('info')

    const responseLog = JSON.parse((console.log as any).mock.calls[1][0])
    expect(responseLog.message).toMatch(/GET \/test → 200/)
  })

  it('logs 4xx responses as warn', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/not-found', (c) => c.json({ error: 'nope' }, 404))

    await app.request('/not-found', undefined, env)

    // First call is info (request), second should be warn (404 response)
    expect(console.warn).toHaveBeenCalledOnce()
    const warnLog = JSON.parse((console.warn as any).mock.calls[0][0])
    expect(warnLog.message).toMatch(/→ 404/)
  })

  it('logs 5xx responses as error', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/crash', (c) => {
      c.status(500)
      return c.json({ error: 'boom' })
    })

    await app.request('/crash', undefined, env)

    expect(console.error).toHaveBeenCalledOnce()
    const errorLog = JSON.parse((console.error as any).mock.calls[0][0])
    expect(errorLog.message).toMatch(/→ 500/)
  })

  it('attaches logger to context', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/test', (c) => {
      const logger = (c as any).get('logger')
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      return c.json({ ok: true })
    })

    await app.request('/test', undefined, env)
  })

  it('uses cf-ray header as request ID when available', async () => {
    const env = createMockEnv()
    const app = new Hono<{ Bindings: Env }>()

    app.use('/*', async (c, next) => {
      const middleware = requestLogger(c.env)
      return middleware(c as any, next)
    })
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request(
      new Request('http://localhost/test', {
        headers: { 'cf-ray': 'test-ray-id-123' },
      }),
      undefined,
      env
    )

    expect(res.headers.get('X-Request-Id')).toBe('test-ray-id-123')
  })
})
