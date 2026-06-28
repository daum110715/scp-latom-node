import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import historyRoutes from '../history'
import { signToken } from '../../utils/jwt'
import type { Env, JwtPayload } from '../../types'

const TEST_SECRET = 'test-history-secret'

interface ApiResponse {
  success: boolean
  error?: string
  entries?: any[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
}

function createMockDB(
  data: {
    historyRows?: any[]
    countResult?: { total: number }
    existingEntry?: any
  } = {},
) {
  const { historyRows = [], countResult, existingEntry } = data

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
          if (sql.includes('COUNT(*)')) {
            return countResult ?? { total: historyRows.length }
          }
          if (sql.includes('SELECT id FROM browsing_history WHERE id = ? AND user_id = ?')) {
            return existingEntry ?? (historyRows.length > 0 ? { id: historyRows[0].id } : null)
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          return { results: historyRows }
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
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    AI_CHAT_DO: {} as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: '',
  }
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()
  app.route('/api/history', historyRoutes)
  return app
}

async function signTestToken(sub = 1) {
  return signToken({ sub, codename: 'test_agent', role: 'personnel', clearance: 1 }, TEST_SECRET)
}

describe('History Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token on GET /', async () => {
      const res = await app.request('/api/history', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns 401 without token on POST /', async () => {
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'en', scpNumber: 173 }),
        },
        createEnv(),
      )
      expect(res.status).toBe(401)
    })

    it('returns 401 without token on DELETE /:id', async () => {
      const res = await app.request('/api/history/1', { method: 'DELETE' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/history', () => {
    it('returns paginated history entries', async () => {
      const token = await signTestToken()
      const rows = [
        {
          id: 1,
          user_id: 1,
          language: 'en',
          scp_number: 173,
          name: 'The Sculpture',
          object_class: 'Euclid',
          visited_at: '2026-06-26T00:00:00',
        },
        {
          id: 2,
          user_id: 1,
          language: 'en',
          scp_number: 999,
          name: 'Tickle Monster',
          object_class: 'Safe',
          visited_at: '2026-06-25T00:00:00',
        },
      ]
      const env = createEnv({ historyRows: rows, countResult: { total: 2 } })
      const res = await app.request(
        '/api/history',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.entries).toHaveLength(2)
      expect(body.total).toBe(2)
      expect(body.page).toBe(1)
    })

    it('supports pagination parameters', async () => {
      const token = await signTestToken()
      const env = createEnv({ historyRows: [], countResult: { total: 100 } })
      const res = await app.request(
        '/api/history?page=2&limit=10',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.page).toBe(2)
      expect(body.limit).toBe(10)
      expect(body.totalPages).toBe(10)
    })

    it('supports language filter', async () => {
      const token = await signTestToken()
      const env = createEnv({ historyRows: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/history?lang=cn',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
      const body = await res.json<ApiResponse>()
      expect(body.success).toBe(true)
    })
  })

  describe('POST /api/history', () => {
    it('records a history entry', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            language: 'en',
            scpNumber: 173,
            name: 'The Sculpture',
            objectClass: 'Euclid',
          }),
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('rejects invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: 'fr', scpNumber: 173 }),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.success).toBe(false)
      expect(body.error).toContain('language')
    })

    it('rejects missing language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scpNumber: 173 }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects invalid scpNumber', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: 'en', scpNumber: 0 }),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('positive integer')
    })

    it('rejects missing scpNumber', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: 'en' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/history/:id', () => {
    it('deletes a history entry', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingEntry: { id: 1 } })
      const res = await app.request(
        '/api/history/1',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('returns 400 for invalid id', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history/abc',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Invalid id')
    })

    it('returns 404 when entry not found', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingEntry: null })
      const res = await app.request(
        '/api/history/999',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/history', () => {
    it('clears all history', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/history',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })
  })
})
