import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import tagAdminRoutes from '../tags'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-tags-secret'

function createMockDB(data: {
  categories?: any[]
  category?: any
  tags?: any[]
  tag?: any
  countResult?: { count: number }
  entryTagResult?: { changes: number }
} = {}) {
  const { categories = [], category = null, tags = [], tag = null, countResult, entryTagResult } = data

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
          if (sql.includes('COUNT(*)') && sql.includes('tags WHERE category_id')) return countResult ?? { count: 0 }
          if (sql.includes('COUNT(*)')) return { count: 42 }
          if (sql.includes('SELECT * FROM tag_categories WHERE id')) return category
          if (sql.includes('SELECT * FROM tags WHERE id')) return tag
          if (sql.includes('SELECT id FROM tag_categories WHERE id')) return category ? { id: category.id } : null
          if (sql.includes('SELECT id FROM tags WHERE id')) return tag ? { id: tag.id } : null
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('GROUP BY tc.id')) return { results: categories }
          if (sql.includes('FROM tags t') && sql.includes('GROUP BY t.id')) return { results: tags }
          if (sql.includes('FROM tags')) return { results: tags }
          return { results: [] }
        },
        run: async () => ({ meta: { changes: entryTagResult?.changes ?? 1 } }),
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
  app.use('/api/admin/tags/*', adminMiddleware)
  app.route('/api/admin/tags', tagAdminRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Tag Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/admin/tags/stats', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/tags/stats', () => {
    it('returns tag statistics', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        categories: [{ id: 'object-class', name: 'Object Class', name_en: 'Object Class', tag_count: 6 }],
        tags: [{ id: 'safe', name: 'Safe', name_zh: '安全', category_id: 'object-class', usage_count: 100 }],
      })
      const res = await app.request('/api/admin/tags/stats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.stats.totalCategories).toBeDefined()
      expect(body.stats.totalTags).toBeDefined()
      expect(body.stats.byCategory).toBeDefined()
      expect(body.stats.topTags).toBeDefined()
    })
  })

  describe('POST /api/admin/tags/categories', () => {
    it('creates a category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request('/api/admin/tags/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 'new-cat', name: '新类别', name_en: 'New Category' }),
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.category.id).toBe('new-cat')
    })

    it('rejects duplicate ID', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'existing' } })
      const res = await app.request('/api/admin/tags/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 'existing', name: 'Name', name_en: 'Name' }),
      }, env)
      expect(res.status).toBe(409)
    })

    it('rejects missing fields', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request('/api/admin/tags/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: '' }),
      }, env)
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/tags/categories/:id', () => {
    it('updates a category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'object-class', name: '对象等级', name_en: 'Object Class', description: '', sort_order: 1 } })
      const res = await app.request('/api/admin/tags/categories/object-class', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Updated Name' }),
      }, env)
      expect(res.status).toBe(200)
    })

    it('returns 404 for nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request('/api/admin/tags/categories/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Updated' }),
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/tags/categories/:id', () => {
    it('deletes a category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'test' }, countResult: { count: 3 } })
      const res = await app.request('/api/admin/tags/categories/test', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('3 tags')
    })

    it('returns 404 for nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request('/api/admin/tags/categories/nonexistent', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/tags', () => {
    it('creates a tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'object-class' }, tag: null })
      const res = await app.request('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 'new-tag', category_id: 'object-class', name: 'New', name_zh: '新的' }),
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(201)
      expect(body.tag.id).toBe('new-tag')
    })

    it('rejects duplicate tag ID', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'object-class' }, tag: { id: 'existing' } })
      const res = await app.request('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 'existing', category_id: 'object-class', name: 'Name', name_zh: 'Name' }),
      }, env)
      expect(res.status).toBe(409)
    })

    it('rejects nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: 'tag1', category_id: 'nonexistent', name: 'Name', name_zh: 'Name' }),
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/tags/:id', () => {
    it('deletes a tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: { id: 'safe' } })
      const res = await app.request('/api/admin/tags/safe', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('deleted')
    })

    it('returns 404 for nonexistent tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: null })
      const res = await app.request('/api/admin/tags/nonexistent', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })
})
