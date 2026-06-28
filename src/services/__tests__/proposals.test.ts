import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiStream: vi.fn(),
}))

import { fetchProposals, fetchProposal, createProposal, voteProposal } from '../proposals'
import { apiGet, apiPost } from '../api'

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

describe('Proposals Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchProposals', () => {
    it('calls GET /proposals with default params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { proposals: [] } } as any)
      await fetchProposals()
      expect(mockApiGet).toHaveBeenCalledWith('/proposals?page=1&limit=20')
    })

    it('includes status filter', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchProposals(1, 20, 'approved')
      expect(mockApiGet).toHaveBeenCalledWith('/proposals?page=1&limit=20&status=approved')
    })

    it('includes category filter', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchProposals(1, 20, undefined, 'protocol')
      expect(mockApiGet).toHaveBeenCalledWith('/proposals?page=1&limit=20&category=protocol')
    })

    it('includes both filters', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchProposals(2, 50, 'open', 'research')
      expect(mockApiGet).toHaveBeenCalledWith('/proposals?page=2&limit=50&status=open&category=research')
    })
  })

  describe('fetchProposal', () => {
    it('calls GET /proposals/:id', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { proposal: {} } } as any)
      await fetchProposal(42)
      expect(mockApiGet).toHaveBeenCalledWith('/proposals/42')
    })
  })

  describe('createProposal', () => {
    it('calls POST /proposals with data', async () => {
      const data = { title: 'Test', content: 'Content here', category: 'general' }
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { proposal: {} } } as any)
      await createProposal(data)
      expect(mockApiPost).toHaveBeenCalledWith('/proposals', data)
    })
  })

  describe('voteProposal', () => {
    it('calls POST /proposals/:id/vote', async () => {
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { votesFor: 1 } } as any)
      await voteProposal(42, 'for')
      expect(mockApiPost).toHaveBeenCalledWith('/proposals/42/vote', { vote: 'for' })
    })

    it('supports all vote types', async () => {
      mockApiPost.mockResolvedValue({ ok: true, data: {} } as any)

      await voteProposal(1, 'against')
      expect(mockApiPost).toHaveBeenCalledWith('/proposals/1/vote', { vote: 'against' })

      await voteProposal(1, 'abstain')
      expect(mockApiPost).toHaveBeenCalledWith('/proposals/1/vote', { vote: 'abstain' })
    })
  })
})
