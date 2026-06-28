import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import settingsRoutes from '../settings'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-settings-secret'

function createMockDB() {
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
          if (sql.includes('COUNT(*)')) return { count: 42 }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('crawl_state')) return { results: [{ language: 'en', status: 'idle' }] }
          return { results: [] }
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
    CORS_ORIGINS: 'https://scp.lat,https://api.scp.lat',
    LOG_LEVEL: 'info',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    AI_CHAT_DO: {} as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: '',
  } as Env
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>()
  app.use('/api/admin/settings/*', adminMiddleware)
  app.route('/api/admin/settings', settingsRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Settings Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('GET /api/admin/settings', () => {
    it('requires admin authentication', async () => {
      const res = await app.request('/api/admin/settings', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns system settings', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/settings',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.settings).toBeDefined()
      expect(body.settings.database).toBeDefined()
      expect(body.settings.database.tables).toBeDefined()
      expect(body.settings.cors).toBeDefined()
      expect(body.settings.cors).toContain('https://scp.lat')
      expect(body.settings.totals).toBeDefined()
      expect(body.settings.crawlStates).toBeDefined()
    })
  })
})
