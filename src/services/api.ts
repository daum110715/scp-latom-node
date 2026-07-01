import { type ApiResult, normalizeResponse, networkError } from './response'
import { ErrorCode, httpStatusToErrorCode, resolveErrorMessage } from './errors'
import { API_URL } from './config'
import { logger } from './logger'

/** Build standard headers. Auth is handled via httpOnly cookie. */
function buildHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' }
}

/** Log a non-OK response using the same thresholds as `request`. */
function logResponse(
  method: string,
  path: string,
  status: number,
  error: string,
  duration: number,
  requestId: string | null,
): void {
  if (status >= 500) {
    logger.error(`API ${method} ${path} → ${status}`, { status, error, duration })
  } else if (status >= 400) {
    logger.warn(`API ${method} ${path} → ${status}`, { status, error, duration })
  }
  if (requestId) {
    logger.debug('Server request ID for error correlation', { requestId, path })
  }
}

export interface StreamSuccess {
  ok: true
  response: Response
}

export interface StreamFailure {
  ok: false
  error: string
  code: ErrorCode
}

export type StreamResult = StreamSuccess | StreamFailure

/**
 * Perform a fetch with unified auth, logging, and error handling — but return
 * the raw Response for streaming consumption instead of parsing JSON.
 */
async function requestStream(method: string, path: string, body?: unknown): Promise<StreamResult> {
  const headers = buildHeaders()
  const start = Date.now()

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    const duration = Date.now() - start
    const requestId = res.headers.get('X-Request-Id')

    if (!res.ok) {
      const code = httpStatusToErrorCode(res.status)
      const error = resolveErrorMessage(code)
      logResponse(method, path, res.status, error, duration, requestId)
      return { ok: false, error, code }
    }

    if (duration > 3000) {
      logger.warn(`Slow API request: ${method} ${path}`, { duration })
    }

    return { ok: true, response: res }
  } catch (e) {
    const duration = Date.now() - start
    logger.error(`API ${method} ${path} network error`, {
      error: e instanceof Error ? e.message : String(e),
      duration,
    })
    return {
      ok: false,
      error: e instanceof Error ? e.message : resolveErrorMessage(ErrorCode.NETWORK),
      code: ErrorCode.NETWORK,
    }
  }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers = buildHeaders()
  const start = Date.now()

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await res.json()
    const result = normalizeResponse<T>(json, res.status)
    const duration = Date.now() - start

    if (!result.ok) {
      logResponse(method, path, res.status, result.error, duration, res.headers.get('X-Request-Id'))
    } else if (duration > 3000) {
      logger.warn(`Slow API request: ${method} ${path}`, { duration })
    }

    return result
  } catch (e) {
    const duration = Date.now() - start
    logger.error(`API ${method} ${path} network error`, {
      error: e instanceof Error ? e.message : String(e),
      duration,
    })
    return networkError(e instanceof Error ? e.message : undefined)
  }
}

export function apiGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>('GET', path)
}

export function apiPost<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('POST', path, body)
}

export function apiPut<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>('PUT', path, body)
}

export function apiDelete<T = unknown>(path: string): Promise<ApiResult<T>> {
  return request<T>('DELETE', path)
}

/**
 * POST with streaming response. Returns the raw Response on success for
 * the caller to consume as a stream, or a normalized error on failure.
 */
export function apiStream(path: string, body?: unknown): Promise<StreamResult> {
  return requestStream('POST', path, body)
}
