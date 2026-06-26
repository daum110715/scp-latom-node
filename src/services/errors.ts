/**
 * Error code enumeration for the SCP Foundation Latom Node.
 *
 * Each code maps to an i18n translation key under the `errors` namespace.
 * Codes follow the SCP-themed pattern: ERR-{http-status}-{LABEL} or ERR-{CATEGORY}-{DETAIL}.
 */
import { useI18n } from 'vue-i18n'

export enum ErrorCode {
  // Network / transport
  NETWORK = 'ERR-NETWORK',
  TIMEOUT = 'ERR-TIMEOUT',
  OFFLINE = 'ERR-OFFLINE',

  // HTTP status errors
  BAD_REQUEST = 'ERR-400-REQUEST',
  UNAUTHORIZED = 'ERR-401-CLEARANCE',
  FORBIDDEN = 'ERR-403-ACCESS',
  NOT_FOUND = 'ERR-404-RESOURCE',
  CONFLICT = 'ERR-409-CONFLICT',
  RATE_LIMITED = 'ERR-429-THROTTLE',
  SERVER_ERROR = 'ERR-500-SYSTEM',
  SERVICE_UNAVAILABLE = 'ERR-503-MAINTENANCE',

  // Auth-specific
  AUTH_EXPIRED = 'ERR-AUTH-EXPIRED',
  AUTH_INVALID = 'ERR-AUTH-INVALID',
  AUTH_REQUIRED = 'ERR-AUTH-REQUIRED',

  // Application
  UNKNOWN = 'ERR-UNKNOWN',
  RENDER_CRASH = 'ERR-RENDER-FAULT',
  CHUNK_FAILED = 'ERR-CHUNK-LOAD',
}

/** Map HTTP status codes to ErrorCode. */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400: return ErrorCode.BAD_REQUEST
    case 401: return ErrorCode.UNAUTHORIZED
    case 403: return ErrorCode.FORBIDDEN
    case 404: return ErrorCode.NOT_FOUND
    case 409: return ErrorCode.CONFLICT
    case 429: return ErrorCode.RATE_LIMITED
    case 500: return ErrorCode.SERVER_ERROR
    case 502:
    case 503:
    case 504: return ErrorCode.SERVICE_UNAVAILABLE
    default: return status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.UNKNOWN
  }
}

/** Resolve an ErrorCode to its i18n-translated message. */
export function resolveErrorMessage(code: ErrorCode): string {
  const key = `errors.${code}`
  try {
    const { t } = useI18n()
    return t(key)
  } catch {
    // Fallback outside i18n context (e.g., in error handlers before app mount)
    return code
  }
}
