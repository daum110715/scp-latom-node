import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/crawler', () => ({
  fetchCrawlerEntries: vi.fn(),
  fetchCrawlerOverallStatus: vi.fn(),
  fetchCrawlerStatus: vi.fn(),
  fetchCrawlerSeries: vi.fn(),
}))

import { useCrawlerStore } from '../crawler'
import {
  fetchCrawlerEntries,
  fetchCrawlerOverallStatus,
  fetchCrawlerStatus,
  fetchCrawlerSeries,
} from '@/services/crawler'
import { ErrorCode } from '@/services/errors'

const mockFetchCrawlerEntries = vi.mocked(fetchCrawlerEntries)
const mockFetchCrawlerOverallStatus = vi.mocked(fetchCrawlerOverallStatus)
const mockFetchCrawlerStatus = vi.mocked(fetchCrawlerStatus)
const mockFetchCrawlerSeries = vi.mocked(fetchCrawlerSeries)

function okResult<T>(data: T) {
  return { ok: true as const, data }
}

function errResult(error: string) {
  return { ok: false as const, code: ErrorCode.SERVER_ERROR, error }
}

const mockEntriesResponse = {
  success: true,
  language: 'en' as const,
  entries: [
    {
      scpNumber: 173,
      name: 'The Sculpture',
      objectClass: 'Euclid',
      url: 'https://scp-wiki.wikidot.com/scp-173',
      series: 1,
    },
    {
      scpNumber: 999,
      name: 'Tickle Monster',
      objectClass: 'Safe',
      url: 'https://scp-wiki.wikidot.com/scp-999',
      series: 1,
    },
  ],
  total: 2,
  page: 1,
  limit: 50,
  totalPages: 1,
  state: { status: 'idle' as const, lastCrawl: 1719400000000, totalEntries: 2 },
}

const mockStatusResponse = {
  success: true,
  language: 'en' as const,
  state: { status: 'idle' as const, lastCrawl: 1719400000000, totalEntries: 7999 },
  classDistribution: { Safe: 2500, Euclid: 3000 },
  incremental: { nextSeries: 3, seriesLastCrawl: { 1: 1719400000000, 2: 1719400000000 } },
}

