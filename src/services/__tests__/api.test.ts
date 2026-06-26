import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost, apiPut } from '../api'
import { ErrorCode } from '../errors'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('api client', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('apiGet', () => {
    it('sends a GET request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: 'test' }),
      })

      await apiGet('/api/health')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/health')
      expect(options.method).toBe('GET')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.body).toBeUndefined()
    })

    it('includes Authorization header when token is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, user: {} }),
      })

      await apiGet('/api/auth/me', 'my-token')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer my-token')
    })

    it('returns normalized success result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, user: { id: 1, codename: 'test' }, token: 'abc' }),
      })

      const result = await apiGet('/api/auth/me')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ user: { id: 1, codename: 'test' }, token: 'abc' })
      }
    })

    it('returns normalized error result for non-success response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      })

      const result = await apiGet('/api/auth/me')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Unauthorized')
      }
    })

    it('returns network error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await apiGet('/api/health')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Failed to fetch')
      }
    })

    it('returns network error with error code for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error')

      const result = await apiGet('/api/health')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NETWORK)
      }
    })
  })

  describe('apiPost', () => {
    it('sends a POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, user: {}, token: 'abc' }),
      })

      await apiPost('/api/auth/register', { codename: 'test', password: 'pass1234' })

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/auth/register')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ codename: 'test', password: 'pass1234' })
    })

    it('includes token in Authorization header when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      await apiPost('/api/some-endpoint', { data: 1 }, 'my-token')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer my-token')
    })
  })

  describe('apiPut', () => {
    it('sends a PUT request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, user: {} }),
      })

      await apiPut('/api/auth/profile', { codename: 'new_name' }, 'my-token')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.scp.lat/api/auth/profile')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body)).toEqual({ codename: 'new_name' })
      expect(options.headers['Authorization']).toBe('Bearer my-token')
    })
  })
})
