import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import reportRoutes from '../reports'
import { signToken } from '../../utils/jwt'
import type { Env, JwtPayload } from '../../types'

const TEST_SECRET = 'test-reports-secret'

interface ApiResponse {
  success: boolean
  error?: string
  message?: string
  report?: any
  reports?: any[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
  hasReports?: boolean
  count?: number
  maxReports?: number
}

const mockReport = {
  id: 1,
  user_id: 1,
  scp_number: 173,
  language: 'en',
  report_type: 'content_error',
  description: 'There is a typo in the description.',
  status: 'open',
  admin_note: null,
  created_at: '2026-06-26T00:00:00',
  updated_at: '2026-06-26T00:00:00',
  name: 'The Sculpture',
  object_class: 'Euclid',
}

function createMockDB(data: {
  reportRows?: any[]
  report?: any
  entryExists?: boolean
  existingCount?: number
  duplicateReport?: any
  insertResult?: any
  checkRows?: any[]
} = {}) {
  const {
    reportRows = [],
    report = null,
    entryExists = true,
    existingCount = 0,
    duplicateReport = null,
    insertResult,
    checkRows = [],
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
          if (sql.includes('SELECT id FROM scp_entries WHERE scp_number = ? AND language = ?')) {
            return entryExists ? { id: 1 } : null
          }
          if (sql.includes('COUNT(*)') && sql.includes('entry_reports WHERE user_id = ? AND scp_number = ? AND language = ?')) {
            return { count: existingCount }
          }
          if (sql.includes('SELECT id FROM entry_reports WHERE user_id = ? AND scp_number = ? AND language = ? AND report_type = ?')) {
            return duplicateReport
          }
          if (sql.includes('COUNT(*)') && sql.includes('entry_reports WHERE user_id = ?')) {
            return { total: reportRows.length }
          }
          if (sql.includes('SELECT r.*, e.name') && sql.includes('WHERE r.id = ? AND r.user_id = ?')) {
            return report
          }
          if (sql.includes('INSERT INTO entry_reports') && sql.includes('RETURNING *')) {
            return insertResult ?? mockReport
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM entry_reports') && sql.includes('LEFT JOIN')) {
            return { results: reportRows }
          }
          if (sql.includes('SELECT id, report_type, status FROM entry_reports')) {
            return { results: checkRows }
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
  app.route('/api/reports', reportRoutes)
  return app
}

async function signTestToken(sub = 1) {
  return signToken({ sub, codename: 'test_agent', role: 'personnel', clearance: 1 }, TEST_SECRET)
}

describe('Report Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token on POST /', async () => {
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'content_error', description: 'Test report' }),
      }, createEnv())
      expect(res.status).toBe(401)
    })

    it('returns 401 without token on GET /', async () => {
      const res = await app.request('/api/reports', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/reports', () => {
    it('submits a report successfully', async () => {
      const token = await signTestToken()
      const env = createEnv({ entryExists: true, existingCount: 0, duplicateReport: null })
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'content_error', description: 'There is a typo in the description.' }),
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.message).toContain('submitted')
      expect(body.report).toBeDefined()
    })

    it('rejects invalid SCP number', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 0, language: 'en', reportType: 'content_error', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(400)
    })

    it('rejects invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'fr', reportType: 'content_error', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(400)
    })

    it('rejects invalid report type', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'invalid_type', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Invalid report type')
    })

    it('rejects description that is too short', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'content_error', description: 'Short' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('10-2000')
    })

    it('returns 404 when entry not found', async () => {
      const token = await signTestToken()
      const env = createEnv({ entryExists: false })
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 99999, language: 'en', reportType: 'content_error', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(404)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('not found')
    })

    it('returns 429 when max reports reached', async () => {
      const token = await signTestToken()
      const env = createEnv({ existingCount: 3 })
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'content_error', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(429)
    })

    it('returns 409 for duplicate report type', async () => {
      const token = await signTestToken()
      const env = createEnv({ duplicateReport: { id: 1 } })
      const res = await app.request('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scpNumber: 173, language: 'en', reportType: 'content_error', description: 'Test report content here.' }),
      }, env)
      expect(res.status).toBe(409)
    })
  })

  describe('GET /api/reports', () => {
    it('returns paginated reports', async () => {
      const token = await signTestToken()
      const env = createEnv({ reportRows: [mockReport] })
      const res = await app.request('/api/reports', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.reports).toHaveLength(1)
      expect(body.total).toBe(1)
    })
  })

  describe('GET /api/reports/:id', () => {
    it('returns a single report', async () => {
      const token = await signTestToken()
      const env = createEnv({ report: mockReport })
      const res = await app.request('/api/reports/1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.report!.id).toBe(1)
    })

    it('returns 400 for invalid ID', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports/abc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(400)
    })

    it('returns 404 when report not found', async () => {
      const token = await signTestToken()
      const env = createEnv({ report: null })
      const res = await app.request('/api/reports/999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/reports/check/:lang/:scpNumber', () => {
    it('returns hasReports: true when reports exist', async () => {
      const token = await signTestToken()
      const env = createEnv({ checkRows: [{ id: 1, report_type: 'content_error', status: 'open' }] })
      const res = await app.request('/api/reports/check/en/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.hasReports).toBe(true)
      expect(body.count).toBe(1)
      expect(body.maxReports).toBe(3)
    })

    it('returns hasReports: false when no reports exist', async () => {
      const token = await signTestToken()
      const env = createEnv({ checkRows: [] })
      const res = await app.request('/api/reports/check/en/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.hasReports).toBe(false)
      expect(body.count).toBe(0)
    })

    it('returns 400 for invalid language', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/reports/check/fr/173', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      expect(res.status).toBe(400)
    })
  })
})