describe('Crawler Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initial state', () => {
    it('defaults to English language', () => {
      const store = useCrawlerStore()
      expect(store.language).toBe('en')
    })

    it('reads language from localStorage', () => {
      localStorage.setItem('scp-crawler-lang', 'cn')
      const store = useCrawlerStore()
      expect(store.language).toBe('cn')
    })

    it('starts with empty entries', () => {
      const store = useCrawlerStore()
      expect(store.entries).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBe('')
    })
  })

  describe('fetchEntries', () => {
    it('fetches entries successfully', async () => {
      mockFetchCrawlerEntries.mockResolvedValueOnce(okResult(mockEntriesResponse))
      const store = useCrawlerStore()
      const result = await store.fetchEntries()

      expect(result).toBe(true)
      expect(store.entries).toHaveLength(2)
      expect(store.total).toBe(2)
      expect(store.totalPages).toBe(1)
      expect(store.loading).toBe(false)
      expect(store.error).toBe('')
    })

    it('sets loading state during fetch', async () => {
      let resolvePromise: (v: any) => void
      const pending = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetchCrawlerEntries.mockReturnValueOnce(pending as any)

      const store = useCrawlerStore()
      const fetchPromise = store.fetchEntries()
      expect(store.loading).toBe(true)

      resolvePromise!(okResult(mockEntriesResponse))
      await fetchPromise
      expect(store.loading).toBe(false)
    })

    it('handles fetch error', async () => {
      mockFetchCrawlerEntries.mockResolvedValueOnce(errResult('Network error'))
      const store = useCrawlerStore()
      const result = await store.fetchEntries()

      expect(result).toBe(false)
      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })

    it('passes filter parameters to the API', async () => {
      mockFetchCrawlerEntries.mockResolvedValueOnce(okResult(mockEntriesResponse))
      const store = useCrawlerStore()
      store.classFilter = 'Keter'
      store.searchQuery = '173'
      store.page = 2

      await store.fetchEntries()

      expect(mockFetchCrawlerEntries).toHaveBeenCalledWith('en', {
        class: 'Keter',
        q: '173',
        page: 2,
        limit: 50,
      })
    })
  })

  describe('fetchStatus', () => {
    it('fetches status successfully', async () => {
      mockFetchCrawlerStatus.mockResolvedValueOnce(okResult(mockStatusResponse))
      const store = useCrawlerStore()
      const result = await store.fetchStatus()

      expect(result).toBe(true)
      expect(store.state?.status).toBe('idle')
      expect(store.classDistribution).toEqual({ Safe: 2500, Euclid: 3000 })
      expect(store.incremental?.nextSeries).toBe(3)
    })

    it('handles status fetch error', async () => {
      mockFetchCrawlerStatus.mockResolvedValueOnce(errResult('Status error'))
      const store = useCrawlerStore()
      const result = await store.fetchStatus()

      expect(result).toBe(false)
      expect(store.error).toBe('Status error')
    })
  })

  describe('fetchOverallStatus', () => {
    it('fetches overall status for both languages', async () => {
      mockFetchCrawlerOverallStatus.mockResolvedValueOnce(
        okResult({
          success: true,
          en: { status: 'idle', lastCrawl: 1719400000000, totalEntries: 7999 },
          cn: { status: 'idle', lastCrawl: 1719400000000, totalEntries: 5200 },
        }),
      )
      const store = useCrawlerStore()
      const result = await store.fetchOverallStatus()

      expect(result).toBe(true)
      expect(store.overallState.en?.totalEntries).toBe(7999)
      expect(store.overallState.cn?.totalEntries).toBe(5200)
    })
  })

  describe('fetchSeries', () => {
    it('fetches entries for a specific series', async () => {
      const seriesEntries = [
        { scpNumber: 173, name: 'The Sculpture', objectClass: 'Euclid', url: '', series: 1 },
      ]
      mockFetchCrawlerSeries.mockResolvedValueOnce(
        okResult({
          success: true,
          language: 'en',
          series: 1,
          entries: seriesEntries,
          total: 1,
        }),
      )
      const store = useCrawlerStore()
      const result = await store.fetchSeries(1)

      expect(result).toEqual(seriesEntries)
    })

    it('returns empty array on error', async () => {
      mockFetchCrawlerSeries.mockResolvedValueOnce(errResult('Error'))
      const store = useCrawlerStore()
      const result = await store.fetchSeries(1)

      expect(result).toEqual([])
      expect(store.error).toBe('Error')
    })
  })

  describe('actions', () => {
    it('setLanguage updates language and resets page', async () => {
      mockFetchCrawlerEntries.mockResolvedValue(okResult(mockEntriesResponse))
      mockFetchCrawlerStatus.mockResolvedValue(okResult(mockStatusResponse))
      const store = useCrawlerStore()

      store.setLanguage('cn')

      expect(store.language).toBe('cn')
      expect(store.page).toBe(1)
      expect(localStorage.getItem('scp-crawler-lang')).toBe('cn')
    })

    it('setClassFilter updates filter and resets page', async () => {
      mockFetchCrawlerEntries.mockResolvedValue(okResult(mockEntriesResponse))
      const store = useCrawlerStore()
      store.page = 3

      store.setClassFilter('Keter')

      expect(store.classFilter).toBe('Keter')
      expect(store.page).toBe(1)
    })

    it('setSearchQuery updates query and resets page', async () => {
      mockFetchCrawlerEntries.mockResolvedValue(okResult(mockEntriesResponse))
      const store = useCrawlerStore()
      store.page = 3

      store.setSearchQuery('173')

      expect(store.searchQuery).toBe('173')
      expect(store.page).toBe(1)
    })

    it('setPage updates page', async () => {
      mockFetchCrawlerEntries.mockResolvedValue(okResult(mockEntriesResponse))
      const store = useCrawlerStore()

      store.setPage(3)

      expect(store.page).toBe(3)
    })
  })

  describe('computed', () => {
    it('isIdle reflects state status', () => {
      const store = useCrawlerStore()
      expect(store.isIdle).toBe(false)

      store.state = { status: 'idle', lastCrawl: 0, totalEntries: 0 }
      expect(store.isIdle).toBe(true)
    })

    it('isCrawling reflects state status', () => {
      const store = useCrawlerStore()
      store.state = { status: 'crawling', lastCrawl: 0, totalEntries: 0 }
      expect(store.isCrawling).toBe(true)
    })

    it('hasData reflects entries and total', () => {
      const store = useCrawlerStore()
      expect(store.hasData).toBe(false)

      store.entries = [{ scpNumber: 173, name: 'Test', objectClass: 'Euclid', url: '', series: 1 }]
      expect(store.hasData).toBe(true)
    })
  })
})
