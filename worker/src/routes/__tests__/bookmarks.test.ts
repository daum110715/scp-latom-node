import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import bookmarkRoutes from '../bookmarks'
import { signToken } from '../../utils/jwt'
import type { Env, JwtPayload } from '../../types'

const TEST_SECRET = 'test-bookmarks-secret'

interface ApiResponse {
  success: boolean
  error?: string
  message?: string
  bookmarks?: any[]
  bookmarked?: boolean
}

function createMockDB(
  data: {
    bookmarkRows?: any[]
    existingBookmark?: any
    deleteChanges?: number
  } = {},
) {
  const { bookmarkRows = [], existingBookmark = null, deleteChanges = 1 } = data

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
          if (
            sql.includes(
              'SELECT id FROM bookmarks WHERE user_id = ? AND scp_number = ? AND language = ?',
            )
          ) {
            return existingBookmark
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM bookmarks')) {
            return { results: bookmarkRows }
          }
          return { results: [] }
        },
        run: async () => ({ meta: { changes: deleteChanges } }),
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
  app.route('/api/bookmarks', bookmarkRoutes)
  return app
}

async function signTestToken(sub = 1) {
  return signToken({ sub, codename: 'test_agent', role: 'personnel', clearance: 1 }, TEST_SECRET)
}

describe('Bookmark Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token on GET /', async () => {
      const res = await app.request('/api/bookmarks', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns 401 without token on POST /:lang/:scpNumber', async () => {
      const res = await app.request('/api/bookmarks/en/173', { method: 'POST' }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns 401 without token on DELETE /:lang/:scpNumber', async () => {
      const res = await app.request('/api/bookmarks/en/173', { method: 'DELETE' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/bookmarks', () => {
    it('returns all bookmarks for user', async () => {
      const token = await signTestToken()
      const rows = [
        {
          scp_number: 173,
          language: 'en',
          created_at: '2026-06-26',
          name: 'The Sculpture',
          object_class: 'Euclid',
        },
        {
          scp_number: 999,
          language: 'en',
          created_at: '2026-06-25',
          name: 'Tickle Monster',
          object_class: 'Safe',
        },
      ]
      const env = createEnv({ bookmarkRows: rows })
      const res = await app.request(
        '/api/bookmarks',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.bookmarks).toHaveLength(2)
      expect(body.bookmarks![0].scpNumber).toBe(173)
    })

    it('returns empty array when no bookmarks', async () => {
      const token = await signTestToken()
      const env = createEnv({ bookmarkRows: [] })
      const res = await app.request(
        '/api/bookmarks',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.bookmarks).toHaveLength(0)
    })
  })

  describe('GET /api/bookmarks/:lang/:scpNumber', () => {
    it('returns bookmarked: true when bookmark exists', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingBookmark: { id: 1 } })
      const res = await app.request(
        '/api/bookmarks/en/173',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.bookmarked).toBe(true)
    })

    it('returns bookmarked: false when bookmark does not exist', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingBookmark: null })
      const res = await app.request(
        '/api/bookmarks/en/173',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.bookmarked).toBe(false)
    })

    it('returns 400 for invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/bookmarks/fr/173',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid SCP number', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/bookmarks/en/abc',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/bookmarks/:lang/:scpNumber', () => {
    it('adds a bookmark', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingBookmark: null })
      const res = await app.request(
        '/api/bookmarks/en/173',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.message).toContain('Bookmark added')
    })

    it('returns 409 for duplicate bookmark', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingBookmark: { id: 1 } })
      const res = await app.request(
        '/api/bookmarks/en/173',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(409)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('already bookmarked')
    })

    it('returns 400 for invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/bookmarks/fr/173',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid SCP number', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/bookmarks/en/0',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/bookmarks/:lang/:scpNumber', () => {
    it('removes a bookmark', async () => {
      const token = await signTestToken()
      const env = createEnv({ deleteChanges: 1 })
      const res = await app.request(
        '/api/bookmarks/en/173',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toContain('Bookmark removed')
    })

    it('returns 404 when bookmark not found', async () => {
      const token = await signTestToken()
      const env = createEnv({ deleteChanges: 0 })
      const res = await app.request(
        '/api/bookmarks/en/999',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request(
        '/api/bookmarks/fr/173',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })
})
