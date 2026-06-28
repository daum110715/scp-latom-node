import { ErrorCode } from './errors'

export type ApiResult<T = unknown> =
  { ok: true; data: T } | { ok: false; code: ErrorCode; error: string }

/**
 * Normalize the backend's response shape into a discriminated union.
 * Success: { success: true, ...fields } → { ok: true, data: { ...fields } }
 * Error:   { success: false, error } → { ok: false, code, error }
 */
export function normalizeResponse<T>(json: Record<string, unknown>, status: number): ApiResult<T> {
  if (status >= 400 || json?.success === false) {
    return {
      ok: false,
      code: mapStatusToCode(status),
      error: json?.error || `HTTP ${status}`,
    }
  }

  // Strip the `success` flag and pass everything else as data
  const { success: _, ...data } = json
  return { ok: true, data: data as T }
}

export function networkError(message?: string): ApiResult<never> {
  return {
    ok: false,
    code: ErrorCode.NETWORK,
    error: message || 'Network error',
  }
}

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 401:
      return ErrorCode.UNAUTHORIZED
    case 403:
      return ErrorCode.FORBIDDEN
    case 404:
      return ErrorCode.NOT_FOUND
    case 409:
      return ErrorCode.CONFLICT
    case 429:
      return ErrorCode.RATE_LIMITED
    default:
      return status >= 500 ? ErrorCode.SERVER : ErrorCode.UNKNOWN
  }
}
