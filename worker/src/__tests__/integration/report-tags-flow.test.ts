/**
 * Integration tests for reports and tags.
 *
 * Tests the complete lifecycle of entry reports and the tag system
 * through the full Hono app with all middleware applied.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson, signUserToken, signAdminToken } from './helpers'

describe('Reports & Tags Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  describe('Report Lifecycle', () => {
    async function setupUser() {
      const env = createIntegrationEnv(db)
      await db._seedUser('reporter', 'password123')
      const token = await signUserToken(1, 'reporter')
      // Seed an entry so the report can reference it
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      return { env, token }
    }

    it('submits, checks, and lists reports', async () => {
      const { env, token } = await setupUser()

      // Submit report
      const submitRes = await app.request('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scpNumber: 173,
          language: 'en',
          reportType: 'content_error',
          description: 'There is a typo in the containment procedures.',
        }),
      }, env)
      const submitBody = await parseJson(submitRes)
      expect(submitRes.status).toBe(201)
      expect(submitBody.success).toBe(true)
      expect(submitBody.report.reportType).toBe('content_error')

      // Check reports for entry
      const checkRes = await app.request('/api/reports/check/en/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const checkBody = await parseJson(checkRes)
      expect(checkBody.hasReports).toBe(true)
      expect(checkBody.count).toBe(1)
      expect(checkBody.maxReports).toBe(3)

      // List reports
      const listRes = await app.request('/api/reports', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const listBody = await parseJson(listRes)
      expect(listBody.reports).toHaveLength(1)
    })

    it('enforces per-entry report limit', async () => {
      const { env, token } = await setupUser()

      // Submit 3 reports (the max)
      const types = ['content_error', 'display_issue', 'special_handling'] as const
      for (const reportType of types) {
        const res = await app.request('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scpNumber: 173,
            language: 'en',
            reportType,
            description: `Report type: ${reportType} with enough description text.`,
          }),
        }, env)
        expect(res.status).toBe(201)
      }

      // Fourth should be rejected
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scpNumber: 173,
          language: 'en',
          reportType: 'other',
          description: 'This should be rejected due to per-entry limit.',
        }),
      }, env)
      expect(res.status).toBe(429)
    })

    it('prevents duplicate report types', async () => {
      const { env, token } = await setupUser()

      // First report
      await app.request('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scpNumber: 173,
          language: 'en',
          reportType: 'content_error',
          description: 'First report with enough description.',
        }),
      }, env)

      // Same type again
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scpNumber: 173,
          language: 'en',
          reportType: 'content_error',
          description: 'Duplicate report type attempt.',
        }),
      }, env)
      expect(res.status).toBe(409)
    })
  })

  describe('Tag System', () => {
    async function setupTags() {
      const env = createIntegrationEnv(db)

      // Seed tag categories and tags
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTagCategory('anomaly-type', '异常类型', 'Anomaly Type')
      db._seedTag('safe', 'object-class', 'Safe', '安全')
      db._seedTag('euclid', 'object-class', 'Euclid', 'Euclid')
      db._seedTag('keter', 'object-class', 'Keter', 'Keter')
      db._seedTag('telepathy', 'anomaly-type', 'Telepathy', '心灵感应')

      return { env }
    }

    it('lists all categories with their tags', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.categories).toHaveLength(2)
      expect(body.categories[0].tags.length).toBeGreaterThan(0)
    })

    it('lists categories without tags', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags/categories', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(body.categories).toHaveLength(2)
      // Categories endpoint should not include tags
      expect(body.categories[0].tags).toBeUndefined()
    })

    it('gets a single category with its tags', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags/categories/object-class', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.category.id).toBe('object-class')
      expect(body.category.tags).toHaveLength(3)
    })

    it('gets a single tag', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags/safe', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.tag.id).toBe('safe')
      expect(body.tag.nameZh).toBe('安全')
    })

    it('searches tags', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags/search?q=safe', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(body.tags.length).toBeGreaterThan(0)
      expect(body.tags[0].id).toBe('safe')
    })

    it('returns 404 for nonexistent tag', async () => {
      const { env } = await setupTags()

      const res = await app.request('/api/tags/nonexistent', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('Admin Tag Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    it('creates, updates, and deletes categories', async () => {
      const { env, token } = await setupAdmin()

      // Create
      const createRes = await app.request('/api/admin/tags/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: 'test-cat', name: '测试', name_en: 'Test' }),
      }, env)
      expect(createRes.status).toBe(201)

      // Update
      const updateRes = await app.request('/api/admin/tags/categories/test-cat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Updated' }),
      }, env)
      expect(updateRes.status).toBe(200)

      // Delete
      const deleteRes = await app.request('/api/admin/tags/categories/test-cat', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(deleteRes.status).toBe(200)
    })

    it('creates and deletes tags', async () => {
      const { env, token } = await setupAdmin()

      // Create category first
      await db._seedTagCategory('test-cat', 'Test', 'Test')

      // Create tag
      const createRes = await app.request('/api/admin/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: 'test-tag', category_id: 'test-cat', name: 'Test Tag', name_zh: '测试标签' }),
      }, env)
      expect(createRes.status).toBe(201)

      // Delete tag
      const deleteRes = await app.request('/api/admin/tags/test-tag', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(deleteRes.status).toBe(200)
    })

    it('assigns tags to entries', async () => {
      const { env, token } = await setupAdmin()

      // Setup
      db._seedTagCategory('object-class', 'Object Class', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')
      db._seedTag('euclid', 'object-class', 'Euclid', 'Euclid')

      // Assign tags
      const res = await app.request('/api/admin/tags/entry/173', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_ids: ['safe', 'euclid'], language: 'en' }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.added).toBe(2)

      // Verify tags on entry
      const verifyRes = await app.request('/api/tags/entry/173?language=en', { method: 'GET' }, env)
      const verifyBody = await parseJson(verifyRes)
      expect(verifyBody.tags).toHaveLength(2)
    })

    it('returns tag statistics', async () => {
      const { env, token } = await setupAdmin()

      db._seedTagCategory('object-class', 'Object Class', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')

      const res = await app.request('/api/admin/tags/stats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.stats.totalCategories).toBeDefined()
      expect(body.stats.totalTags).toBeDefined()
    })
  })
})
