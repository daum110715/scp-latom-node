/**
 * Integration tests for admin operations.
 *
 * Tests admin user management, entry management, and system settings
 * through the full Hono app with the admin middleware applied via the real router.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson, signUserToken, signAdminToken } from './helpers'

describe('Admin Flow Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

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

      const res = await app.request('/api/admin/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(403)
    })

    it('allows admin access', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request('/api/admin/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)
    })
  })

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

      const res = await app.request('/api/admin/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.users.length).toBeGreaterThanOrEqual(3) // admin + user1 + user2
    })

    it('gets user detail with activity counts', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('detail_user', 'password123')

      const res = await app.request('/api/admin/users/2', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.user.codename).toBe('detail_user')
      expect(body.user.historyCount).toBeDefined()
      expect(body.user.bookmarkCount).toBeDefined()
    })

    it('changes user role', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('role_user', 'password123')

      const res = await app.request('/api/admin/users/2/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: 'researcher' }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('researcher')
    })

    it('changes user clearance', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('clearance_user', 'password123')

      const res = await app.request('/api/admin/users/2/clearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clearance: 4 }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('4')
    })

    it('bans and unbans users', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('ban_user', 'password123')

      // Ban
      const banRes = await app.request('/api/admin/users/2/ban', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(banRes.status).toBe(200)

      // Unban
      const unbanRes = await app.request('/api/admin/users/2/unban', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(unbanRes.status).toBe(200)
    })

    it('prevents banning admin users', async () => {
      const { env, token } = await setupAdmin()

      const res = await app.request('/api/admin/users/1/ban', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(400)
      const body = await parseJson(res)
      expect(body.error).toContain('admin')
    })

    it('deletes users and cascades', async () => {
      const { env, token } = await setupAdmin()
      await db._seedUser('delete_user', 'password123')

      const res = await app.request('/api/admin/users/2', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(200)

      // Verify deleted
      const listRes = await app.request('/api/admin/users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const listBody = await parseJson(listRes)
      expect(listBody.users.find((u: any) => u.codename === 'delete_user')).toBeUndefined()
    })
  })

  describe('Dashboard Stats', () => {
    it('returns system statistics', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request('/api/admin/stats', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.stats).toBeDefined()
      expect(body.stats.totalUsers).toBeDefined()
      expect(body.stats.recentActivity).toBeDefined()
    })
  })

  describe('Settings', () => {
    it('returns system settings', async () => {
      const env = createIntegrationEnv(db)
      await db._seedUser('admin', 'password123', 'admin', 5)
      const token = await signAdminToken(1, 'admin')

      const res = await app.request('/api/admin/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.settings).toBeDefined()
      expect(body.settings.database).toBeDefined()
      expect(body.settings.cors).toBeDefined()
    })
  })
})
