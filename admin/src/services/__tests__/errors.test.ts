import { describe, it, expect } from 'vitest'
import { ErrorCode, httpStatusToErrorCode, resolveErrorMessage } from '../errors'

describe('errors', () => {
  describe('httpStatusToErrorCode', () => {
    it('maps 400 to BAD_REQUEST', () => {
      expect(httpStatusToErrorCode(400)).toBe(ErrorCode.BAD_REQUEST)
    })

    it('maps 401 to UNAUTHORIZED', () => {
      expect(httpStatusToErrorCode(401)).toBe(ErrorCode.UNAUTHORIZED)
    })

    it('maps 403 to FORBIDDEN', () => {
      expect(httpStatusToErrorCode(403)).toBe(ErrorCode.FORBIDDEN)
    })

    it('maps 404 to NOT_FOUND', () => {
      expect(httpStatusToErrorCode(404)).toBe(ErrorCode.NOT_FOUND)
    })

    it('maps 409 to CONFLICT', () => {
      expect(httpStatusToErrorCode(409)).toBe(ErrorCode.CONFLICT)
    })

    it('maps 429 to RATE_LIMITED', () => {
      expect(httpStatusToErrorCode(429)).toBe(ErrorCode.RATE_LIMITED)
    })

    it('maps 500 to SERVER_ERROR', () => {
      expect(httpStatusToErrorCode(500)).toBe(ErrorCode.SERVER_ERROR)
    })

    it('maps 502/503/504 to SERVICE_UNAVAILABLE', () => {
      expect(httpStatusToErrorCode(502)).toBe(ErrorCode.SERVICE_UNAVAILABLE)
      expect(httpStatusToErrorCode(503)).toBe(ErrorCode.SERVICE_UNAVAILABLE)
      expect(httpStatusToErrorCode(504)).toBe(ErrorCode.SERVICE_UNAVAILABLE)
    })

    it('maps unknown 5xx to SERVER_ERROR', () => {
      expect(httpStatusToErrorCode(599)).toBe(ErrorCode.SERVER_ERROR)
    })

    it('maps unknown 4xx to UNKNOWN', () => {
      expect(httpStatusToErrorCode(418)).toBe(ErrorCode.UNKNOWN)
    })
  })

  describe('resolveErrorMessage', () => {
    it('returns a message for every ErrorCode', () => {
      for (const code of Object.values(ErrorCode)) {
        const message = resolveErrorMessage(code)
        expect(message).toBeTruthy()
        expect(typeof message).toBe('string')
      }
    })

    it('returns specific messages for known codes', () => {
      expect(resolveErrorMessage(ErrorCode.NETWORK)).toContain('Network')
      expect(resolveErrorMessage(ErrorCode.UNAUTHORIZED)).toContain('Authentication')
      expect(resolveErrorMessage(ErrorCode.FORBIDDEN)).toContain('Access denied')
    })

    it('returns fallback for unknown code', () => {
      const message = resolveErrorMessage('FAKE_CODE' as ErrorCode)
      expect(message).toBeTruthy()
    })
  })
})
