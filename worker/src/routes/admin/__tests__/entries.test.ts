import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import entryRoutes from '../entries'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-entries-secret'

const mockEntry = {
  id: 1,
  scp_number: 173,
  language: 'en',
  name: 'The Sculpture',
  object_class: 'Euclid',
  url: 'https://scp-wiki.wikidot.com/scp-173',
  series: 1,
  has_content: 1,
  content_fetched_at: '2026-06-26',
  content_error: null,
  created_at: '2026-06-26',
  updated_at: '2026-06-26',
}

function createMockDB(data: {
  entries?: any[]
  entry?: any
  countResult?: { total: number }
} = {}) {
  const { entries = [], entry = null, countResult } = data

  return {
    prepare: (sql: string) => {
      const stmt = {
        _sql: sql,
        _params: [] as any[],
        bind(...params: any[]) {
          stmt._params = params
          return stmt
        },
        first: async (): Promise<any> => {
          if (sql.includes('COUNT(*)')) return countResult ?? { total: entries.length }
          if (sql.includes('SELECT * FROM scp_entries WHERE id = ?')) return entry
          if (sql.includes('SELECT id FROM scp_entries WHERE id = ?')) return entry ? { id: entry.id } : null
          if (sql.includes('SELECT id, scp_number, language FROM scp_entries')) return entry
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM scp_entries')) return { results: entries }
          return { results: [] }
        },
        run: async () => ({ meta: { changes: 1 } }),
      }
      return stmt
    },
  }
}

function createEnv(dbOverrides?: Parameters<typeof createMockDB>[0]): Env {
  return {
    DB: createMockDB(dbOverrides) as any,
    JWT_SECRET: TEST_SECRET,
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: { idFromName: () => 'id', get: () => ({ fetch: async () => new Response(JSON.stringify({ success: true })) }) } as any,
    SCP_CN_CRAWLER: { idFromName: () => 'id', get: () => ({ fetch: async () => new Response(JSON.stringify({ success: true })) }) } as any,
    AI_CHAT_DO: {} as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: '',
  }
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()
  app.use('/api/admin/entries/*', adminMiddleware)
  app.route('/api/admin/entries', entryRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Entry Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/admin/entries', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/entries', () => {
    it('returns paginated entries', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entries: [mockEntry], countResult: { total: 1 } })
      const res = await app.request('/api/admin/entries', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(1)
    })

    it('supports search by number', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entries: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/entries?q=173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports language filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entries: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/entries?language=en', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports object class filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entries: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/entries?object_class=Keter', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/admin/entries/:id', () => {
    it('returns entry detail', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: mockEntry })
      const res = await app.request('/api/admin/entries/1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.entry.scp_number).toBe(173)
    })

    it('returns 400 for invalid ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request('/api/admin/entries/abc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: null })
      const res = await app.request('/api/admin/entries/999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/entries/:id', () => {
    it('updates entry name', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: mockEntry })
      const res = await app.request('/api/admin/entries/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Updated Name' }),
      }, env)
      expect(res.status).toBe(200)
    })

    it('rejects invalid object class', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: mockEntry })
      const res = await app.request('/api/admin/entries/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ object_class: 'Invalid' }),
      }, env)
      expect(res.status).toBe(400)
    })

    it('rejects when no fields provided', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: mockEntry })
      const res = await app.request('/api/admin/entries/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      }, env)
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/admin/entries/:id', () => {
    it('deletes an entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: mockEntry })
      const res = await app.request('/api/admin/entries/1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('deleted')
    })

    it('returns 404 for nonexistent entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: null })
      const res = await app.request('/api/admin/entries/999', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/entries/:id/refetch', () => {
    it('triggers refetch', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: { id: 1, scp_number: 173, language: 'en' } })
      const res = await app.request('/api/admin/entries/1/refetch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('re-fetch triggered')
    })
  })
})
