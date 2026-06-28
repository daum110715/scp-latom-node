export enum ErrorCode {
  NETWORK = 'ERR-NETWORK',
  UNAUTHORIZED = 'ERR-401-CLEARANCE',
  FORBIDDEN = 'ERR-403-ACCESS',
  NOT_FOUND = 'ERR-404',
  CONFLICT = 'ERR-409',
  RATE_LIMITED = 'ERR-429',
  SERVER = 'ERR-500',
  UNKNOWN = 'ERR-UNKNOWN',
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK]: 'Network error. Check your connection.',
  [ErrorCode.UNAUTHORIZED]: 'Authentication required.',
  [ErrorCode.FORBIDDEN]: 'Access denied. Admin clearance required.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
  [ErrorCode.CONFLICT]: 'Resource conflict.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please wait.',
  [ErrorCode.SERVER]: 'Server error. Please try again later.',
  [ErrorCode.UNKNOWN]: 'An unknown error occurred.',
}

export function resolveErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES[ErrorCode.UNKNOWN]
}
