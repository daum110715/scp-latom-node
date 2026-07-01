import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { ErrorCode } from '@/services/errors'

// Mock the API service
vi.mock('@/services/api', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

import { apiPost, apiGet } from '@/services/api'
const mockApiPost = vi.mocked(apiPost)
const mockApiGet = vi.mocked(apiGet)

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApiPost.mockReset()
    mockApiGet.mockReset()
  })

  describe('initial state', () => {
    it('has no user by default', () => {
      const store = useAuthStore()
      expect(store.user).toBeNull()
    })

    it('is not authenticated by default', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('is not admin by default', () => {
      const store = useAuthStore()
      expect(store.isAdmin).toBe(false)
    })

    it('is not loading by default', () => {
      const store = useAuthStore()
      expect(store.loading).toBe(false)
    })

    it('has no error by default', () => {
      const store = useAuthStore()
      expect(store.error).toBe('')
    })
  })

  describe('login', () => {
    it('sets user on success with admin role', async () => {
      mockApiPost.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 1, codename: 'admin', role: 'admin', clearance: 5 },
        },
      })

      const store = useAuthStore()
      const result = await store.login('admin', 'password123')

      expect(result).toBe(true)
      expect(store.user).toEqual({ id: 1, codename: 'admin', role: 'admin', clearance: 5 })
      expect(store.isAuthenticated).toBe(true)
      expect(store.isAdmin).toBe(true)
      expect(store.error).toBe('')
    })

    it('rejects non-admin users', async () => {
      mockApiPost.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 2, codename: 'agent', role: 'personnel', clearance: 1 },
        },
      })

      const store = useAuthStore()
      const result = await store.login('agent', 'password123')

      expect(result).toBe(false)
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.error).toContain('clearance')
    })

    it('sets error on API failure', async () => {
      mockApiPost.mockResolvedValueOnce({
        ok: false,
        code: ErrorCode.UNAUTHORIZED,
        error: 'Invalid codename or password',
      })

      const store = useAuthStore()
      const result = await store.login('admin', 'wrong')

      expect(result).toBe(false)
      expect(store.error).toBe('Invalid codename or password')
      expect(store.user).toBeNull()
    })

    it('uses fallback error when API returns no message', async () => {
      mockApiPost.mockResolvedValueOnce({
        ok: false,
        code: ErrorCode.AUTH_INVALID,
        error: '',
      })

      const store = useAuthStore()
      const result = await store.login('admin', 'wrong')

      expect(result).toBe(false)
      expect(store.error).toBeTruthy()
    })

    it('manages loading state', async () => {
      let resolvePromise: (value: any) => void
      const pending = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockApiPost.mockReturnValueOnce(pending as any)

      const store = useAuthStore()
      const loginPromise = store.login('admin', 'pass1234')

      expect(store.loading).toBe(true)

      resolvePromise!({
        ok: true,
        data: { user: { id: 1, codename: 'admin', role: 'admin', clearance: 5 } },
      })
      await loginPromise

      expect(store.loading).toBe(false)
    })
  })

  describe('fetchProfile', () => {
    it('sets user on success with admin role', async () => {
      mockApiGet.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 1, codename: 'admin', role: 'admin', clearance: 5 },
        },
      })

      const store = useAuthStore()
      const result = await store.fetchProfile()

      expect(result).toBe(true)
      expect(store.user).toEqual({ id: 1, codename: 'admin', role: 'admin', clearance: 5 })
      expect(store.isAdmin).toBe(true)
    })

    it('rejects non-admin users from profile', async () => {
      mockApiGet.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 2, codename: 'agent', role: 'personnel', clearance: 1 },
        },
      })

      const store = useAuthStore()
      const result = await store.fetchProfile()

      expect(result).toBe(false)
      expect(store.user).toBeNull()
      expect(store.error).toContain('clearance')
    })

    it('clears auth on failure', async () => {
      mockApiGet.mockResolvedValueOnce({
        ok: false,
        code: ErrorCode.AUTH_EXPIRED,
        error: 'Session expired',
      })

      const store = useAuthStore()
      const result = await store.fetchProfile()

      expect(result).toBe(false)
      expect(store.user).toBeNull()
      expect(store.error).toBeTruthy()
    })
  })

  describe('logout', () => {
    it('calls server logout and clears user', async () => {
      // First login
      mockApiPost.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 1, codename: 'admin', role: 'admin', clearance: 5 },
        },
      })

      const store = useAuthStore()
      await store.login('admin', 'pass1234')
      expect(store.isAuthenticated).toBe(true)

      // Then logout
      mockApiPost.mockResolvedValueOnce({ ok: true, data: {} })
      await store.logout()

      expect(mockApiPost).toHaveBeenCalledWith('/auth/logout')
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.error).toBe('')
    })
  })

  describe('clearError', () => {
    it('clears the error message', async () => {
      mockApiPost.mockResolvedValueOnce({
        ok: false,
        code: ErrorCode.UNAUTHORIZED,
        error: 'Some error',
      })

      const store = useAuthStore()
      await store.login('admin', 'wrong')
      expect(store.error).toBe('Some error')

      store.clearError()
      expect(store.error).toBe('')
    })
  })

  describe('init', () => {
    it('fetches profile on init', async () => {
      mockApiGet.mockResolvedValueOnce({
        ok: true,
        data: {
          user: { id: 1, codename: 'admin', role: 'admin', clearance: 5 },
        },
      })

      const store = useAuthStore()
      await store.init()

      expect(mockApiGet).toHaveBeenCalledWith('/auth/me')
      expect(store.user).toEqual({ id: 1, codename: 'admin', role: 'admin', clearance: 5 })
    })
  })
})
