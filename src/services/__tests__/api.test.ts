import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPut } from '../api'
import { ErrorCode } from '../errors'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create mock Response objects with headers support
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
    localStorage.clear()
  })

  describe('apiGet', () => {
    it('sends a GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, data: 'test' }))

      await apiGet('/crawler/status')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/crawler/status')
      expect(options.method).toBe('GET')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.body).toBeUndefined()
    })

    it('auto-injects token from localStorage when none is provided', async () => {
      localStorage.setItem('scp-auth-token', 'stored-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, user: {} }))

      await apiGet('/auth/me')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer stored-token')
    })

    it('uses explicit token over localStorage', async () => {
      localStorage.setItem('scp-auth-token', 'stored-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, user: {} }))

      await apiGet('/auth/me', 'explicit-token')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer explicit-token')
    })

    it('sends no Authorization header when no token exists', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true }))

      await apiGet('/crawler/status')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBeUndefined()
    })

    it('returns normalized success result', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ success: true, user: { id: 1, codename: 'test' }, token: 'abc' })
      )

      const result = await apiGet('/auth/me')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ user: { id: 1, codename: 'test' }, token: 'abc' })
      }
    })

    it('returns normalized error result for non-success response', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ success: false, error: 'Unauthorized' }, 401)
      )

      const result = await apiGet('/auth/me')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Unauthorized')
      }
    })

    it('returns network error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await apiGet('/crawler/status')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Failed to fetch')
      }
    })

    it('returns network error with error code for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const result = await apiGet('/crawler/status')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NETWORK)
      }
    })
  })

  describe('apiPost', () => {
    it('sends a POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ success: true, user: {}, token: 'abc' }, 201)
      )

      await apiPost('/auth/register', { codename: 'test', password: 'pass1234' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/auth/register')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ codename: 'test', password: 'pass1234' })
    })

    it('auto-injects token from localStorage', async () => {
      localStorage.setItem('scp-auth-token', 'stored-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true }))

      await apiPost('/proposals', { title: 'Test', content: 'Content', category: 'general' })

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer stored-token')
    })
  })

  describe('apiPut', () => {
    it('sends a PUT request with JSON body', async () => {
      localStorage.setItem('scp-auth-token', 'my-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ success: true, user: {} }))

      await apiPut('/auth/profile', { codename: 'new_name' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/auth/profile')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body)).toEqual({ codename: 'new_name' })
      expect(options.headers['Authorization']).toBe('Bearer my-token')
    })
  })
})
