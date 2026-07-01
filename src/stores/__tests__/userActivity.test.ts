import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ErrorCode } from '@/services/errors'

vi.mock('@/services/userActivity', () => ({
  fetchBookmarks: vi.fn(),
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  checkBookmark: vi.fn(),
  fetchHistory: vi.fn(),
  recordHistory: vi.fn(),
  deleteHistoryEntry: vi.fn(),
  clearHistory: vi.fn(),
}))

import { useUserActivityStore } from '../userActivity'
import {
  fetchBookmarks,
  addBookmark,
  removeBookmark,
  checkBookmark,
  fetchHistory,
  recordHistory,
  deleteHistoryEntry,
  clearHistory,
} from '@/services/userActivity'

const mockFetchBookmarks = vi.mocked(fetchBookmarks)
const mockAddBookmark = vi.mocked(addBookmark)
const mockRemoveBookmark = vi.mocked(removeBookmark)
const mockCheckBookmark = vi.mocked(checkBookmark)
const mockFetchHistory = vi.mocked(fetchHistory)
const mockRecordHistory = vi.mocked(recordHistory)
const mockDeleteHistoryEntry = vi.mocked(deleteHistoryEntry)
const mockClearHistory = vi.mocked(clearHistory)

function okResult<T>(data: T) {
  return { ok: true as const, data }
}

function errResult(error: string, code = ErrorCode.SERVER_ERROR) {
  return { ok: false as const, code, error }
}

const mockBookmarks = [
  {
    scpNumber: 173,
    language: 'en',
    name: 'The Sculpture',
    objectClass: 'Euclid',
    createdAt: '2026-06-26',
  },
  {
    scpNumber: 999,
    language: 'en',
    name: 'Tickle Monster',
    objectClass: 'Safe',
    createdAt: '2026-06-25',
  },
]

const mockHistoryEntries = [
  {
    id: 1,
    user_id: 1,
    language: 'en',
    scp_number: 173,
    name: 'The Sculpture',
    object_class: 'Euclid',
    visited_at: '2026-06-26',
  },
  {
    id: 2,
    user_id: 1,
    language: 'en',
    scp_number: 999,
    name: 'Tickle Monster',
    object_class: 'Safe',
    visited_at: '2026-06-25',
  },
]

