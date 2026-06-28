import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { adminMiddleware } from '../admin'
import { signToken } from '../../utils/jwt'
import type { Env, JwtPayload } from '../../types'

const TEST_SECRET = 'test-admin-middleware-secret'

function createEnv(): Env {
  return {
    DB: {} as D1Database,
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
  app.use('/admin/*', adminMiddleware)
  app.get('/admin/test', (c) => {
    const user = c.get('user')
    return c.json({ success: true, user })
  })
  return app
}

async function signAdminToken(secret = TEST_SECRET) {
  return signToken({ sub: 1, codename: 'admin_user', role: 'admin', clearance: 5 }, secret)
}

async function signUserToken(secret = TEST_SECRET) {
  return signToken({ sub: 2, codename: 'regular_user', role: 'personnel', clearance: 1 }, secret)
}

describe('adminMiddleware', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/admin/test', { method: 'GET' }, createEnv())
    expect(res.status).toBe(401)
    const body = await res.json<{ success: boolean; error: string }>()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing or invalid authorization header')
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    }, createEnv())
    expect(res.status).toBe(401)
    const body = await res.json<{ success: boolean; error: string }>()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Missing or invalid authorization header')
  })

  it('returns 401 when token is invalid', async () => {
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.token.here' },
    }, createEnv())
    expect(res.status).toBe(401)
    const body = await res.json<{ success: boolean; error: string }>()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Invalid or expired token')
  })

  it('returns 401 when token is signed with wrong secret', async () => {
    const token = await signAdminToken('wrong-secret')
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, createEnv())
    expect(res.status).toBe(401)
    const body = await res.json<{ success: boolean; error: string }>()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Invalid or expired token')
  })

  it('returns 403 when user is not an admin', async () => {
    const token = await signUserToken()
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, createEnv())
    expect(res.status).toBe(403)
    const body = await res.json<{ success: boolean; error: string }>()
    expect(body.success).toBe(false)
    expect(body.error).toContain('Admin access required')
  })

  it('passes through and sets user for admin tokens', async () => {
    const token = await signAdminToken()
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, createEnv())
    expect(res.status).toBe(200)
    const body = await res.json<{ success: boolean; user: JwtPayload }>()
    expect(body.success).toBe(true)
    expect(body.user.sub).toBe(1)
    expect(body.user.codename).toBe('admin_user')
    expect(body.user.role).toBe('admin')
    expect(body.user.clearance).toBe(5)
  })

  it('returns 401 for empty Bearer token', async () => {
    const res = await app.request('/admin/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' },
    }, createEnv())
    expect(res.status).toBe(401)
  })
})
