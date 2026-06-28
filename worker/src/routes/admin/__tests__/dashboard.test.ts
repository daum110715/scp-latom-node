import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import dashboardRoutes from '../dashboard'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-dashboard-secret'

function createMockDB() {
  const responses: Record<string, any> = {
    users: { count: 150 },
    entriesByLanguage: { results: [{ language: 'en', count: 7999 }, { language: 'cn', count: 5200 }] },
    entriesByClass: { results: [{ object_class: 'Safe', count: 2500 }] },
    proposalsByStatus: { results: [{ status: 'open', count: 10 }] },
    newUsers: { count: 3 },
    newProposals: { count: 1 },
    newVotes: { count: 12 },
    errors: { count: 2 },
    errorRate: { total: 1000, errors: 5 },
  }

  let callIndex = 0
  const callOrder = ['users', 'entriesByLanguage', 'entriesByClass', 'proposalsByStatus', 'newUsers', 'newProposals', 'newVotes', 'errors', 'errorRate']

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
          const key = callOrder[callIndex % callOrder.length]
          callIndex++
          if (sql.includes('GROUP BY')) return null
          return responses[key] ?? { count: 0 }
        },
        all: async (): Promise<{ results: any[] }> => {
          const key = callOrder[callIndex % callOrder.length]
          callIndex++
          return responses[key]?.results ?? { results: [] }
        },
      }
      return stmt
    },
  }
}

function createEnv(): Env {
  return {
    DB: createMockDB() as any,
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
  app.use('/api/admin/stats/*', adminMiddleware)
  app.route('/api/admin/stats', dashboardRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Dashboard Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('GET /api/admin/stats', () => {
    it('requires admin authentication', async () => {
      const res = await app.request('/api/admin/stats', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns stats for admin users', async () => {
      const token = await signAdminToken()
      const res = await app.request('/api/admin/stats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, createEnv())
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.stats).toBeDefined()
      expect(body.stats.totalUsers).toBeDefined()
      expect(body.stats.recentActivity).toBeDefined()
      expect(body.stats.logErrorRate).toBeDefined()
    })
  })
})
