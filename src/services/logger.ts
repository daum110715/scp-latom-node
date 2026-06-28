/**
 * Lightweight client-side logger with buffered server transmission.
 *
 * - debug/info → console only (development)
 * - warn/error → console + batched POST to /api/logs every 30s
 * - Flushes on page unload to avoid losing buffered logs
 * - Zero external dependencies
 */

import { API_URL } from './config'

// ─── Types ────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
  path?: string
}

// ─── Configuration ────────────────────────────────────────

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Default to 'warn' in production, 'debug' in development
const DEFAULT_LEVEL: LogLevel = import.meta.env.DEV ? 'debug' : 'warn'

const FLUSH_INTERVAL_MS = 30_000
const MAX_BUFFER_SIZE = 50

// ─── State ────────────────────────────────────────────────

let currentLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) ?? DEFAULT_LEVEL
let buffer: LogEntry[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let isFlushing = false

// ─── Public API ───────────────────────────────────────────

/**
 * Set the minimum log level. Messages below this level are discarded.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
  return currentLevel
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context)
  },

  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context)
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context)
  },

  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context)
  },

  /**
   * Manually flush buffered logs to the server.
   * Returns a promise that resolves when the flush completes.
   */
  async flush(): Promise<void> {
    await sendLogs()
  },
}

// ─── Internal ─────────────────────────────────────────────

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  // Console output — always for warn/error, level-filtered for debug/info
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.debug
  if (level === 'warn' || level === 'error' || shouldLog(level)) {
    if (context) {
      consoleFn(`[${level.toUpperCase()}] ${message}`, context)
    } else {
      consoleFn(`[${level.toUpperCase()}] ${message}`)
    }
  }

  if (!shouldLog(level)) return

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = sanitizeContext(context)
  }

  buffer.push(entry)

  // Flush immediately if buffer is full
  if (buffer.length >= MAX_BUFFER_SIZE) {
    sendLogs()
  }
}

/**
 * Sanitize context values — convert Error objects to plain objects,
 * truncate very long strings.
 */
function sanitizeContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (value instanceof Error) {
      result[key] = { name: value.name, message: value.message, stack: value.stack }
    } else if (typeof value === 'string' && value.length > 500) {
      result[key] = value.slice(0, 500) + '…'
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Send buffered logs to the server and clear the buffer.
 */
async function sendLogs(): Promise<void> {
  if (buffer.length === 0 || isFlushing) return

  isFlushing = true
  const batch = buffer.splice(0, MAX_BUFFER_SIZE)

  try {
    const token = localStorage.getItem('scp-auth-token')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ logs: batch }),
      // Use keepalive so the request survives page unload
      keepalive: true,
    })
  } catch {
    // Silently discard — don't re-add to buffer to avoid infinite growth
  } finally {
    isFlushing = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────

/**
 * Start the periodic flush timer. Call once at app init.
 */
export function startLogFlusher(): void {
  if (flushTimer) return
  flushTimer = setInterval(sendLogs, FLUSH_INTERVAL_MS)

  // Flush on page unload
  window.addEventListener('beforeunload', () => {
    if (buffer.length > 0) {
      // Use sendBeacon for reliable delivery during unload
      const token = localStorage.getItem('scp-auth-token')
      const blob = new Blob([JSON.stringify({ logs: buffer })], { type: 'application/json' })
      navigator.sendBeacon(`${API_URL}/logs`, blob)
      buffer = []
    }
  })
}

/**
 * Stop the periodic flush timer (for testing or cleanup).
 */
export function stopLogFlusher(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

/**
 * Clear the buffer without sending (for testing).
 */
export function clearLogBuffer(): void {
  buffer = []
}
