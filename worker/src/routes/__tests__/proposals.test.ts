import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import proposalRoutes from '../proposals'
import { signToken } from '../../utils/jwt'
import type { Env, JwtPayload } from '../../types'

const TEST_SECRET = 'test-proposals-secret'

interface ApiResponse {
  success: boolean
  error?: string
  message?: string
  proposal?: any
  proposals?: any[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
  dailyUsed?: number
  dailyLimit?: number
  votesFor?: number
  votesAgainst?: number
  votesAbstain?: number
  userVote?: string | null
}

const mockProposal = {
  id: 1,
  user_id: 1,
  title: 'Test Proposal',
  content: 'This is a test proposal with enough content.',
  category: 'general',
  status: 'open',
  created_at: '2026-06-26T00:00:00',
  updated_at: '2026-06-26T00:00:00',
  author_codename: 'test_agent',
}

function createMockDB(data: {
  proposals?: any[]
  proposal?: any
  voteCounts?: { vfor: number; against: number; abstain: number }
  userVote?: any
  dailyCount?: number
  existingVote?: any
  insertResult?: any
} = {}) {
  const {
    proposals = [],
    proposal = null,
    voteCounts = { vfor: 0, against: 0, abstain: 0 },
    userVote = null,
    dailyCount = 0,
    existingVote = null,
    insertResult,
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
          if (sql.includes('COUNT(*)') && sql.includes('proposals WHERE user_id = ? AND created_at >= date')) {
            return { count: dailyCount }
          }
          if (sql.includes('COUNT(*)') && sql.includes('proposals')) {
            return { total: proposals.length }
          }
          if (sql.includes('SUM(CASE WHEN vote')) {
            return voteCounts
          }
          if (sql.includes('SELECT vote FROM proposal_votes WHERE proposal_id = ? AND user_id = ?')) {
            return userVote
          }
          if (sql.includes('SELECT id, status FROM proposals WHERE id = ?')) {
            return proposal
          }
          if (sql.includes('SELECT id, vote FROM proposal_votes WHERE proposal_id = ? AND user_id = ?')) {
            return existingVote
          }
          if (sql.includes('SELECT p.*, u.codename') && sql.includes('WHERE p.id = ?')) {
            return proposal
          }
          if (sql.includes('INSERT INTO proposals') && sql.includes('RETURNING *')) {
            return insertResult ?? { ...mockProposal, id: 2 }
          }
          return null
        },
        all: async (): Promise<{ results: any[] }> => {
          if (sql.includes('SELECT p.*, u.codename')) {
            return { results: proposals }
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
  const app = new Hono<{ Bindings: Env }>()
  app.route('/api/proposals', proposalRoutes)
  return app
}

async function signTestToken(sub = 1) {
  return signToken({ sub, codename: 'test_agent', role: 'personnel', clearance: 1 }, TEST_SECRET)
}

describe('Proposal Routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    app = createTestApp()
  })

  describe('GET /api/proposals', () => {
    it('returns paginated proposals', async () => {
      const env = createEnv({ proposals: [mockProposal] })
      const res = await app.request('/api/proposals', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.proposals).toHaveLength(1)
      expect(body.total).toBe(1)
      expect(body.dailyLimit).toBe(2)
    })

    it('returns dailyUsed when authenticated', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposals: [mockProposal], dailyCount: 1 })
      const res = await app.request('/api/proposals', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.dailyUsed).toBe(1)
    })

    it('returns dailyUsed as 0 when unauthenticated', async () => {
      const env = createEnv({ proposals: [mockProposal] })
      const res = await app.request('/api/proposals', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(body.dailyUsed).toBe(0)
    })

    it('supports status filter', async () => {
      const env = createEnv({ proposals: [] })
      const res = await app.request('/api/proposals?status=approved', { method: 'GET' }, env)
      expect(res.status).toBe(200)
    })

    it('supports category filter', async () => {
      const env = createEnv({ proposals: [] })
      const res = await app.request('/api/proposals?category=protocol', { method: 'GET' }, env)
      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/proposals/:id', () => {
    it('returns a single proposal', async () => {
      const env = createEnv({ proposal: mockProposal })
      const res = await app.request('/api/proposals/1', { method: 'GET' }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.proposal!.id).toBe(1)
      expect(body.proposal!.title).toBe('Test Proposal')
    })

    it('returns 400 for invalid ID', async () => {
      const env = createEnv()
      const res = await app.request('/api/proposals/abc', { method: 'GET' }, env)
      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent proposal', async () => {
      const env = createEnv({ proposal: null })
      const res = await app.request('/api/proposals/999', { method: 'GET' }, env)
      expect(res.status).toBe(404)
    })

    it('includes userVote when authenticated', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposal: mockProposal, userVote: { vote: 'for' } })
      const res = await app.request('/api/proposals/1', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }, env)
      const body = await res.json<ApiResponse>()
      expect(body.proposal!.userVote).toBe('for')
    })
  })

  describe('POST /api/proposals', () => {
    it('requires authentication', async () => {
      const env = createEnv()
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', content: 'Short' }),
      }, env)
      expect(res.status).toBe(401)
    })

    it('creates a proposal', async () => {
      const token = await signTestToken()
      const env = createEnv({ dailyCount: 0 })
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'New Proposal', content: 'This is a valid proposal content.', category: 'general' }),
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(body.proposal).toBeDefined()
    })

    it('rejects title that is too short', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Hi', content: 'This is a valid proposal content.' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('5-200')
    })

    it('rejects content that is too short', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Valid Title', content: 'Short' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('20-10000')
    })

    it('rejects invalid category', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Valid Title', content: 'This is valid content for the proposal.', category: 'invalid' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Invalid category')
    })

    it('returns 429 when daily limit reached', async () => {
      const token = await signTestToken()
      const env = createEnv({ dailyCount: 2 })
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: 'Valid Title', content: 'This is valid content for the proposal.' }),
      }, env)
      expect(res.status).toBe(429)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Daily limit')
    })
  })

  describe('POST /api/proposals/:id/vote', () => {
    it('requires authentication', async () => {
      const env = createEnv()
      const res = await app.request('/api/proposals/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: 'for' }),
      }, env)
      expect(res.status).toBe(401)
    })

    it('records a vote', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposal: mockProposal, existingVote: null, voteCounts: { vfor: 1, against: 0, abstain: 0 } })
      const res = await app.request('/api/proposals/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote: 'for' }),
      }, env)
      const body = await res.json<ApiResponse>()
      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.message).toContain('Vote recorded')
      expect(body.votesFor).toBe(1)
      expect(body.userVote).toBe('for')
    })

    it('rejects invalid vote value', async () => {
      const token = await signTestToken()
      const env = createEnv()
      const res = await app.request('/api/proposals/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote: 'maybe' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Invalid vote')
    })

    it('returns 404 for nonexistent proposal', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposal: null })
      const res = await app.request('/api/proposals/999/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote: 'for' }),
      }, env)
      expect(res.status).toBe(404)
    })

    it('returns 400 when proposal is not open', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposal: { ...mockProposal, status: 'approved' } })
      const res = await app.request('/api/proposals/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote: 'for' }),
      }, env)
      expect(res.status).toBe(400)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('Voting is closed')
    })

    it('returns 409 when user already voted', async () => {
      const token = await signTestToken()
      const env = createEnv({ proposal: mockProposal, existingVote: { id: 1, vote: 'for' } })
      const res = await app.request('/api/proposals/1/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vote: 'against' }),
      }, env)
      expect(res.status).toBe(409)
      const body = await res.json<ApiResponse>()
      expect(body.error).toContain('already voted')
    })
  })
})
