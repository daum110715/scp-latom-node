import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiStream: vi.fn(),
}))

import {
  fetchBookmarks,
  addBookmark,
  removeBookmark,
  checkBookmark,
  fetchHistory,
  recordHistory,
  deleteHistoryEntry,
  clearHistory,
} from '../userActivity'
import { apiGet, apiPost, apiDelete } from '../api'

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)
const mockApiDelete = vi.mocked(apiDelete)

describe('UserActivity Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('bookmark functions', () => {
    it('fetchBookmarks calls GET /bookmarks', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { bookmarks: [] } } as any)
      await fetchBookmarks()
      expect(mockApiGet).toHaveBeenCalledWith('/bookmarks')
    })

    it('addBookmark calls POST /bookmarks/:lang/:scpNumber', async () => {
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await addBookmark('en', 173)
      expect(mockApiPost).toHaveBeenCalledWith('/bookmarks/en/173')
    })

    it('removeBookmark calls DELETE /bookmarks/:lang/:scpNumber', async () => {
      mockApiDelete.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await removeBookmark('cn', 999)
      expect(mockApiDelete).toHaveBeenCalledWith('/bookmarks/cn/999')
    })

    it('checkBookmark calls GET /bookmarks/:lang/:scpNumber', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { bookmarked: true } } as any)
      await checkBookmark('en', 173)
      expect(mockApiGet).toHaveBeenCalledWith('/bookmarks/en/173')
    })
  })

  describe('history functions', () => {
    it('fetchHistory calls GET /history with no params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { entries: [] } } as any)
      await fetchHistory()
      expect(mockApiGet).toHaveBeenCalledWith('/history')
    })

    it('fetchHistory includes pagination params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchHistory({ page: 2, limit: 10 })
      expect(mockApiGet).toHaveBeenCalledWith('/history?page=2&limit=10')
    })

    it('fetchHistory includes lang filter', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchHistory({ lang: 'cn' })
      expect(mockApiGet).toHaveBeenCalledWith('/history?lang=cn')
    })

    it('recordHistory calls POST /history', async () => {
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await recordHistory({
        language: 'en',
        scpNumber: 173,
        name: 'The Sculpture',
        objectClass: 'Euclid',
      })
      expect(mockApiPost).toHaveBeenCalledWith('/history', {
        language: 'en',
        scpNumber: 173,
        name: 'The Sculpture',
        objectClass: 'Euclid',
      })
    })

    it('deleteHistoryEntry calls DELETE /history/:id', async () => {
      mockApiDelete.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await deleteHistoryEntry(42)
      expect(mockApiDelete).toHaveBeenCalledWith('/history/42')
    })

    it('clearHistory calls DELETE /history', async () => {
      mockApiDelete.mockResolvedValueOnce({ ok: true, data: { success: true } } as any)
      await clearHistory()
      expect(mockApiDelete).toHaveBeenCalledWith('/history')
    })
  })
})
