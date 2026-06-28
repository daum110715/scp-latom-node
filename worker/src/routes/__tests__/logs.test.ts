import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import logsRoute from '../logs'
import type { Env } from '../../types'

function createMockEnv(overrides?: Partial<Env>): Env {
  return {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
    } as unknown as D1Database,
    JWT_SECRET: 'test-secret-key-at-least-32-chars-long',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    ...overrides,
  } as Env
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/logs', logsRoute)
  return app
}

describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('accepts valid log batch and returns counts', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            { level: 'warn', message: 'test warning', timestamp: new Date().toISOString() },
            { level: 'error', message: 'test error', timestamp: new Date().toISOString() },
            { level: 'info', message: 'info ignored', timestamp: new Date().toISOString() },
          ],
        }),
      }),
      undefined,
      env
    )

    expect(res.status).toBe(200)
    const data = await res.json<{ success: boolean; received: number; persisted: number }>()
    expect(data.success).toBe(true)
    expect(data.received).toBe(3)
    expect(data.persisted).toBe(2) // Only warn + error
  })

  it('returns 400 for missing logs array', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      undefined,
      env
    )

    expect(res.status).toBe(400)
    const data = await res.json<{ success: boolean; error: string }>()
    expect(data.success).toBe(false)
    expect(data.error).toContain('Missing or empty')
  })

  it('returns 400 for empty logs array', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: [] }),
      }),
      undefined,
      env
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      undefined,
      env
    )

    expect(res.status).toBe(400)
  })

  it('returns 400 for batch exceeding max size', async () => {
    const app = createApp()
    const env = createMockEnv()

    const logs = Array.from({ length: 51 }, (_, i) => ({
      level: 'error',
      message: `error ${i}`,
    }))

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      }),
      undefined,
      env
    )

    expect(res.status).toBe(400)
    const data = await res.json<{ error: string }>()
    expect(data.error).toContain('Too many')
  })

  it('skips entries with invalid level', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            { level: 'invalid', message: 'test' },
            { level: 'warn', message: 'valid' },
          ],
        }),
      }),
      undefined,
      env
    )

    const data = await res.json<{ received: number; persisted: number }>()
    expect(data.received).toBe(2)
    expect(data.persisted).toBe(1) // Only the valid warn entry
  })

  it('skips entries with empty or too-long messages', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            { level: 'error', message: '' },
            { level: 'error', message: 'x'.repeat(2001) },
            { level: 'error', message: 'valid message' },
          ],
        }),
      }),
      undefined,
      env
    )

    const data = await res.json<{ received: number; persisted: number }>()
    expect(data.received).toBe(3)
    expect(data.persisted).toBe(1)
  })

  it('accepts debug/info entries without persisting them', async () => {
    const app = createApp()
    const env = createMockEnv()

    const res = await app.request(
      new Request('http://localhost/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: [
            { level: 'debug', message: 'debug msg' },
            { level: 'info', message: 'info msg' },
          ],
        }),
      }),
      undefined,
      env
    )

    const data = await res.json<{ received: number; persisted: number }>()
    expect(data.received).toBe(2)
    expect(data.persisted).toBe(0)
  })
})
