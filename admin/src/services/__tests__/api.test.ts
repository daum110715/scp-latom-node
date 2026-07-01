import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPut, apiDelete } from '../api'
import { ErrorCode } from '../errors'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock the logger to prevent console noise and track calls
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: new Headers(),
  }
}

describe('api client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('apiGet', () => {
    it('sends a GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, data: 'test' }))

      await apiGet('/admin/dashboard')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/admin/dashboard')
      expect(options.method).toBe('GET')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.body).toBeUndefined()
    })

    it('sends credentials: include for cookie-based auth', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, stats: {} }))

      await apiGet('/admin/dashboard')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.credentials).toBe('include')
    })

    it('returns normalized success result', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, stats: { users: 10 } }))

      const result = await apiGet('/admin/dashboard')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ stats: { users: 10 } })
      }
    })

    it('returns normalized error result for non-success response', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: false, error: 'Forbidden' }, 403))

      const result = await apiGet('/admin/users')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Forbidden')
      }
    })

    it('returns network error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await apiGet('/admin/dashboard')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Failed to fetch')
      }
    })

    it('returns network error with error code for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const result = await apiGet('/admin/dashboard')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NETWORK)
      }
    })
  })

  describe('apiPost', () => {
    it('sends a POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, user: {} }, 201))

      await apiPost('/admin/entries', { scpNumber: '999' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/admin/entries')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ scpNumber: '999' })
    })

    it('sends credentials: include', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true }))

      await apiPost('/admin/settings', { key: 'value' })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.credentials).toBe('include')
    })
  })

  describe('apiPut', () => {
    it('sends a PUT request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, user: {} }))

      await apiPut('/admin/users/1', { role: 'admin' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/admin/users/1')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body)).toEqual({ role: 'admin' })
    })
  })

  describe('apiDelete', () => {
    it('sends a DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true }))

      await apiDelete('/admin/users/1')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/admin/users/1')
      expect(options.method).toBe('DELETE')
      expect(options.body).toBeUndefined()
    })
  })
})
