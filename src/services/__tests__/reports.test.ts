import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  apiStream: vi.fn(),
}))

import { submitReport, fetchReports, checkReports } from '../reports'
import { apiGet, apiPost } from '../api'

const mockApiGet = vi.mocked(apiGet)
const mockApiPost = vi.mocked(apiPost)

describe('Reports Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitReport', () => {
    it('calls POST /reports with report data', async () => {
      const data = {
        scpNumber: 173,
        language: 'en' as const,
        reportType: 'content_error' as const,
        description: 'There is a typo.',
      }
      mockApiPost.mockResolvedValueOnce({ ok: true, data: { success: true, report: {} } } as any)
      await submitReport(data)
      expect(mockApiPost).toHaveBeenCalledWith('/reports', {
        scpNumber: 173,
        language: 'en',
        reportType: 'content_error',
        description: 'There is a typo.',
      })
    })
  })

  describe('fetchReports', () => {
    it('calls GET /reports with default params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { reports: [] } } as any)
      await fetchReports()
      expect(mockApiGet).toHaveBeenCalledWith('/reports')
    })

    it('includes pagination params', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchReports({ page: 2, limit: 10 })
      expect(mockApiGet).toHaveBeenCalledWith('/reports?page=2&limit=10')
    })

    it('omits params when not provided', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await fetchReports({})
      expect(mockApiGet).toHaveBeenCalledWith('/reports')
    })
  })

  describe('checkReports', () => {
    it('calls GET /reports/check/:lang/:scpNumber', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: { hasReports: false } } as any)
      await checkReports('en', 173)
      expect(mockApiGet).toHaveBeenCalledWith('/reports/check/en/173')
    })

    it('supports cn language', async () => {
      mockApiGet.mockResolvedValueOnce({ ok: true, data: {} } as any)
      await checkReports('cn', 999)
      expect(mockApiGet).toHaveBeenCalledWith('/reports/check/cn/999')
    })
  })
})
