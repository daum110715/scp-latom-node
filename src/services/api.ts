import { type ApiResult, normalizeResponse, networkError } from './response'
import { API_URL } from './config'
import { logger } from './logger'

const TOKEN_KEY = 'scp-auth-token'

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // Auto-inject token from localStorage when not explicitly provided.
  // This removes the need for every caller to manually thread the token.
  const authToken = token ?? localStorage.getItem(TOKEN_KEY)
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const start = Date.now()

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const json = await res.json()
    const result = normalizeResponse<T>(json, res.status)
    const duration = Date.now() - start

    // Log slow requests and errors
    if (!result.ok) {
      if (res.status >= 500) {
        logger.error(`API ${method} ${path} → ${res.status}`, { status: res.status, error: result.error, duration })
      } else if (res.status >= 400) {
        logger.warn(`API ${method} ${path} → ${res.status}`, { status: res.status, error: result.error, duration })
      }
    } else if (duration > 3000) {
      logger.warn(`Slow API request: ${method} ${path}`, { duration })
    }

    // Propagate request ID from server if present
    const requestId = res.headers.get('X-Request-Id')
    if (requestId && !result.ok) {
      logger.debug('Server request ID for error correlation', { requestId, path })
    }

    return result
  } catch (e) {
    const duration = Date.now() - start
    logger.error(`API ${method} ${path} network error`, { error: e instanceof Error ? e.message : String(e), duration })
    return networkError(e instanceof Error ? e.message : undefined)
  }
}

export function apiGet<T = unknown>(path: string, token?: string) {
  return request<T>('GET', path, undefined, token)
}

export function apiPost<T = unknown>(path: string, body?: unknown, token?: string) {
  return request<T>('POST', path, body, token)
}

export function apiPut<T = unknown>(path: string, body?: unknown, token?: string) {
  return request<T>('PUT', path, body, token)
}

export function apiDelete<T = unknown>(path: string, token?: string) {
  return request<T>('DELETE', path, undefined, token)
}
