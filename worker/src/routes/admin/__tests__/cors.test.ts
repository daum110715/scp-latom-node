import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import corsRoute from '../cors'
import { invalidateDynamicOriginsCache } from '../../../utils/cors-origins'
import { createMockNamespace } from '../../../test-helpers'
import type { Env, CorsOriginRecord } from '../../../types'

function createMockDB() {
  const rows: CorsOriginRecord[] = []
  let nextId = 1

  return {
    prepare(sql: string) {
      const stmt = {
        _params: [] as unknown[],
        bind(...params: unknown[]) {
          stmt._params = params
          return stmt
        },
        async first<T>(): Promise<T | null> {
          if (sql.includes('SELECT id FROM cors_origins WHERE origin')) {
            const [origin] = stmt._params as [string]
            return (rows.find((r) => r.origin === origin) as T) ?? null
          }
          if (sql.includes('SELECT id FROM cors_origins WHERE id')) {
            const [id] = stmt._params as [number]
            return (rows.find((r) => r.id === id) as T) ?? null
          }
          if (sql.includes('INSERT INTO cors_origins')) {
            const [origin] = stmt._params as [string]
            const row: CorsOriginRecord = {
              id: nextId++,
              origin,
              created_at: new Date().toISOString(),
            }
            rows.push(row)
            return row as T
          }
          return null
        },
        async all<T>(): Promise<{ results: T[] }> {
          return { results: [...rows].reverse() as T[] }
        },
        async run() {
          if (sql.includes('DELETE FROM cors_origins')) {
            const [id] = stmt._params as [number]
            const idx = rows.findIndex((r) => r.id === id)
            if (idx >= 0) rows.splice(idx, 1)
          }
          return {}
        },
      }
      return stmt
    },
  }
}

function createEnv(db: ReturnType<typeof createMockDB>, corsOrigins = 'https://scp.lat'): Env {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DB: db as any as D1Database,
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: corsOrigins,
    SCP_EN_CRAWLER: createMockNamespace(),
    SCP_CN_CRAWLER: createMockNamespace(),
  } as Env
}

function createApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/admin/cors', corsRoute)
  return app
}

async function postJson(app: Hono<{ Bindings: Env }>, env: Env, body: unknown) {
  return app.request(
    new Request('http://localhost/api/admin/cors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    undefined,
    env,
  )
}

describe('admin CORS routes', () => {
  beforeEach(() => {
    invalidateDynamicOriginsCache()
  })

  it('GET / returns the static and dynamic origin lists', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db, 'https://scp.lat,https://api.scp.lat')

    const res = await app.request(new Request('http://localhost/api/admin/cors'), undefined, env)
    const data = await res.json<{ success: boolean; static: string[]; dynamic: unknown[] }>()

    expect(res.status).toBe(200)
    expect(data.static).toEqual(['https://scp.lat', 'https://api.scp.lat'])
    expect(data.dynamic).toEqual([])
  })

  it('POST / adds a valid origin', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    const res = await postJson(app, env, { origin: 'https://daum.pw' })
    const data = await res.json<{ success: boolean; origin: { origin: string } }>()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.origin.origin).toBe('https://daum.pw')
  })

  it('POST / accepts a wildcard subdomain origin', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    const res = await postJson(app, env, { origin: 'https://*.daum.pw' })

    expect(res.status).toBe(200)
  })

  it('POST / rejects an invalid origin format', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    const res = await postJson(app, env, { origin: 'not-a-url' })
    const data = await res.json<{ success: boolean; error: string }>()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('POST / rejects a duplicate origin', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    await postJson(app, env, { origin: 'https://daum.pw' })
    const res = await postJson(app, env, { origin: 'https://daum.pw' })
    const data = await res.json<{ success: boolean; error: string }>()

    expect(res.status).toBe(400)
    expect(data.error).toContain('already exists')
  })

  it('DELETE /:id removes an existing origin', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    const addRes = await postJson(app, env, { origin: 'https://daum.pw' })
    const added = await addRes.json<{ origin: { id: number } }>()

    const res = await app.request(
      new Request(`http://localhost/api/admin/cors/${added.origin.id}`, { method: 'DELETE' }),
      undefined,
      env,
    )
    const data = await res.json<{ success: boolean }>()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('DELETE /:id returns 404 for a non-existent origin', async () => {
    const app = createApp()
    const db = createMockDB()
    const env = createEnv(db)

    const res = await app.request(
      new Request('http://localhost/api/admin/cors/999', { method: 'DELETE' }),
      undefined,
      env,
    )

    expect(res.status).toBe(404)
  })
})
