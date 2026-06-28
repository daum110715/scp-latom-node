import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import proposalRoutes from '../proposals'
import { signToken } from '../../../utils/jwt'
import { adminMiddleware } from '../../../middleware/admin'
import type { Env, JwtPayload } from '../../../types'

const TEST_SECRET = 'test-admin-proposals-secret'

const mockProposal = {
  id: 1,
  user_id: 1,
  title: 'Test Proposal',
  content: 'Content here',
  category: 'general',
  status: 'open',
  created_at: '2026-06-26',
  updated_at: '2026-06-26',
  author_codename: 'test_agent',
}

function createMockDB(
  data: {
    proposals?: any[]
    proposal?: any
    countResult?: { total: number }
    voteCounts?: { vfor: number; against: number; abstain: number }
    voters?: any[]
  } = {},
) {
  const {
    proposals = [],
    proposal = null,
    countResult,
    voteCounts = { vfor: 0, against: 0, abstain: 0 },
    voters = [],
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
          if (sql.includes('COUNT(*)')) return countResult ?? { total: proposals.length }
          if (sql.includes('SUM(CASE WHEN vote')) return voteCounts
          if (sql.includes('WHERE p.id = ?')) return proposal
          if (sql.includes('SELECT id FROM proposals WHERE id = ?'))
            return proposal ? { id: proposal.id } : null
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('FROM proposals')) return { results: proposals }
          if (sql.includes('FROM proposal_votes')) return { results: voters }
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
  app.use('/api/admin/proposals/*', adminMiddleware)
  app.route('/api/admin/proposals', proposalRoutes)
  return app
}

async function signAdminToken() {
  return signToken({ sub: 1, codename: 'admin', role: 'admin', clearance: 5 }, TEST_SECRET)
}

describe('Admin Proposal Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('Auth enforcement', () => {
    it('returns 401 without token', async () => {
      const res = await app.request('/api/admin/proposals', { method: 'GET' }, createEnv())
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/proposals', () => {
    it('returns paginated proposals', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [mockProposal], countResult: { total: 1 } })
      const res = await app.request(
        '/api/admin/proposals',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.proposals).toHaveLength(1)
    })

    it('supports status filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/proposals?status=approved',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('supports category filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/proposals?category=research',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('supports userId filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/proposals?userId=1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('ignores invalid category filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/proposals?category=invalid',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('ignores non-numeric userId filter', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposals: [], countResult: { total: 0 } })
      const res = await app.request(
        '/api/admin/proposals?userId=abc',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(200)
    })

    it('returns 401 without token', async () => {
      const env = createEnv()
      const res = await app.request('/api/admin/proposals', { method: 'GET' }, env)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/admin/proposals/:id', () => {
    it('returns proposal with voters', async () => {
      const token = await signAdminToken()
      const env = createEnv({
        proposal: mockProposal,
        voteCounts: { vfor: 5, against: 2, abstain: 1 },
        voters: [{ vote: 'for', created_at: '2026-06-26', codename: 'voter1' }],
      })
      const res = await app.request(
        '/api/admin/proposals/1',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.proposal.voters).toHaveLength(1)
    })

    it('returns 400 for invalid ID', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/proposals/abc',
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent proposal', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: null })
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

  describe('PUT /api/admin/proposals/:id/status', () => {
    it('updates proposal status to approved', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: mockProposal })
      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'approved' }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('approved')
    })

    it('updates proposal status to rejected', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: mockProposal })
      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'rejected' }),
        },
        env,
      )
      const body = await res.json<any>()
      expect(res.status).toBe(200)
      expect(body.message).toContain('rejected')
    })

    it('rejects invalid status', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'invalid' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('rejects empty status', async () => {
      const token = await signAdminToken()
      const env = createEnv()
      const res = await app.request(
        '/api/admin/proposals/1/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: '' }),
        },
        env,
      )
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent proposal', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: null })
      const res = await app.request(
        '/api/admin/proposals/999/status',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: 'approved' }),
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/proposals/:id', () => {
    it('deletes a proposal', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: mockProposal })
      const res = await app.request(
        '/api/admin/proposals/1',
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

    it('returns 404 for nonexistent proposal', async () => {
      const token = await signAdminToken()
      const env = createEnv({ proposal: null })
      const res = await app.request(
        '/api/admin/proposals/999',
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
        env,
      )
      expect(res.status).toBe(404)
    })
  })
})
