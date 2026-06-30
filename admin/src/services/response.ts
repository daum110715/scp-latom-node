import { ErrorCode, httpStatusToErrorCode } from './errors'

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
      code: httpStatusToErrorCode(status),
      error: (typeof json?.error === 'string' ? json.error : null) || `HTTP ${status}`,
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
