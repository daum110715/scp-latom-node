import { describe, it, expect } from 'vitest'
import { normalizeResponse, networkError } from '../response'
import { ErrorCode } from '../errors'

describe('normalizeResponse', () => {
  it('normalizes a success response with data fields', () => {
    const result = normalizeResponse({ success: true, user: { id: 1 }, token: 'abc' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ user: { id: 1 }, token: 'abc' })
    }
  })

  it('strips the success flag from the payload', () => {
    const result = normalizeResponse({ success: true, name: 'test' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ name: 'test' })
      expect((result.data as any).success).toBeUndefined()
    }
  })

  it('normalizes an error response with error field', () => {
    const result = normalizeResponse({ success: false, error: 'Not found' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Not found')
    }
  })

  it('falls back to message field for errors', () => {
    const result = normalizeResponse({ success: false, message: 'Bad request' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Bad request')
    }
  })

  it('uses status-based error code when no error/message field present', () => {
    const result = normalizeResponse({ success: false }, 403)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(ErrorCode.FORBIDDEN)
      // resolveErrorMessage falls back to code string outside i18n context
      expect(result.error).toBe(ErrorCode.FORBIDDEN)
    }
  })

  it('uses UNKNOWN error code when no status or error field', () => {
    const result = normalizeResponse({ success: false })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(ErrorCode.UNKNOWN)
      expect(result.error).toBe(ErrorCode.UNKNOWN)
    }
  })

  it('handles success response with empty payload', () => {
    const result = normalizeResponse({ success: true })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({})
    }
  })

  it('maps various HTTP status codes to correct error codes', () => {
    const cases: [number, ErrorCode][] = [
      [400, ErrorCode.BAD_REQUEST],
      [401, ErrorCode.UNAUTHORIZED],
      [404, ErrorCode.NOT_FOUND],
      [409, ErrorCode.CONFLICT],
      [429, ErrorCode.RATE_LIMITED],
      [500, ErrorCode.SERVER_ERROR],
    ]
    for (const [status, expectedCode] of cases) {
      const result = normalizeResponse({ success: false }, status)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe(expectedCode)
      }
    }
  })
})

describe('networkError', () => {
  it('returns failure with provided message', () => {
    const result = networkError('Connection refused')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Connection refused')
      expect(result.code).toBe(ErrorCode.NETWORK)
    }
  })

  it('returns failure with error code when no message provided', () => {
    const result = networkError()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Falls back to code string outside i18n context
      expect(result.error).toBe(ErrorCode.NETWORK)
      expect(result.code).toBe(ErrorCode.NETWORK)
    }
  })

  it('returns failure with error code for empty string', () => {
    const result = networkError('')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(ErrorCode.NETWORK)
    }
  })
})
