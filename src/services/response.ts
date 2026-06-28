/**
 * Unified API response handling layer.
 *
 * The backend returns success responses with data at the top level:
 *   { success: true, user: {...}, token: "..." }
 *
 * This module normalizes them into a consistent shape:
 *   { ok: true, data: { user, token } }
 *
 * Error responses are normalized to:
 *   { ok: false, code: ErrorCode, error: "translated message" }
 */
import { ErrorCode, httpStatusToErrorCode, resolveErrorMessage } from './errors'

export type { ErrorCode } from './errors'

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiFailure {
  ok: false
  code: ErrorCode
  error: string
}

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiFailure

/**
 * Normalize a raw backend JSON response into ApiResult.
 *
 * Handles two backend shapes:
 * - Success: { success: true, ...fields }  →  { ok: true, data: { ...fields } }
 * - Error:   { success: false, error: "…" } →  { ok: false, code, error }
 *
 * @param json  Parsed JSON body from the response
 * @param status  HTTP status code (used to derive the error code when json.error is absent)
 */
export function normalizeResponse<T>(json: Record<string, unknown>, status?: number): ApiResult<T> {
  if (json.success === true) {
    // Strip the success flag; everything else is the payload
    const { success: _, ...payload } = json
    return { ok: true, data: payload as T }
  }

  const code = status ? httpStatusToErrorCode(status) : ErrorCode.UNKNOWN
  const message = (json.error as string) || (json.message as string) || resolveErrorMessage(code)

  return { ok: false, code, error: message }
}

/** Create a network-level failure result (fetch threw, non-JSON response, etc.) */
export function networkError(message?: string, code: ErrorCode = ErrorCode.NETWORK): ApiFailure {
  return { ok: false, code, error: message || resolveErrorMessage(code) }
}
