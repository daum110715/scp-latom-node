import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import userRoutes from '../users'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-users-secret'

const mockUser = {
  id: 1,
  codename: 'test_agent',
  role: 'personnel',
  clearance: 1,
  created_at: '2026-06-26T00:00:00',
  updated_at: '2026-06-26T00:00:00',
}

function createMockDB(
  data: {
    users?: any[]
    user?: any
    countResult?: { total: number }
    activityCounts?: { history: number; bookmarks: number; proposals: number; votes: number }
    historyRows?: any[]
    bookmarkRows?: any[]
  } = {},
) {
  const {
    users = [],
    user = null,
    countResult,
    activityCounts,
    historyRows = [],
    bookmarkRows = [],
  } = data

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
          if (sql.includes('COUNT(*)') && sql.includes('users WHERE')) {
            return countResult ?? { total: users.length }
          }
          if (sql.includes('COUNT(*)') && sql.includes('browsing_history')) {
            return { count: activityCounts?.history ?? 0 }
          }
          if (sql.includes('COUNT(*)') && sql.includes('bookmarks')) {
            return { count: activityCounts?.bookmarks ?? 0 }
          }
          if (sql.includes('COUNT(*)') && sql.includes('proposals WHERE user_id')) {
            return { count: activityCounts?.proposals ?? 0 }
          }
          if (sql.includes('COUNT(*)') && sql.includes('proposal_votes')) {
            return { count: activityCounts?.votes ?? 0 }
          }
          if (
            sql.includes(
              'SELECT id, codename, role, clearance, created_at, updated_at FROM users WHERE id = ?',
            )
          ) {
            return user
          }
          if (sql.includes('SELECT id, role FROM users WHERE id = ?')) {
            return user
          }
          if (sql.includes('SELECT id FROM users WHERE id = ?')) {
            return user ? { id: user.id } : null
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM users')) return { results: users }
          if (sql.includes('FROM browsing_history')) return { results: historyRows }
          if (sql.includes('FROM bookmarks')) return { results: bookmarkRows }
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
  app.use('/api/admin/users/*', adminMiddleware)
  app.route('/api/admin/users', userRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin User Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/admin/users', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const token = await signToken(
        { sub: 2, codename: 'user', role: 'personnel', clearance: 1 },
        TEST_SECRET,
      )
      const res = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        createEnv(),
      )
      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/admin/users', () => {
    it('returns paginated user list', async () => {
      const token = await signAdminToken()
      const env = createEnv({ users: [mockUser], countResult: { total: 1 } })
      const res = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.users).toHaveLength(1)
      expect(body.total).toBe(1)
    })

    it('supports search query', async () => {
      const token = await signAdminToken()
      const env = createEnv({ users: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/users?q=test',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('supports role filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ users: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/users?role=admin',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/admin/users/:id', () => {
    it('returns user detail with activity counts', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        user: mockUser,
        activityCounts: { history: 42, bookmarks: 5, proposals: 3, votes: 10 },
      })
      const res = await app.request(
        '/api/admin/users/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.user.codename).toBe('test_agent')
      expect(body.user.historyCount).toBe(42)
    })

    it('returns 400 for invalid ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/abc',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: null })
      const res = await app.request(
        '/api/admin/users/999',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/users/:id/role', () => {
    it('updates user role', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: mockUser })
      const res = await app.request(
        '/api/admin/users/1/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'banned' }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toContain('banned')
    })

    it('rejects invalid role', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/1/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: '' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/users/:id/clearance', () => {
    it('updates clearance level', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: mockUser })
      const res = await app.request(
        '/api/admin/users/1/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: 3 }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('3')
    })

    it('rejects clearance out of range', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/1/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: 6 }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/users/:id/ban', () => {
    it('bans a non-admin user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: { ...mockUser, role: 'personnel' } })
      const res = await app.request(
        '/api/admin/users/1/ban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('banned')
    })

    it('rejects banning admin users', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: { ...mockUser, role: 'admin' } })
      const res = await app.request(
        '/api/admin/users/1/ban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<any>()
      expect(body.error).toContain('admin')
    })
  })

  describe('PUT /api/admin/users/:id/unban', () => {
    it('unbans a user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: mockUser })
      const res = await app.request(
        '/api/admin/users/1/unban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('unbanned')
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('deletes a non-admin user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: { ...mockUser, role: 'personnel' } })
      const res = await app.request(
        '/api/admin/users/1',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('deleted')
    })

    it('rejects deleting admin users', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: { ...mockUser, role: 'admin' } })
      const res = await app.request(
        '/api/admin/users/1',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: null })
      const res = await app.request(
        '/api/admin/users/999',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/admin/users/:id/history', () => {
    it('returns user browsing history', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        user: mockUser,
        historyRows: [
          { id: 1, user_id: 1, scp_number: 173, language: 'en', visited_at: '2026-06-26' },
          { id: 2, user_id: 1, scp_number: 682, language: 'en', visited_at: '2026-06-25' },
        ],
      })
      const res = await app.request(
        '/api/admin/users/1/history',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.history).toHaveLength(2)
    })

    it('returns 400 for invalid user ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/abc/history',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns empty history for user with no visits', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: mockUser, historyRows: [] })
      const res = await app.request(
        '/api/admin/users/1/history',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.history).toHaveLength(0)
    })
  })

  describe('GET /api/admin/users/:id/bookmarks', () => {
    it('returns user bookmarks', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        user: mockUser,
        bookmarkRows: [
          {
            id: 1,
            user_id: 1,
            scp_number: 173,
            language: 'en',
            name: 'The Sculpture',
            object_class: 'Euclid',
          },
        ],
      })
      const res = await app.request(
        '/api/admin/users/1/bookmarks',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.bookmarks).toHaveLength(1)
    })

    it('returns 400 for invalid user ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/abc/bookmarks',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/users/:id/role — additional validation', () => {
    it('rejects role not in whitelist', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/1/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'researcher' }),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<any>()
      expect(body.error).toContain('Must be one of')
    })

    it('accepts valid role from whitelist', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: mockUser })
      const res = await app.request(
        '/api/admin/users/1/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'admin' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('returns 404 for nonexistent user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: null })
      const res = await app.request(
        '/api/admin/users/999/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'banned' }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/users/:id/clearance — additional validation', () => {
    it('rejects non-integer clearance', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/1/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: 2.5 }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects negative clearance', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/users/1/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: -1 }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent user', async () => {
      const token = await signAdminToken()
      const env = createEnv({ user: null })
      const res = await app.request(
        '/api/admin/users/999/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: 3 }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })
})
