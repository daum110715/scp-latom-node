/**
 * Error code enumeration for the SCP Foundation Admin Dashboard.
 *
 * Mirrors the main app's error codes so both surfaces share the same
 * vocabulary.  Codes follow the SCP-themed pattern:
 *   ERR-{http-status}-{LABEL}  or  ERR-{CATEGORY}-{DETAIL}.
 */

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

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK]: 'Network error. Check your connection.',
  [ErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCode.OFFLINE]: 'You appear to be offline.',
  [ErrorCode.BAD_REQUEST]: 'Invalid request.',
  [ErrorCode.UNAUTHORIZED]: 'Authentication required.',
  [ErrorCode.FORBIDDEN]: 'Access denied. Admin clearance required.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
  [ErrorCode.CONFLICT]: 'Resource conflict.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait.',
  [ErrorCode.SERVER_ERROR]: 'Server error. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
  [ErrorCode.AUTH_EXPIRED]: 'Session expired. Please log in again.',
  [ErrorCode.AUTH_INVALID]: 'Invalid credentials.',
  [ErrorCode.AUTH_REQUIRED]: 'Authentication required.',
  [ErrorCode.UNKNOWN]: 'An unknown error occurred.',
  [ErrorCode.RENDER_CRASH]: 'A rendering error occurred.',
  [ErrorCode.CHUNK_FAILED]: 'Failed to load application resources.',
}

/** Map HTTP status codes to ErrorCode. */
export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST
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
    case 500:
      return ErrorCode.SERVER_ERROR
    case 502:
    case 503:
    case 504:
      return ErrorCode.SERVICE_UNAVAILABLE
    default:
      return status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.UNKNOWN
  }
}

export function resolveErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ErrorCode.UNKNOWN]
}
