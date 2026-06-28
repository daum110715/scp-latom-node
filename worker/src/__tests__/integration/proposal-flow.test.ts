/**
 * Integration tests for the complete proposal workflow.
 *
 * Tests create → list → detail → vote → admin moderation
 * through the full Hono app with all middleware applied.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../../index'
import { createIntegrationDB, createIntegrationEnv, parseJson, signUserToken, signAdminToken } from './helpers'

describe('Proposal Flow Integration', () => {
  let db: ReturnType<typeof createIntegrationDB>

  beforeEach(() => {
    db = createIntegrationDB()
  })

  describe('Complete Proposal Lifecycle', () => {
    async function setupUser() {
      const env = createIntegrationEnv(db)
      await db._seedUser('proposal_user', 'password123')
      const token = await signUserToken(1, 'proposal_user')
      return { env, token }
    }

    it('creates a proposal and lists it', async () => {
      const { env, token } = await setupUser()

      // Create proposal
      const createRes = await app.request('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'New Containment Protocol',
          content: 'This proposal outlines a new containment procedure for Keter-class objects.',
          category: 'protocol',
        }),
      }, env)
      const createBody = await parseJson(createRes)
      expect(createRes.status).toBe(201)
      expect(createBody.success).toBe(true)
      expect(createBody.proposal.title).toBe('New Containment Protocol')
      expect(createBody.proposal.status).toBe('open')

      // List proposals
      const listRes = await app.request('/api/proposals', { method: 'GET' }, env)
      const listBody = await parseJson(listRes)
      expect(listRes.status).toBe(200)
      expect(listBody.proposals).toHaveLength(1)
      expect(listBody.proposals[0].title).toBe('New Containment Protocol')
    })

    it('allows voting on a proposal', async () => {
      const { env, token } = await setupUser()

      // Create proposal
      const createRes = await app.request('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Vote Test Proposal',
          content: 'This proposal will receive votes from multiple users.',
        }),
      }, env)
      const createBody = await parseJson(createRes)
      const proposalId = createBody.proposal.id

      // Create second user and vote
      await db._seedUser('voter', 'password123')
      const voterToken = await signUserToken(2, 'voter')

      const voteRes = await app.request(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${voterToken}`,
        },
        body: JSON.stringify({ vote: 'for' }),
      }, env)
      const voteBody = await parseJson(voteRes)
      expect(voteRes.status).toBe(200)
      expect(voteBody.votesFor).toBe(1)
      expect(voteBody.userVote).toBe('for')

      // Get proposal detail
      const detailRes = await app.request(`/api/proposals/${proposalId}`, { method: 'GET' }, env)
      const detailBody = await parseJson(detailRes)
      expect(detailBody.proposal.votesFor).toBe(1)
    })

    it('enforces daily proposal limit', async () => {
      const { env, token } = await setupUser()

      // Create 2 proposals (the daily limit)
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/api/proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: `Proposal ${i + 1}`,
            content: `This is proposal number ${i + 1} with enough content.`,
          }),
        }, env)
        expect(res.status).toBe(201)
      }

      // Third proposal should be rejected
      const res = await app.request('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Third Proposal',
          content: 'This should be rejected due to daily limit.',
        }),
      }, env)
      expect(res.status).toBe(429)
      const body = await parseJson(res)
      expect(body.error).toContain('Daily limit')
    })

    it('prevents duplicate votes', async () => {
      const { env, token } = await setupUser()

      // Create proposal
      const createRes = await app.request('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Vote Test', content: 'Testing duplicate votes.' }),
      }, env)
      const createBody = await parseJson(createRes)
      const proposalId = createBody.proposal.id

      // First vote
      await app.request(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote: 'for' }),
      }, env)

      // Second vote should fail
      const res = await app.request(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vote: 'against' }),
      }, env)
      expect(res.status).toBe(409)
    })
  })

  describe('Admin Moderation Flow', () => {
    async function setupModerationScenario() {
      const env = createIntegrationEnv(db)

      // Create regular user and proposal
      await db._seedUser('proposal_author', 'password123')
      const authorToken = await signUserToken(1, 'proposal_author')

      const createRes = await app.request('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authorToken}`,
        },
        body: JSON.stringify({
          title: 'Proposal for Moderation',
          content: 'This proposal will be moderated by an admin.',
        }),
      }, env)
      const createBody = await parseJson(createRes)

      // Create admin user
      await db._seedUser('admin', 'password123', 'admin', 5)
      const adminToken = await signAdminToken(2, 'admin')

      return { env, adminToken, proposalId: createBody.proposal.id }
    }

    it('admin can approve a proposal', async () => {
      const { env, adminToken, proposalId } = await setupModerationScenario()

      const res = await app.request(`/api/admin/proposals/${proposalId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      }, env)
      const body = await parseJson(res)
      expect(res.status).toBe(200)
      expect(body.message).toContain('approved')
    })

    it('admin can reject a proposal', async () => {
      const { env, adminToken, proposalId } = await setupModerationScenario()

      const res = await app.request(`/api/admin/proposals/${proposalId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'rejected' }),
      }, env)
      expect(res.status).toBe(200)
    })

    it('non-admin cannot moderate proposals', async () => {
      const { env, proposalId } = await setupModerationScenario()

      await db._seedUser('regular_user', 'password123')
      const userToken = await signUserToken(3, 'regular_user')

      const res = await app.request(`/api/admin/proposals/${proposalId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      }, env)
      expect(res.status).toBe(403)
    })

    it('admin can delete a proposal', async () => {
      const { env, adminToken, proposalId } = await setupModerationScenario()

      const res = await app.request(`/api/admin/proposals/${proposalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }, env)
      expect(res.status).toBe(200)

      // Verify it's gone
      const listRes = await app.request('/api/proposals', { method: 'GET' }, env)
      const listBody = await parseJson(listRes)
      expect(listBody.proposals).toHaveLength(0)
    })
  })
})
