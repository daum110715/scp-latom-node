import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiStream: vi.fn(),
}))

import {
  fetchCrawlerOverallStatus,
  fetchCrawlerStatus,
  fetchCrawlerEntries,
  fetchCrawlerSeries,
  fetchEntryContent,
} from '../crawler'
import { apiGet } from '../api'

const mockApiGet = vi.mocked(apiGet)

function okResult<T>(data: T) {
  return { ok: true as const, data }
}

describe('Crawler Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchCrawlerOverallStatus', () => {
    it('calls GET /crawler/status', async () => {
      const expected = { success: true, en: {}, cn: {} }
      mockApiGet.mockResolvedValueOnce(okResult(expected))

      const result = await fetchCrawlerOverallStatus()

      expect(mockApiGet).toHaveBeenCalledWith('/crawler/status')
      expect(result).toEqual(okResult(expected))
    })
  })

  describe('fetchCrawlerStatus', () => {
    it('calls GET /crawler/:lang/status', async () => {
      const expected = { success: true, language: 'en', state: {} }
      mockApiGet.mockResolvedValueOnce(okResult(expected))

      await fetchCrawlerStatus('en')

      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/status')
    })

    it('supports cn language', async () => {
      mockApiGet.mockResolvedValueOnce(okResult({}))
      await fetchCrawlerStatus('cn')
      expect(mockApiGet).toHaveBeenCalledWith('/crawler/cn/status')
    })
  })

  describe('fetchCrawlerEntries', () => {
    it('calls GET /crawler/:lang/entries with no params', async () => {
      const expected = { success: true, entries: [], total: 0 }
      mockApiGet.mockResolvedValueOnce(okResult(expected))

      await fetchCrawlerEntries('en')

      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entries')
    })

    it('includes class filter in query', async () => {
      mockApiGet.mockResolvedValueOnce(okResult({}))
      await fetchCrawlerEntries('en', { class: 'Keter' })
      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entries?class=Keter')
    })

    it('includes search query in params', async () => {
      mockApiGet.mockResolvedValueOnce(okResult({}))
      await fetchCrawlerEntries('en', { q: '173' })
      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entries?q=173')
    })

    it('includes pagination in params', async () => {
      mockApiGet.mockResolvedValueOnce(okResult({}))
      await fetchCrawlerEntries('en', { page: 2, limit: 20 })
      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entries?page=2&limit=20')
    })

    it('combines all params', async () => {
      mockApiGet.mockResolvedValueOnce(okResult({}))
      await fetchCrawlerEntries('en', { class: 'Safe', q: '999', page: 1, limit: 50 })
      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entries?class=Safe&q=999&page=1&limit=50')
    })
  })

  describe('fetchCrawlerSeries', () => {
    it('calls GET /crawler/:lang/series/:n', async () => {
      const expected = { success: true, series: 1, entries: [], total: 0 }
      mockApiGet.mockResolvedValueOnce(okResult(expected))

      await fetchCrawlerSeries('en', 1)

      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/series/1')
    })
  })

  describe('fetchEntryContent', () => {
    it('calls GET /crawler/:lang/entry/:scpNumber', async () => {
      const expected = { success: true, scpNumber: 173, language: 'en', status: 'cached' }
      mockApiGet.mockResolvedValueOnce(okResult(expected))

      await fetchEntryContent('en', 173)

      expect(mockApiGet).toHaveBeenCalledWith('/crawler/en/entry/173')
    })
  })
})
