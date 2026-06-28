import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import tagAdminRoutes from '../tags'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-tags-secret'

const mockTag = {
  id: 'safe',
  category_id: 'object-class',
  name: 'Safe',
  name_zh: '安全',
  description: 'Low threat',
  ai_keywords: '[]',
  sort_order: 0,
  created_at: '2026-06-26',
  updated_at: '2026-06-26',
}

const mockCategory = {
  id: 'object-class',
  name: '对象等级',
  name_en: 'Object Class',
  description: '',
  sort_order: 1,
  created_at: '2026-06-26',
}

const mockEntry = {
  id: 1,
  scp_number: 173,
  language: 'en',
  content: '<div class="scp-content">Test content</div>',
}

function createMockDB(
  data: {
    categories?: any[]
    category?: any
    tags?: any[]
    tag?: any
    countResult?: { count: number }
    entryTagResult?: { changes: number }
    entry?: any
    entryTags?: any[]
  } = {},
) {
  const {
    categories = [],
    category = null,
    tags = [],
    tag = null,
    countResult,
    entryTagResult,
    entry = null,
    entryTags = [],
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
          if (sql.includes('COUNT(*)') && sql.includes('tags WHERE category_id'))
            return countResult ?? { count: 0 }
          if (sql.includes('COUNT(*)') && sql.includes('entry_tags'))
            return { count: entryTags.length }
          if (sql.includes('COUNT(*)')) return { count: 42 }
          if (sql.includes('SELECT * FROM tag_categories WHERE id')) return category
          if (sql.includes('SELECT * FROM tags WHERE id')) return tag
          if (sql.includes('SELECT id FROM tag_categories WHERE id'))
            return category ? { id: category.id } : null
          if (sql.includes('SELECT id FROM tags WHERE id')) return tag ? { id: tag.id } : null
          if (sql.includes('SELECT scp_number, content FROM scp_entries')) return entry
          if (sql.includes('SELECT id FROM entry_tags'))
            return entryTags.length > 0 ? entryTags[0] : null
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('GROUP BY tc.id')) return { results: categories }
          if (sql.includes('FROM tags t') && sql.includes('GROUP BY t.id')) return { results: tags }
          if (sql.includes('FROM tags') && sql.includes('IN ('))
            return { results: tags.filter((t) => stmt._params.includes(t.id)) }
          if (sql.includes('FROM tags')) return { results: tags }
          if (sql.includes('FROM entry_tags')) return { results: entryTags }
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
        categories: [
          { id: 'object-class', name: 'Object Class', name_en: 'Object Class', tag_count: 6 },
        ],
        tags: [
          {
            id: 'safe',
            name: 'Safe',
            name_zh: '安全',
            category_id: 'object-class',
            usage_count: 100,
          },
        ],
      })
      const res = await app.request(
        '/api/admin/tags/stats',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
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
      const res = await app.request(
        '/api/admin/tags/categories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: 'new-cat', name: '新类别', name_en: 'New Category' }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.category.id).toBe('new-cat')
    })

    it('rejects duplicate ID', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'existing' } })
      const res = await app.request(
        '/api/admin/tags/categories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: 'existing', name: 'Name', name_en: 'Name' }),
        },
        env,
      )
      expect(res.status).toBe(409)
    })

    it('rejects missing fields', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/categories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: '' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('PUT /api/admin/tags/categories/:id', () => {
    it('updates a category', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        category: {
          id: 'object-class',
          name: '对象等级',
          name_en: 'Object Class',
          description: '',
          sort_order: 1,
        },
      })
      const res = await app.request(
        '/api/admin/tags/categories/object-class',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated Name' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('returns 404 for nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request(
        '/api/admin/tags/categories/nonexistent',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated' }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/tags/categories/:id', () => {
    it('deletes a category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'test' }, countResult: { count: 3 } })
      const res = await app.request(
        '/api/admin/tags/categories/test',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('3 tags')
    })

    it('returns 404 for nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request(
        '/api/admin/tags/categories/nonexistent',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/admin/tags', () => {
    it('creates a tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'object-class' }, tag: null })
      const res = await app.request(
        '/api/admin/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: 'new-tag',
            category_id: 'object-class',
            name: 'New',
            name_zh: '新的',
          }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(201)
      expect(body.tag.id).toBe('new-tag')
    })

    it('rejects duplicate tag ID', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: { id: 'object-class' }, tag: { id: 'existing' } })
      const res = await app.request(
        '/api/admin/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: 'existing',
            category_id: 'object-class',
            name: 'Name',
            name_zh: 'Name',
          }),
        },
        env,
      )
      expect(res.status).toBe(409)
    })

    it('rejects nonexistent category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ category: null })
      const res = await app.request(
        '/api/admin/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: 'tag1',
            category_id: 'nonexistent',
            name: 'Name',
            name_zh: 'Name',
          }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/tags/:id', () => {
    it('deletes a tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: { id: 'safe' } })
      const res = await app.request(
        '/api/admin/tags/safe',
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

    it('returns 404 for nonexistent tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: null })
      const res = await app.request(
        '/api/admin/tags/nonexistent',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/admin/tags/:id', () => {
    it('updates tag name', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: mockTag, category: mockCategory })
      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated Name' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('updates tag category', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: mockTag, category: { id: 'new-category' } })
      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ category_id: 'new-category' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('rejects when no fields provided', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: mockTag })
      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent tag', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: null })
      const res = await app.request(
        '/api/admin/tags/nonexistent',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated' }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('returns 404 when target category does not exist', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: mockTag, category: null })
      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ category_id: 'nonexistent' }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('updates multiple fields at once', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tag: mockTag, category: mockCategory })
      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'New Name', name_zh: '新名称', description: 'New desc' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })
  })

  describe('POST /api/admin/tags/entry/:scpNumber', () => {
    it('assigns tags to an entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        tags: [{ id: 'safe' }, { id: 'euclid' }],
        entryTagResult: { changes: 1 },
      })
      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe', 'euclid'], language: 'en' }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.added).toBeGreaterThanOrEqual(0)
    })

    it('rejects empty tag_ids array', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: [], language: 'en' }),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<any>()
      expect(body.error).toContain('non-empty')
    })

    it('rejects missing tag_ids', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: 'en' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects invalid SCP number', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/abc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe'] }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects invalid language', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe'], language: 'xx' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects tags that do not exist', async () => {
      const token = await signAdminToken()
      const env = createEnv({ tags: [{ id: 'safe' }] }) // only 1 of 2 requested tags exists
      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe', 'nonexistent'], language: 'en' }),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<any>()
      expect(body.error).toContain('not found')
    })
  })

  describe('DELETE /api/admin/tags/entry/:scpNumber/:tagId', () => {
    it('removes a tag from an entry', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entryTagResult: { changes: 1 } })
      const res = await app.request(
        '/api/admin/tags/entry/173/safe?language=en',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('removed')
    })

    it('returns 404 when association not found', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entryTagResult: { changes: 0 } })
      const res = await app.request(
        '/api/admin/tags/entry/173/nonexistent?language=en',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('rejects invalid SCP number', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/abc/safe',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/admin/tags/entry/:scpNumber/auto', () => {
    it('rejects invalid SCP number', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/abc/auto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects invalid language', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/tags/entry/173/auto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ language: 'xx' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 when entry not found', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: null })
      const res = await app.request(
        '/api/admin/tags/entry/999/auto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('returns 400 when entry has no content', async () => {
      const token = await signAdminToken()
      const env = createEnv({ entry: { scp_number: 173, content: null } })
      const res = await app.request(
        '/api/admin/tags/entry/173/auto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await res.json<any>()
      expect(body.error).toContain('no content')
    })

    it('returns 409 when entry already tagged (without force)', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        entry: mockEntry,
        entryTags: [{ id: 1, scp_number: 173, language: 'en', tag_id: 'safe' }],
      })
      const res = await app.request(
        '/api/admin/tags/entry/173/auto',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
        env,
      )
      expect(res.status).toBe(409)
      const body = await res.json<any>()
      expect(body.error).toContain('already has')
    })
  })
})
