import { describe, it, expect } from 'vitest'
import { normalizeResponse, networkError } from '../response'
import { ErrorCode } from '../errors'

describe('response', () => {
  describe('normalizeResponse', () => {
    it('returns ok: true for success response', () => {
      const result = normalizeResponse({ success: true, user: { id: 1 } }, 200)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ user: { id: 1 } })
      }
    })

    it('strips the success flag from data', () => {
      const result = normalizeResponse({ success: true, name: 'test', count: 5 }, 200)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ name: 'test', count: 5 })
        expect((result.data as Record<string, unknown>).success).toBeUndefined()
      }
    })

    it('returns ok: false for success: false', () => {
      const result = normalizeResponse({ success: false, error: 'Not found' }, 200)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Not found')
      }
    })

    it('returns ok: false for 4xx status', () => {
      const result = normalizeResponse({ error: 'Bad request' }, 400)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.BAD_REQUEST)
      }
    })

    it('returns ok: false for 5xx status', () => {
      const result = normalizeResponse({ error: 'Internal error' }, 500)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.SERVER_ERROR)
      }
    })

    it('uses HTTP status as fallback error message', () => {
      const result = normalizeResponse({}, 403)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('HTTP 403')
      }
    })

    it('prefers json.error over fallback', () => {
      const result = normalizeResponse({ error: 'Custom message' }, 400)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Custom message')
      }
    })
  })

  describe('networkError', () => {
    it('returns a network error result', () => {
      const result = networkError()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.NETWORK)
        expect(result.error).toBe('Network error')
      }
    })

    it('uses custom message when provided', () => {
      const result = networkError('Connection refused')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('Connection refused')
      }
    })
  })
})
