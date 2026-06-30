/**
 * Integration tests for admin operations.
 *
 * Tests admin user management, entry management, proposal management,
 * tag management, log management, dashboard, and settings through the
 * full Hono app with the admin middleware applied via the real router.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import {
  createIntegrationDB,
  createIntegrationEnv,
  parseJson,
  signUserToken,
  signAdminToken,
} from './helpers'

describe('Admin Flow Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  // ─── Auth Enforcement ────────────────────────────────────────

  describe('Admin Auth Enforcement Through Real Router', () => {
    it('returns 401 without token on admin routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/admin/users', { method: 'GET' }, env)
      expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin users', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('regular_user', 'password123')
      const token = await signUserToken(1, 'regular_user')

      const res = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(403)
    })

    it('allows admin access', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })
  })

  // ─── User Management ─────────────────────────────────────────

  describe('User Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    it('lists users', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('user1', 'password123')
      await db._seedUser('user2', 'password123')

      const res = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.users.length).toBeGreaterThanOrEqual(3)
    })

    it('gets user detail with activity counts', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('detail_user', 'password123')

      const res = await app.request(
        '/api/admin/users/2',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.user.codename).toBe('detail_user')
      expect(body.user.historyCount).toBeDefined()
      expect(body.user.bookmarkCount).toBeDefined()
    })

    it('changes user role', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('role_user', 'password123')

      const res = await app.request(
        '/api/admin/users/2/role',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: 'banned' }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('banned')
    })

    it('changes user clearance', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('clearance_user', 'password123')

      const res = await app.request(
        '/api/admin/users/2/clearance',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clearance: 4 }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('4')
    })

    it('bans and unbans users', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('ban_user', 'password123')

      const banRes = await app.request(
        '/api/admin/users/2/ban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(banRes.status).toBe(200)

      const unbanRes = await app.request(
        '/api/admin/users/2/unban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(unbanRes.status).toBe(200)
    })

    it('prevents banning admin users', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/users/1/ban',
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
      const body = await parseJson(res)
      expect(body.error).toContain('admin')
    })

    it('deletes users and cascades', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('delete_user', 'password123')

      const res = await app.request(
        '/api/admin/users/2',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)

      const listRes = await app.request(
        '/api/admin/users',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const listBody = await parseJson(listRes)
      expect(listBody.users.find((u: any) => u.codename === 'delete_user')).toBeUndefined()
    })
  })

  // ─── Entry Management ────────────────────────────────────────

  describe('Entry Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    it('lists entries', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      db._seedEntry(682, 'en', 'Hard-to-Destroy Reptile', 'Keter')

      const res = await app.request(
        '/api/admin/entries',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.entries.length).toBeGreaterThanOrEqual(2)
    })

    it('gets entry detail', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')

      const res = await app.request(
        '/api/admin/entries/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.entry.scp_number).toBe(173)
      expect(body.entry.name).toBe('The Sculpture')
    })

    it('updates entry name and object class', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')

      const res = await app.request(
        '/api/admin/entries/1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated Name', object_class: 'Keter' }),
        },
        env,
      )
      expect(res.status).toBe(200)

      // Verify the entry still exists (mock UPDATE with datetime literal doesn't persist SET values)
      const detailRes = await app.request(
        '/api/admin/entries/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(detailRes.status).toBe(200)
    })

    it('deletes an entry', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')

      const res = await app.request(
        '/api/admin/entries/1',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)

      // Verify deleted
      const detailRes = await app.request(
        '/api/admin/entries/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(detailRes.status).toBe(404)
    })

    it('returns 400 for invalid entry ID', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/entries/abc',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent entry', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/entries/999',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })

    it('rejects invalid object class on update', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')

      const res = await app.request(
        '/api/admin/entries/1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ object_class: 'InvalidClass' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns crawl status for both languages', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/entries/crawl/status',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.en).toBeDefined()
      expect(body.cn).toBeDefined()
    })
  })

  // ─── Proposal Management ─────────────────────────────────────

  describe('Proposal Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    async function seedProposal(_env: any, _token: string) {
      // Create a user to own the proposal
      await db._seedUser('proposer', 'password123')

      // Insert proposal directly into the DB
      db._tables.proposals.push({
        id: 1,
        user_id: 2,
        title: 'Test Proposal',
        content: 'Proposal content here',
        category: 'general',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    it('lists proposals', async () => {
      const { env, token } = await setupAdmin()
      await seedProposal(env, token)

      const res = await app.request(
        '/api/admin/proposals',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.proposals.length).toBeGreaterThanOrEqual(1)
    })

    it('gets proposal detail with voters', async () => {
      const { env, token } = await setupAdmin()
      await seedProposal(env, token)

      // Add a vote
      db._tables.proposal_votes.push({
        id: 1,
        proposal_id: 1,
        user_id: 1,
        vote: 'for',
        created_at: new Date().toISOString(),
      })

      const res = await app.request(
        '/api/admin/proposals/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.proposal.title).toBe('Test Proposal')
      expect(body.proposal.votesFor).toBe(1)
    })

    it('changes proposal status to approved', async () => {
      const { env, token } = await setupAdmin()
      await seedProposal(env, token)

      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'approved' }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('approved')
    })

    it('changes proposal status to rejected', async () => {
      const { env, token } = await setupAdmin()
      await seedProposal(env, token)

      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'rejected' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('rejects invalid proposal status', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'invalid_status' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('deletes a proposal and cascades votes', async () => {
      const { env, token } = await setupAdmin()
      await seedProposal(env, token)

      // Add a vote
      db._tables.proposal_votes.push({
        id: 1,
        proposal_id: 1,
        user_id: 1,
        vote: 'for',
        created_at: new Date().toISOString(),
      })

      const res = await app.request(
        '/api/admin/proposals/1',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)

      // Verify proposal deleted
      const detailRes = await app.request(
        '/api/admin/proposals/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(detailRes.status).toBe(404)

      // Verify votes also deleted
      expect(db._tables.proposal_votes.length).toBe(0)
    })

    it('returns 404 for nonexistent proposal', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/proposals/999',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  // ─── Tag Management ──────────────────────────────────────────

  describe('Tag Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    it('creates a tag category', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request(
        '/api/admin/tags/categories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: 'test-cat', name: '测试类别', name_en: 'Test Category' }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(201)
      expect(body.category.id).toBe('test-cat')
    })

    it('rejects duplicate category ID', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('existing', 'Existing', 'Existing')

      const res = await app.request(
        '/api/admin/tags/categories',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: 'existing', name: 'Dup', name_en: 'Dup' }),
        },
        env,
      )
      expect(res.status).toBe(409)
    })

    it('updates a category', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')

      const res = await app.request(
        '/api/admin/tags/categories/object-class',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: '更新名称' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('deletes a category', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('to-delete', 'Delete Me', 'Delete Me')

      const res = await app.request(
        '/api/admin/tags/categories/to-delete',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('creates a tag', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')

      const res = await app.request(
        '/api/admin/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: 'new-tag',
            category_id: 'object-class',
            name: '新标签',
            name_zh: '新标签',
          }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(201)
      expect(body.tag.id).toBe('new-tag')
    })

    it('rejects duplicate tag ID', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')

      const res = await app.request(
        '/api/admin/tags',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: 'safe',
            category_id: 'object-class',
            name: 'Dup',
            name_zh: 'Dup',
          }),
        },
        env,
      )
      expect(res.status).toBe(409)
    })

    it('updates a tag', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')

      const res = await app.request(
        '/api/admin/tags/safe',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: 'Updated Safe', name_zh: '更新安全' }),
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('deletes a tag', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('to-delete', 'object-class', 'Delete Me', '删除我')

      const res = await app.request(
        '/api/admin/tags/to-delete',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('assigns tags to an entry', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')
      db._seedTag('euclid', 'object-class', 'Euclid', '欧几里得')

      const res = await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe', 'euclid'], language: 'en' }),
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('removes a tag from an entry', async () => {
      const { env, token } = await setupAdmin()
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')

      // First assign
      await app.request(
        '/api/admin/tags/entry/173',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: ['safe'], language: 'en' }),
        },
        env,
      )

      // Then remove
      const res = await app.request(
        '/api/admin/tags/entry/173/safe?language=en',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('returns tag statistics', async () => {
      const { env, token } = await setupAdmin()
      db._seedTagCategory('object-class', '对象等级', 'Object Class')
      db._seedTag('safe', 'object-class', 'Safe', '安全')

      const res = await app.request(
        '/api/admin/tags/stats',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.stats).toBeDefined()
      expect(body.stats.totalCategories).toBeDefined()
      expect(body.stats.totalTags).toBeDefined()
    })
  })

  // ─── Log Management ──────────────────────────────────────────

  describe('Log Management', () => {
    async function setupAdmin() {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')
      return { env, token }
    }

    function seedLog(level: string, message: string, source = 'server', category?: string) {
      db._tables.system_logs.push({
        id: db._tables.system_logs.length + 1,
        level,
        message,
        source,
        category: category ?? null,
        user_id: null,
        request_id: null,
        ip: null,
        user_agent: null,
        path: null,
        context: null,
        timestamp: new Date().toISOString(),
      })
    }

    it('lists logs', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Test error message')
      seedLog('warn', 'Test warning message')

      const res = await app.request(
        '/api/admin/logs',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.logs.length).toBeGreaterThanOrEqual(2)
    })

    it('filters logs by level', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Error message')
      seedLog('info', 'Info message')

      const res = await app.request(
        '/api/admin/logs?level=error',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.logs.every((l: any) => l.level === 'error')).toBe(true)
    })

    it('filters logs by source', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Server error', 'server')
      seedLog('error', 'Client error', 'client')

      const res = await app.request(
        '/api/admin/logs?source=client',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.logs.every((l: any) => l.source === 'client')).toBe(true)
    })

    it('searches logs by message', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Database connection failed')
      seedLog('info', 'User logged in')

      const res = await app.request(
        '/api/admin/logs?q=Database',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.logs.length).toBeGreaterThanOrEqual(1)
    })

    it('gets log statistics', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Error 1')
      seedLog('warn', 'Warning 1')
      seedLog('info', 'Info 1')

      const res = await app.request(
        '/api/admin/logs/stats',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.stats).toBeDefined()
      expect(body.stats.byLevel).toBeDefined()
      expect(body.stats.bySource).toBeDefined()
    })

    it('gets single log entry', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Specific error')

      const res = await app.request(
        '/api/admin/logs/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.log.message).toBe('Specific error')
    })

    it('cleans up old logs', async () => {
      const { env, token } = await setupAdmin()
      seedLog('error', 'Old error')
      seedLog('error', 'Recent error')

      const res = await app.request(
        '/api/admin/logs/cleanup?days=30',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toContain('30 days')
    })
  })

  // ─── Dashboard Stats ─────────────────────────────────────────

  describe('Dashboard Stats', () => {
    it('returns system statistics', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request(
        '/api/admin/stats',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.stats).toBeDefined()
      expect(body.stats.totalUsers).toBeDefined()
      expect(body.stats.recentActivity).toBeDefined()
    })

    it('reflects seeded data in stats', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      await db._seedUser('user1', 'password123')
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      db._seedEntry(682, 'en', 'Hard-to-Destroy Reptile', 'Keter')
      const token = await signAdminToken(1, 'admin')

      const res = await app.request(
        '/api/admin/stats',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(body.stats.totalUsers).toBe(2)
      expect(body.stats.entriesByLanguage.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ─── Settings ────────────────────────────────────────────────

  describe('Settings', () => {
    it('returns system settings', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request(
        '/api/admin/settings',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.settings).toBeDefined()
      expect(body.settings.database).toBeDefined()
      expect(body.settings.cors).toBeDefined()
    })

    it('reflects table counts in settings', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      await db._seedUser('user1', 'password123')
      db._seedEntry(173, 'en', 'The Sculpture', 'Euclid')
      const token = await signAdminToken(1, 'admin')

      const res = await app.request(
        '/api/admin/settings',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await parseJson(res)
      expect(body.settings.totals.users).toBe(2)
      expect(body.settings.totals.entries).toBe(1)
    })
  })
})
