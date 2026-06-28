import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import logRoutes from '../logs'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-logs-secret'

function createMockDB(data: {
  logRows?: any[]
  log?: any
  countResult?: { total: number }
  stats?: { byLevel: any[]; bySource: any[]; byCategory: any[]; errorRate: any }
  deleteCount?: { count: number }
} = {}) {
  const { logRows = [], log = null, countResult, stats, deleteCount } = data

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
          if (sql.includes('COUNT(*)') && sql.includes('WHERE timestamp <')) return deleteCount ?? { count: 0 }
          if (sql.includes('COUNT(*)')) return countResult ?? { total: logRows.length }
          if (sql.includes('SUM(CASE WHEN level')) return stats?.errorRate ?? { total: 0, errors: 0 }
          if (sql.includes('SELECT * FROM system_logs WHERE id')) return log
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('GROUP BY level')) return { results: stats?.byLevel ?? [] }
          if (sql.includes('GROUP BY source')) return { results: stats?.bySource ?? [] }
          if (sql.includes('GROUP BY category')) return { results: stats?.byCategory ?? [] }
          if (sql.includes('FROM system_logs')) return { results: logRows }
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
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    AI_CHAT_DO: {} as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: '',
  }
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()
  app.use('/api/admin/logs/*', adminMiddleware)
  app.route('/api/admin/logs', logRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Log Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/admin/logs', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/logs', () => {
    it('returns paginated logs', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [{ id: 1, level: 'error', message: 'Test error' }], countResult: { total: 1 } })
      const res = await app.request('/api/admin/logs', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.logs).toHaveLength(1)
    })

    it('supports level filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?level=error', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports source filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?source=client', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports search query', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?q=error', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports category filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?category=auth', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports userId filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?userId=1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('ignores non-numeric userId', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?userId=abc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports from date filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?from=2026-01-01', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports to date filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?to=2026-12-31', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports from and to date range', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?from=2026-01-01&to=2026-06-30', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports sort by level', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?sort=level', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('supports ascending order', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?order=asc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('defaults to timestamp sort descending', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('ignores invalid level filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?level=invalid', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })

    it('ignores invalid source filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ logRows: [], countResult: { total: 0 } })
      const res = await app.request('/api/admin/logs?source=invalid', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/admin/logs/stats', () => {
    it('returns log statistics', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        stats: {
          byLevel: [{ level: 'error', count: 10 }],
          bySource: [{ source: 'server', count: 5 }],
          byCategory: [{ category: 'system', count: 3 }],
          errorRate: { total: 100, errors: 10 },
        },
      })
      const res = await app.request('/api/admin/logs/stats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.stats.byLevel).toBeDefined()
      expect(body.stats.errorRate).toBeDefined()
    })
  })

  describe('GET /api/admin/logs/:id', () => {
    it('returns a single log entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({ log: { id: 1, level: 'error', message: 'Test' } })
      const res = await app.request('/api/admin/logs/1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.log.id).toBe(1)
    })

    it('returns 400 for invalid ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request('/api/admin/logs/abc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent log', async () => {
      const token = await signAdminToken()
      const env = createEnv({ log: null })
      const res = await app.request('/api/admin/logs/999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/logs/cleanup', () => {
    it('deletes old logs', async () => {
      const token = await signAdminToken()
      const env = createEnv({ deleteCount: { count: 50 } })
      const res = await app.request('/api/admin/logs/cleanup?days=30', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.deleted).toBe(50)
      expect(body.message).toContain('30 days')
    })
  })
})