describe('UserActivity Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initial state', () => {
    it('defaults to history tab', () => {
      const store = useUserActivityStore()
      expect(store.activeTab).toBe('history')
    })

    it('reads tab from localStorage', () => {
      localStorage.setItem('scp-activity-tab', 'bookmarks')
      const store = useUserActivityStore()
      expect(store.activeTab).toBe('bookmarks')
    })

    it('starts with empty state', () => {
      const store = useUserActivityStore()
      expect(store.bookmarks).toEqual([])
      expect(store.historyEntries).toEqual([])
      expect(store.bookmarkLoading).toBe(false)
      expect(store.historyLoading).toBe(false)
    })
  })

  describe('bookmarks', () => {
    describe('loadBookmarks', () => {
      it('fetches bookmarks successfully', async () => {
        mockFetchBookmarks.mockResolvedValueOnce(
          okResult({ success: true, bookmarks: mockBookmarks }),
        )
        const store = useUserActivityStore()
        await store.loadBookmarks()

        expect(store.bookmarks).toHaveLength(2)
        expect(store.bookmarkLoading).toBe(false)
      })

      it('handles fetch error', async () => {
        mockFetchBookmarks.mockResolvedValueOnce(errResult('Network error'))
        const store = useUserActivityStore()
        await store.loadBookmarks()

        expect(store.bookmarkError).toBe('Network error')
      })
    })

    describe('addBookmark', () => {
      it('adds a bookmark successfully', async () => {
        mockAddBookmark.mockResolvedValueOnce(okResult({ success: true, message: 'Added' }))
        const store = useUserActivityStore()
        const result = await store.addBookmark('en', 173)

        expect(result).toBe(true)
        expect(store.bookmarks).toHaveLength(1)
        expect(store.bookmarks[0].scpNumber).toBe(173)
      })

      it('handles duplicate (409) gracefully', async () => {
        mockAddBookmark.mockResolvedValueOnce(errResult('Already bookmarked', ErrorCode.CONFLICT))
        const store = useUserActivityStore()
        const result = await store.addBookmark('en', 173)

        expect(result).toBe(true)
      })

      it('handles error', async () => {
        mockAddBookmark.mockResolvedValueOnce(errResult('Server error'))
        const store = useUserActivityStore()
        const result = await store.addBookmark('en', 173)

        expect(result).toBe(false)
        expect(store.bookmarkError).toBe('Server error')
      })
    })

    describe('removeBookmark', () => {
      it('removes a bookmark successfully', async () => {
        mockRemoveBookmark.mockResolvedValueOnce(okResult({ success: true, message: 'Removed' }))
        const store = useUserActivityStore()
        store.bookmarks = [...mockBookmarks]

        const result = await store.removeBookmark('en', 173)

        expect(result).toBe(true)
        expect(store.bookmarks).toHaveLength(1)
        expect(store.bookmarks[0].scpNumber).toBe(999)
      })

      it('handles error', async () => {
        mockRemoveBookmark.mockResolvedValueOnce(errResult('Server error'))
        const store = useUserActivityStore()
        const result = await store.removeBookmark('en', 173)

        expect(result).toBe(false)
        expect(store.bookmarkError).toBe('Server error')
      })
    })

    describe('toggleBookmark', () => {
      it('removes bookmark if already bookmarked', async () => {
        mockRemoveBookmark.mockResolvedValueOnce(okResult({ success: true, message: 'Removed' }))
        const store = useUserActivityStore()
        store.bookmarks = [...mockBookmarks]

        const result = await store.toggleBookmark('en', 173)

        expect(result).toBe(true)
        expect(mockRemoveBookmark).toHaveBeenCalledWith('en', 173)
      })

      it('adds bookmark if not bookmarked', async () => {
        mockAddBookmark.mockResolvedValueOnce(okResult({ success: true, message: 'Added' }))
        const store = useUserActivityStore()

        const result = await store.toggleBookmark('en', 173)

        expect(result).toBe(true)
        expect(mockAddBookmark).toHaveBeenCalledWith('en', 173)
      })
    })

    describe('isBookmarked', () => {
      it('returns true for bookmarked entries', () => {
        const store = useUserActivityStore()
        store.bookmarks = [...mockBookmarks]
        expect(store.isBookmarked('en', 173)).toBe(true)
      })

      it('returns false for non-bookmarked entries', () => {
        const store = useUserActivityStore()
        store.bookmarks = [...mockBookmarks]
        expect(store.isBookmarked('en', 42)).toBe(false)
      })
    })

    describe('checkBookmark', () => {
      it('returns true when bookmarked', async () => {
        mockCheckBookmark.mockResolvedValueOnce(okResult({ success: true, bookmarked: true }))
        const store = useUserActivityStore()
        const result = await store.checkBookmark('en', 173)
        expect(result).toBe(true)
      })

      it('returns false when not bookmarked', async () => {
        mockCheckBookmark.mockResolvedValueOnce(okResult({ success: true, bookmarked: false }))
        const store = useUserActivityStore()
        const result = await store.checkBookmark('en', 173)
        expect(result).toBe(false)
      })

      it('returns false on error', async () => {
        mockCheckBookmark.mockResolvedValueOnce(errResult('Error'))
        const store = useUserActivityStore()
        const result = await store.checkBookmark('en', 173)
        expect(result).toBe(false)
      })
    })
  })

  describe('history', () => {
    describe('fetchHistoryList', () => {
      it('fetches history successfully', async () => {
        mockFetchHistory.mockResolvedValueOnce(
          okResult({
            success: true,
            entries: mockHistoryEntries,
            total: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
          }),
        )
        const store = useUserActivityStore()
        const result = await store.fetchHistoryList()

        expect(result).toBe(true)
        expect(store.historyEntries).toHaveLength(2)
        expect(store.historyTotal).toBe(2)
        expect(store.historyLoading).toBe(false)
      })

      it('handles fetch error', async () => {
        mockFetchHistory.mockResolvedValueOnce(errResult('Network error'))
        const store = useUserActivityStore()
        const result = await store.fetchHistoryList()

        expect(result).toBe(false)
        expect(store.historyError).toBe('Network error')
      })
    })

    describe('recordVisit', () => {
      it('records a visit', async () => {
        mockRecordHistory.mockResolvedValueOnce(okResult({ success: true }))
        const store = useUserActivityStore()
        await store.recordVisit({ language: 'en', scpNumber: 173, name: 'The Sculpture' })

        expect(mockRecordHistory).toHaveBeenCalledWith({
          language: 'en',
          scpNumber: 173,
          name: 'The Sculpture',
        })
      })
    })

    describe('deleteHistoryEntryById', () => {
      it('deletes an entry successfully', async () => {
        mockDeleteHistoryEntry.mockResolvedValueOnce(okResult({ success: true }))
        const store = useUserActivityStore()
        store.historyEntries = [...mockHistoryEntries]
        store.historyTotal = 2

        const result = await store.deleteHistoryEntryById(1)

        expect(result).toBe(true)
        expect(store.historyEntries).toHaveLength(1)
        expect(store.historyEntries[0].id).toBe(2)
        expect(store.historyTotal).toBe(1)
      })

      it('handles error', async () => {
        mockDeleteHistoryEntry.mockResolvedValueOnce(errResult('Error'))
        const store = useUserActivityStore()
        const result = await store.deleteHistoryEntryById(1)

        expect(result).toBe(false)
        expect(store.historyError).toBe('Error')
      })
    })

    describe('clearHistory', () => {
      it('clears all history', async () => {
        mockClearHistory.mockResolvedValueOnce(okResult({ success: true }))
        const store = useUserActivityStore()
        store.historyEntries = [...mockHistoryEntries]
        store.historyTotal = 2

        const result = await store.clearHistory()

        expect(result).toBe(true)
        expect(store.historyEntries).toEqual([])
        expect(store.historyTotal).toBe(0)
        expect(store.historyPage).toBe(1)
        expect(store.historyTotalPages).toBe(0)
      })

      it('handles error', async () => {
        mockClearHistory.mockResolvedValueOnce(errResult('Error'))
        const store = useUserActivityStore()
        const result = await store.clearHistory()

        expect(result).toBe(false)
        expect(store.historyError).toBe('Error')
      })
    })
  })

  describe('setTab', () => {
    it('switches tab and persists to localStorage', () => {
      mockFetchBookmarks.mockResolvedValue(okResult({ success: true, bookmarks: [] }))
      const store = useUserActivityStore()
      store.setTab('bookmarks')

      expect(store.activeTab).toBe('bookmarks')
      expect(localStorage.getItem('scp-activity-tab')).toBe('bookmarks')
    })

    it('loads bookmarks when switching to bookmarks tab if empty', async () => {
      mockFetchBookmarks.mockResolvedValue(okResult({ success: true, bookmarks: [] }))
      const store = useUserActivityStore()
      store.setTab('bookmarks')

      // Wait for the async loadBookmarks to complete
      await vi.waitFor(() => {
        expect(mockFetchBookmarks).toHaveBeenCalled()
      })
    })

    it('loads history when switching to history tab if empty', async () => {
      mockFetchHistory.mockResolvedValue(
        okResult({
          success: true,
          entries: [],
          total: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        }),
      )
      const store = useUserActivityStore()
      store.setTab('history')

      await vi.waitFor(() => {
        expect(mockFetchHistory).toHaveBeenCalled()
      })
    })
  })
})
