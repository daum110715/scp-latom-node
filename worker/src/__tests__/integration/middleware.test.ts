/**
 * Integration tests for the middleware chain.
 *
 * Tests CORS, request logging, 404 handling, and error handling
 * through the full Hono app with all middleware applied.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson } from './helpers'

describe('Middleware Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  describe('Request ID Header', () => {
    it('includes X-Request-Id on successful responses', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/health', { method: 'GET' }, env)
      expect(res.headers.get('X-Request-Id')).toBeTruthy()
    })

    it('includes X-Request-Id on 404 responses', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/nonexistent', { method: 'GET' }, env)
      expect(res.headers.get('X-Request-Id')).toBeTruthy()
    })

    it('includes X-Request-Id on 401 responses', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/history', { method: 'GET' }, env)
      expect(res.headers.get('X-Request-Id')).toBeTruthy()
    })
  })

  describe('CORS Headers', () => {
    it('includes CORS headers for allowed origins', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request(
        '/api/health',
        {
          method: 'GET',
          headers: { Origin: 'https://scp.lat' },
        },
        env,
      )
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://scp.lat')
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('handles wildcard subdomain origins', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request(
        '/api/health',
        {
          method: 'GET',
          headers: { Origin: 'https://node.scp.lat' },
        },
        env,
      )
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://node.scp.lat')
    })

    it('rejects disallowed origins', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request(
        '/api/health',
        {
          method: 'GET',
          headers: { Origin: 'https://evil.com' },
        },
        env,
      )
      expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.com')
    })

    it('handles preflight OPTIONS requests', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request(
        '/api/auth/register',
        {
          method: 'OPTIONS',
          headers: {
            Origin: 'https://scp.lat',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
          },
        },
        env,
      )
      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
    })
  })

  describe('Health Check', () => {
    it('returns ok status', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/health', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.status).toBe('ok')
      expect(body.service).toBe('scp-latom-node-api')
      expect(body.timestamp).toBeTruthy()
    })
  })

  describe('404 Handler', () => {
    it('returns JSON 404 for unknown API routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/nonexistent', { method: 'GET' }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(404)
      expect(body.success).toBe(false)
      expect(body.error).toBe('Not found')
    })

    it('returns JSON 404 for unknown nested routes', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/auth/nonexistent', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('Content-Type Handling', () => {
    it('returns JSON content type for API responses', async () => {
      const env = createIntegrationEnv(db)
      const res = await app.request('/api/health', { method: 'GET' }, env)
      expect(res.headers.get('content-type')).toContain('application/json')
    })
  })
})
