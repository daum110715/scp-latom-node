import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/proposals', () => ({
  fetchProposals: vi.fn(),
  fetchProposal: vi.fn(),
  createProposal: vi.fn(),
  voteProposal: vi.fn(),
}))

import { useProposalsStore } from '../proposals'
import { fetchProposals, fetchProposal, createProposal, voteProposal } from '@/services/proposals'
import type { ProposalPublic } from '@/services/proposals'
import { ErrorCode } from '@/services/errors'

const mockFetchProposals = vi.mocked(fetchProposals)
const mockFetchProposal = vi.mocked(fetchProposal)
const mockCreateProposal = vi.mocked(createProposal)
const mockVoteProposal = vi.mocked(voteProposal)

function okResult<T>(data: T) {
  return { ok: true as const, data }
}

function errResult(error: string) {
  return { ok: false as const, code: ErrorCode.SERVER_ERROR, error }
}

const mockProposal: ProposalPublic = {
  id: 1,
  title: 'Test Proposal',
  content: 'This is a test proposal.',
  category: 'general',
  status: 'open',
  authorCodename: 'test_agent',
  votesFor: 5,
  votesAgainst: 2,
  votesAbstain: 1,
  userVote: null,
  createdAt: '2026-06-26T00:00:00',
  updatedAt: '2026-06-26T00:00:00',
}

const mockListResponse = {
  proposals: [mockProposal],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  dailyUsed: 0,
  dailyLimit: 2,
}

describe('Proposals Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty proposals', () => {
      const store = useProposalsStore()
      expect(store.proposals).toEqual([])
      expect(store.currentProposal).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.creating).toBe(false)
      expect(store.error).toBe('')
      expect(store.dailyUsed).toBe(0)
      expect(store.dailyLimit).toBe(2)
    })
  })

  describe('loadProposals', () => {
    it('fetches proposals successfully', async () => {
      mockFetchProposals.mockResolvedValueOnce(okResult(mockListResponse))
      const store = useProposalsStore()
      await store.loadProposals()

      expect(store.proposals).toHaveLength(1)
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.totalPages).toBe(1)
      expect(store.dailyUsed).toBe(0)
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      mockFetchProposals.mockResolvedValueOnce(errResult('Network error'))
      const store = useProposalsStore()
      await store.loadProposals()

      expect(store.error).toBe('Network error')
      expect(store.proposals).toEqual([])
    })

    it('passes parameters to the API', async () => {
      mockFetchProposals.mockResolvedValueOnce(okResult(mockListResponse))
      const store = useProposalsStore()
      await store.loadProposals(2, 'approved', 'protocol')

      expect(mockFetchProposals).toHaveBeenCalledWith(2, 20, 'approved', 'protocol')
    })
  })

  describe('loadProposal', () => {
    it('fetches a single proposal', async () => {
      mockFetchProposal.mockResolvedValueOnce(okResult({ proposal: mockProposal }))
      const store = useProposalsStore()
      await store.loadProposal(1)

      expect(store.currentProposal).toEqual(mockProposal)
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      mockFetchProposal.mockResolvedValueOnce(errResult('Not found'))
      const store = useProposalsStore()
      await store.loadProposal(999)

      expect(store.error).toBe('Not found')
      expect(store.currentProposal).toBeNull()
    })
  })

  describe('submitProposal', () => {
    it('creates a proposal successfully', async () => {
      const newProposal = { ...mockProposal, id: 2, title: 'New Proposal' }
      mockCreateProposal.mockResolvedValueOnce(okResult({ proposal: newProposal }))
      const store = useProposalsStore()
      const result = await store.submitProposal({
        title: 'New Proposal',
        content: 'Content',
        category: 'general',
      })

      expect(result).toBe(true)
      expect(store.proposals[0]).toEqual(newProposal)
      expect(store.dailyUsed).toBe(1)
      expect(store.creating).toBe(false)
    })

    it('handles creation error', async () => {
      mockCreateProposal.mockResolvedValueOnce(errResult('Daily limit reached'))
      const store = useProposalsStore()
      const result = await store.submitProposal({
        title: 'Test',
        content: 'Content',
        category: 'general',
      })

      expect(result).toBe(false)
      expect(store.error).toBe('Daily limit reached')
    })

    it('sets creating state during submission', async () => {
      let resolvePromise: (v: any) => void
      const pending = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockCreateProposal.mockReturnValueOnce(pending as any)

      const store = useProposalsStore()
      const submitPromise = store.submitProposal({
        title: 'Test',
        content: 'Content',
        category: 'general',
      })
      expect(store.creating).toBe(true)

      resolvePromise!(okResult({ proposal: mockProposal }))
      await submitPromise
      expect(store.creating).toBe(false)
    })
  })

  describe('vote', () => {
    it('records a vote and updates proposal in list', async () => {
      mockVoteProposal.mockResolvedValueOnce(
        okResult({
          votesFor: 6,
          votesAgainst: 2,
          votesAbstain: 1,
          userVote: 'for',
        }),
      )
      const store = useProposalsStore()
      store.proposals = [{ ...mockProposal }]

      const result = await store.vote(1, 'for')

      expect(result).toBe(true)
      expect(store.proposals[0].votesFor).toBe(6)
      expect(store.proposals[0].userVote).toBe('for')
    })

    it('updates currentProposal if it matches', async () => {
      mockVoteProposal.mockResolvedValueOnce(
        okResult({
          votesFor: 6,
          votesAgainst: 2,
          votesAbstain: 1,
          userVote: 'for',
        }),
      )
      const store = useProposalsStore()
      store.currentProposal = { ...mockProposal }

      await store.vote(1, 'for')

      expect(store.currentProposal.votesFor).toBe(6)
      expect(store.currentProposal.userVote).toBe('for')
    })

    it('handles vote error', async () => {
      mockVoteProposal.mockResolvedValueOnce(errResult('Already voted'))
      const store = useProposalsStore()
      const result = await store.vote(1, 'for')

      expect(result).toBe(false)
      expect(store.error).toBe('Already voted')
    })
  })
})
