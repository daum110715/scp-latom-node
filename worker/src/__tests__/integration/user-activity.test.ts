/**
 * Integration tests for user activity (bookmarks + history).
 *
 * Tests the complete lifecycle of bookmarks and browsing history
 * through the full Hono app with all middleware applied.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson, signUserToken } from './helpers'

describe('User Activity Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  describe('Bookmark Lifecycle', () => {
    async function setupUser() {
      const env = createIntegrationEnv(db)
      await db._seedUser('bookmark_user', 'password123')
      const token = await signUserToken(1, 'bookmark_user')
      return { env, token }
    }

    it('adds, checks, lists, and removes bookmarks', async () => {
      const { env, token } = await setupUser()

      // Add bookmark
      const addRes = await app.request('/api/bookmarks/en/173', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const addBody = await parseJson(addRes)
      expect(addRes.status).toBe(201)
      expect(addBody.message).toContain('Bookmark added')

      // Check bookmarked
      const checkRes = await app.request('/api/bookmarks/en/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const checkBody = await parseJson(checkRes)
      expect(checkBody.bookmarked).toBe(true)

      // List bookmarks
      const listRes = await app.request('/api/bookmarks', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const listBody = await parseJson(listRes)
      expect(listBody.bookmarks).toHaveLength(1)
      expect(listBody.bookmarks[0].scpNumber).toBe(173)

      // Remove bookmark
      const removeRes = await app.request('/api/bookmarks/en/173', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(removeRes.status).toBe(200)

      // Verify removed
      const verifyRes = await app.request('/api/bookmarks/en/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const verifyBody = await parseJson(verifyRes)
      expect(verifyBody.bookmarked).toBe(false)
    })

    it('prevents duplicate bookmarks', async () => {
      const { env, token } = await setupUser()

      // Add first time
      await app.request('/api/bookmarks/en/173', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, env)

      // Add again
      const res = await app.request('/api/bookmarks/en/173', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(409)
    })

    it('returns 404 when removing nonexistent bookmark', async () => {
      const { env, token } = await setupUser()

      const res = await app.request('/api/bookmarks/en/999', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('History Lifecycle', () => {
    async function setupUser() {
      const env = createIntegrationEnv(db)
      await db._seedUser('history_user', 'password123')
      const token = await signUserToken(1, 'history_user')
      return { env, token }
    }

    it('records, lists, and clears history', async () => {
      const { env, token } = await setupUser()

      // Record visits
      for (const scp of [173, 999, 682]) {
        const res = await app.request('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            language: 'en',
            scpNumber: scp,
            name: `SCP-${scp}`,
            objectClass: 'Euclid',
          }),
        }, env)
        expect(res.status).toBe(200)
      }

      // List history
      const listRes = await app.request('/api/history', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const listBody = await parseJson(listRes)
      expect(listBody.entries).toHaveLength(3)
      expect(listBody.total).toBe(3)

      // Clear all history
      const clearRes = await app.request('/api/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(clearRes.status).toBe(200)

      // Verify cleared
      const verifyRes = await app.request('/api/history', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const verifyBody = await parseJson(verifyRes)
      expect(verifyBody.entries).toHaveLength(0)
    })

    it('deletes individual history entries', async () => {
      const { env, token } = await setupUser()

      // Record a visit
      await app.request('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: 'en', scpNumber: 173 }),
      }, env)

      // List to get the ID
      const listRes = await app.request('/api/history', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const listBody = await parseJson(listRes)
      const entryId = listBody.entries[0].id

      // Delete specific entry
      const deleteRes = await app.request(`/api/history/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(deleteRes.status).toBe(200)

      // Verify deleted
      const verifyRes = await app.request('/api/history', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const verifyBody = await parseJson(verifyRes)
      expect(verifyBody.entries).toHaveLength(0)
    })

    it('supports pagination', async () => {
      const { env, token } = await setupUser()

      // Record multiple visits
      for (let i = 1; i <= 5; i++) {
        await app.request('/api/history', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ language: 'en', scpNumber: i }),
        }, env)
      }

      // Get page 1 with limit 2
      const res = await app.request('/api/history?page=1&limit=2', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await parseJson(res)
      expect(body.entries).toHaveLength(2)
      expect(body.total).toBe(5)
      expect(body.totalPages).toBe(3)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(2)
    })
  })
})
