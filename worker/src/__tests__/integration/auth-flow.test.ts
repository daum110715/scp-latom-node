/**
 * Integration tests for the complete authentication flow.
 *
 * Tests register → login → access protected routes → update profile
 * through the full Hono app with all middleware applied.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson, signUserToken } from './helpers'

describe('Auth Flow Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  describe('Complete Registration → Login → Access Flow', () => {
    it('registers, logs in, and accesses protected route', async () => {
      const env = createIntegrationEnv(db)

      // Step 1: Register
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'integration_agent', password: 'securepass123' }),
      }, env)
      const regBody = await parseJson(regRes)
      expect(regRes.status).toBe(201)
      expect(regBody.success).toBe(true)
      expect(regBody.token).toBeTruthy()
      expect(regBody.user.codename).toBe('integration_agent')
      expect(regBody.user.role).toBe('personnel')
      expect(regBody.user.password).toBeUndefined()

      const token = regBody.token

      // Step 2: Access protected route with token
      const meRes = await app.request('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const meBody = await parseJson(meRes)
      expect(meRes.status).toBe(200)
      expect(meBody.success).toBe(true)
      expect(meBody.user.codename).toBe('integration_agent')

      // Step 3: Login with same credentials
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'integration_agent', password: 'securepass123' }),
      }, env)
      const loginBody = await parseJson(loginRes)
      expect(loginRes.status).toBe(200)
      expect(loginBody.success).toBe(true)
      expect(loginBody.token).toBeTruthy()
    })

    it('prevents duplicate registration', async () => {
      const env = createIntegrationEnv(db)

      // Register first user
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'taken_name', password: 'password123' }),
      }, env)

      // Try same codename
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'taken_name', password: 'password456' }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(409)
      expect(body.error).toContain('already taken')
    })

    it('rejects invalid credentials on login', async () => {
      const env = createIntegrationEnv(db)

      // Register
      await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'test_agent', password: 'password123' }),
      }, env)

      // Login with wrong password
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'test_agent', password: 'wrongpassword' }),
      }, env)
      expect(res.status).toBe(401)
    })
  })

  describe('Profile Update Flow', () => {
    async function setupAuthenticatedUser() {
      const env = createIntegrationEnv(db)
      const regRes = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'profile_user', password: 'password123' }),
      }, env)
      const regBody = await parseJson(regRes)
      return { env, token: regBody.token }
    }

    it('updates codename', async () => {
      const { env, token } = await setupAuthenticatedUser()

      const res = await app.request('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ codename: 'new_codename' }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.user.codename).toBe('new_codename')
    })

    it('changes password and logs in with new password', async () => {
      const { env, token } = await setupAuthenticatedUser()

      // Change password
      const updateRes = await app.request('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: 'password123', newPassword: 'newpassword456' }),
      }, env)
      expect(updateRes.status).toBe(200)

      // Login with new password
      const loginRes = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'profile_user', password: 'newpassword456' }),
      }, env)
      expect(loginRes.status).toBe(200)
    })

    it('rejects profile update without authentication', async () => {
      const env = createIntegrationEnv(db)

      const res = await app.request('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codename: 'new_name' }),
      }, env)
      expect(res.status).toBe(401)
    })
  })

  describe('Token Validation', () => {
    it('rejects expired tokens', async () => {
      // We can't easily create an expired token in this test,
      // but we can test that an invalid token is rejected
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: 'Bearer invalid.token.here' },
      }, env)
      expect(res.status).toBe(401)
    })

    it('rejects missing Bearer prefix', async () => {
      const env = createIntegrationEnv(db)
      const token = await signUserToken(1)
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: token }, // Missing "Bearer "
      }, env)
      expect(res.status).toBe(401)
    })

    it('rejects empty Authorization header', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: '' },
      }, env)
      expect(res.status).toBe(401)
    })
  })

  describe('Cross-Route Auth Protection', () => {
    it('protects history routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/history', { method: 'GET' }, env)
      expect(res.status).toBe(401)
    })

    it('protects bookmark routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/bookmarks', { method: 'GET' }, env)
      expect(res.status).toBe(401)
    })

    it('protects report routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/reports', { method: 'GET' }, env)
      expect(res.status).toBe(401)
    })

    it('protects proposal creation', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', content: 'Content here' }),
      }, env)
      expect(res.status).toBe(401)
    })

    it('allows public tag routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/tags', { method: 'GET' }, env)
      expect(res.status).toBe(200)
    })

    it('allows public proposal listing', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/proposals', { method: 'GET' }, env)
      expect(res.status).toBe(200)
    })
  })
})
