import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import tagRoutes from '../tags'
import type { Env } from '../../types'

interface ApiResponse {
  success: boolean
  error?: string
  categories?: any[]
  category?: any
  tags?: any[]
  tag?: any
  total?: number
  entries?: any[]
  page?: number
  limit?: number
  totalPages?: number
  scpNumber?: number
  language?: string
  grouped?: Record<string, any[]>
}

const mockCategory = {
  id: 'object-class',
  name: '对象等级',
  name_en: 'Object Class',
  description: 'SCP object classification',
  sort_order: 1,
  created_at: '2026-06-26',
}

const mockTag = {
  id: 'safe',
  category_id: 'object-class',
  name: 'Safe',
  name_zh: '安全',
  description: 'Safe class objects',
  ai_keywords: '["safe class"]',
  sort_order: 1,
  created_at: '2026-06-26',
  updated_at: '2026-06-26',
}

function createMockDB(data: {
  categories?: any[]
  category?: any
  tags?: any[]
  tag?: any
  entryTags?: any[]
  countResult?: { total: number }
} = {}) {
  const { categories = [], category = null, tags = [], tag = null, entryTags = [], countResult } = data

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
          if (sql.includes('SELECT * FROM tag_categories WHERE id = ?')) {
            return category
          }
          if (sql.includes('SELECT * FROM tags WHERE id = ?') && !sql.includes('entry_tags')) {
            return tag
          }
          if (sql.includes('SELECT id FROM tags WHERE id = ?')) {
            return tag ? { id: tag.id } : null
          }
          if (sql.includes('COUNT(*)')) {
            return countResult ?? { total: entryTags.length }
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM tag_categories')) {
            return { results: categories }
          }
          if (sql.includes('JOIN tags t ON et.tag_id')) {
            return { results: tags }
          }
          if (sql.includes('FROM tags') && !sql.includes('entry_tags')) {
            return { results: tags }
          }
          if (sql.includes('FROM entry_tags')) {
            return { results: entryTags }
          }
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
    JWT_SECRET: 'test',
    CORS_ORIGINS: '*',
    SCP_EN_CRAWLER: {} as DurableObjectNamespace,
    SCP_CN_CRAWLER: {} as DurableObjectNamespace,
    AI_CHAT_DO: {} as DurableObjectNamespace,
    AI_QUEUE_DO: {} as DurableObjectNamespace,
    GLM_API_KEY: '',
  }
}

function createTestApp() {
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/tags', tagRoutes)
  return app
}

describe('Tag Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('GET /api/tags', () => {
    it('returns all categories with their tags', async () => {
      const env = createEnv({ categories: [mockCategory], tags: [mockTag] })
      const res = await app.request('/api/tags', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.categories).toHaveLength(1)
      expect(body.categories![0].id).toBe('object-class')
      expect(body.categories![0].tags).toHaveLength(1)
      expect(body.categories![0].tags[0].id).toBe('safe')
    })

    it('returns empty categories when none exist', async () => {
      const env = createEnv({ categories: [], tags: [] })
      const res = await app.request('/api/tags', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.categories).toHaveLength(0)
    })
  })

  describe('GET /api/tags/categories', () => {
    it('returns categories without tags', async () => {
      const env = createEnv({ categories: [mockCategory] })
      const res = await app.request('/api/tags/categories', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.categories).toHaveLength(1)
      expect(body.categories![0].nameEn).toBe('Object Class')
    })
  })

  describe('GET /api/tags/categories/:id', () => {
    it('returns a single category with its tags', async () => {
      const env = createEnv({ category: mockCategory, tags: [mockTag] })
      const res = await app.request('/api/tags/categories/object-class', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.category.id).toBe('object-class')
      expect(body.category.tags).toHaveLength(1)
    })

    it('returns 404 for nonexistent category', async () => {
      const env = createEnv({ category: null })
      const res = await app.request('/api/tags/categories/nonexistent', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/tags/search', () => {
    it('returns matching tags', async () => {
      const env = createEnv({ tags: [mockTag] })
      const res = await app.request('/api/tags/search?q=safe', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.tags).toHaveLength(1)
      expect(body.total).toBe(1)
    })

    it('returns 400 when query is missing', async () => {
      const env = createEnv()
      const res = await app.request('/api/tags/search', { method: 'GET' }, env)
      expect(res.status).toBe(400)
    })

    it('returns empty results for no matches', async () => {
      const env = createEnv({ tags: [] })
      const res = await app.request('/api/tags/search?q=nonexistent', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.tags).toHaveLength(0)
    })
  })

  describe('GET /api/tags/:id', () => {
    it('returns a single tag', async () => {
      const env = createEnv({ tag: mockTag })
      const res = await app.request('/api/tags/safe', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.tag.id).toBe('safe')
      expect(body.tag.nameZh).toBe('安全')
      expect(body.tag.aiKeywords).toEqual(['safe class'])
    })

    it('returns 404 for nonexistent tag', async () => {
      const env = createEnv({ tag: null })
      const res = await app.request('/api/tags/nonexistent', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/tags/:id/entries', () => {
    it('returns entries for a tag', async () => {
      const entryTags = [
        { scp_number: 173, language: 'en', created_at: '2026-06-26', name: 'The Sculpture', object_class: 'Euclid' },
      ]
      const env = createEnv({ tag: { id: 'safe' }, entryTags, countResult: { total: 1 } })
      const res = await app.request('/api/tags/safe/entries', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.entries).toHaveLength(1)
      expect(body.total).toBe(1)
    })

    it('returns 404 for nonexistent tag', async () => {
      const env = createEnv({ tag: null })
      const res = await app.request('/api/tags/nonexistent/entries', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })

    it('supports pagination', async () => {
      const env = createEnv({ tag: { id: 'safe' }, entryTags: [], countResult: { total: 50 } })
      const res = await app.request('/api/tags/safe/entries?page=2&limit=10', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.page).toBe(2)
      expect(body.limit).toBe(10)
      expect(body.totalPages).toBe(5)
    })

    it('supports language filter', async () => {
      const env = createEnv({ tag: { id: 'safe' }, entryTags: [], countResult: { total: 0 } })
      const res = await app.request('/api/tags/safe/entries?language=cn', { method: 'GET' }, env)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/tags/entry/:scpNumber', () => {
    it('returns tags for an entry', async () => {
      const env = createEnv({ tags: [mockTag] })
      const res = await app.request('/api/tags/entry/173', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.scpNumber).toBe(173)
      expect(body.language).toBe('en')
      expect(body.tags).toHaveLength(1)
      expect(body.grouped!['object-class']).toHaveLength(1)
    })

    it('defaults language to en', async () => {
      const env = createEnv({ tags: [] })
      const res = await app.request('/api/tags/entry/173', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(body.language).toBe('en')
    })

    it('supports language parameter', async () => {
      const env = createEnv({ tags: [] })
      const res = await app.request('/api/tags/entry/173?language=cn', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(body.language).toBe('cn')
    })

    it('returns 400 for invalid SCP number', async () => {
      const env = createEnv()
      const res = await app.request('/api/tags/entry/abc', { method: 'GET' }, env)
      expect(res.status).toBe(400)
    })
  })
})
